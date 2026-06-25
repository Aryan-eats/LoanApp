import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import type { AuditEventType } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import prisma from '../../shared/db/prisma.js';
import { cacheWrap } from '../../shared/utils/cache.js';
import { logAuditEvent } from './auditLogger.js';

// -- Audit Logs --------------------------------------------------------------

const AUDIT_COUNTS_TTL_MS = 20_000;
const AUDIT_EXPORT_SYNC_LIMIT = 10_000;
const AUDIT_EXPORT_JOB_RETENTION_MS = 24 * 60 * 60 * 1000;
const AUDIT_EXPORT_BATCH_SIZE = 2_000;
const AUDIT_EXPORT_DIR = path.join(os.tmpdir(), 'loan-app-audit-exports');

type AuditCursor = { createdAt: Date; id: string };
type AuditExportFilters = {
  event?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};
type AuditCounts = {
  total: number;
  loginEvents: number;
  securityEvents: number;
  authEvents: number;
};
type AuditExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
type AuditExportJob = {
  id: string;
  status: AuditExportJobStatus;
  createdAt: number;
  updatedAt: number;
  filters: AuditExportFilters;
  rowCount: number;
  filePath?: string;
  fileName?: string;
  error?: string;
};

const localAuditCountsCache = new Map<string, { expiresAt: number; value: AuditCounts }>();
const auditExportJobs = new Map<string, AuditExportJob>();

const encodeAuditCursor = (createdAt: Date, id: string): string =>
  Buffer.from(`${createdAt.toISOString()}__${id}`).toString('base64url');

const decodeAuditCursor = (value: unknown): AuditCursor | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const [createdAtStr, id] = decoded.split('__');
    if (!createdAtStr || !id) return null;
    const createdAt = new Date(createdAtStr);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
};

const sanitizeQueryString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const getAuditFiltersFromQuery = (query: Request['query']): AuditExportFilters => ({
  event: sanitizeQueryString(query.event),
  userId: sanitizeQueryString(query.userId),
  dateFrom: sanitizeQueryString(query.dateFrom),
  dateTo: sanitizeQueryString(query.dateTo),
  search: sanitizeQueryString(query.search),
});

const buildAuditWhere = (filters: AuditExportFilters): Prisma.AuditLogWhereInput => {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.event) {
    where.event = filters.event as AuditEventType;
  }
  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) {
      const date = new Date(filters.dateFrom);
      if (!Number.isNaN(date.getTime())) {
        createdAtFilter.gte = date;
      }
    }
    if (filters.dateTo) {
      const date = new Date(filters.dateTo);
      if (!Number.isNaN(date.getTime())) {
        date.setHours(23, 59, 59, 999);
        createdAtFilter.lte = date;
      }
    }
    where.createdAt = createdAtFilter;
  }

  if (filters.search) {
    where.OR = [
      { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
      { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      { ip: { contains: filters.search } },
    ];
  }

  return where;
};

const withOlderThanCursor = (
  where: Prisma.AuditLogWhereInput,
  cursor: AuditCursor | null
): Prisma.AuditLogWhereInput => {
  if (!cursor) return where;
  return {
    AND: [
      where,
      {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          {
            AND: [
              { createdAt: cursor.createdAt },
              { id: { lt: cursor.id } },
            ],
          },
        ],
      },
    ],
  };
};

const withNewerThanCursor = (
  where: Prisma.AuditLogWhereInput,
  cursor: AuditCursor | null
): Prisma.AuditLogWhereInput => {
  if (!cursor) return where;
  return {
    AND: [
      where,
      {
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          {
            AND: [
              { createdAt: cursor.createdAt },
              { id: { gt: cursor.id } },
            ],
          },
        ],
      },
    ],
  };
};

const toAuditCountCacheKey = (filters: AuditExportFilters): string =>
  createHash('sha1').update(JSON.stringify(filters)).digest('hex');

const queryAuditCounts = async (where: Prisma.AuditLogWhereInput): Promise<AuditCounts> => {
  const [total, loginEvents, securityEvents, authEvents] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { ...where, event: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'] } } }),
    prisma.auditLog.count({ where: { ...where, event: { in: ['ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY'] } } }),
    prisma.auditLog.count({ where: { ...where, event: { in: ['REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS'] } } }),
  ]);
  return { total, loginEvents, securityEvents, authEvents };
};

const getCachedAuditCounts = async (where: Prisma.AuditLogWhereInput, filters: AuditExportFilters): Promise<AuditCounts> => {
  const cacheKey = toAuditCountCacheKey(filters);
  const existing = localAuditCountsCache.get(cacheKey);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.value;
  }

  const counts = await cacheWrap(
    `admin:audit-counts:${cacheKey}`,
    () => queryAuditCounts(where),
    Math.ceil(AUDIT_COUNTS_TTL_MS / 1000)
  );

  localAuditCountsCache.set(cacheKey, { value: counts, expiresAt: Date.now() + AUDIT_COUNTS_TTL_MS });
  return counts;
};

const formatAuditLog = (log: {
  id: string;
  event: AuditEventType;
  user: { firstName: string; lastName: string; role: string } | null;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  metadata: Prisma.JsonValue;
  entityId: string | null;
  entityType: string | null;
  severity: string;
  createdAt: Date;
}) => ({
  id: log.id,
  event: log.event,
  userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
  userRole: log.user?.role || 'unknown',
  ip: log.ip,
  userAgent: log.userAgent,
  success: log.success,
  failureReason: log.failureReason,
  metadata: log.metadata,
  entityId: log.entityId || null,
  entityType: log.entityType || null,
  severity: log.severity || 'LOW',
  createdAt: log.createdAt.toISOString(),
});

const escCsv = (value: string): string => `"${(value || '').replace(/"/g, '""')}"`;

const toCsvRows = (logs: Array<{
  createdAt: Date;
  user: { firstName: string; lastName: string; role: string } | null;
  event: AuditEventType;
  success: boolean;
  ip: string | null;
  entityType: string | null;
  entityId: string | null;
  severity: string;
  metadata: Prisma.JsonValue;
  failureReason: string | null;
}>): string[] => logs.map((log) => [
  escCsv(log.createdAt.toISOString()),
  escCsv(log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'),
  escCsv(log.user?.role || 'unknown'),
  escCsv(log.event),
  escCsv(log.success ? 'Success' : 'Failed'),
  escCsv(log.ip || ''),
  escCsv(log.entityType || ''),
  escCsv(log.entityId || ''),
  escCsv(log.severity || 'LOW'),
  escCsv(JSON.stringify(log.metadata || log.failureReason || '')),
].join(','));

const cleanupOldExportJobs = async (): Promise<void> => {
  const now = Date.now();
  const toDelete: AuditExportJob[] = [];

  for (const job of auditExportJobs.values()) {
    if (now - job.createdAt > AUDIT_EXPORT_JOB_RETENTION_MS) {
      toDelete.push(job);
      auditExportJobs.delete(job.id);
    }
  }

  await Promise.all(toDelete.map(async (job) => {
    if (job.filePath) {
      try {
        await fs.unlink(job.filePath);
      } catch {
        // Ignore file cleanup errors.
      }
    }
  }));
};

const buildAuditExportFile = async (where: Prisma.AuditLogWhereInput, filePath: string): Promise<number> => {
  await fs.mkdir(AUDIT_EXPORT_DIR, { recursive: true });
  await fs.writeFile(filePath, 'Timestamp,User,Role,Event,Status,IP,EntityType,EntityId,Severity,Details\n', 'utf8');

  let totalRows = 0;
  let batchCursor: AuditCursor | null = null;

  while (true) {
    const queryWhere = withOlderThanCursor(where, batchCursor);
    const batch = await prisma.auditLog.findMany({
      where: queryWhere,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: AUDIT_EXPORT_BATCH_SIZE,
    });

    if (batch.length === 0) break;

    const rows = toCsvRows(batch);
    await fs.appendFile(filePath, `${rows.join('\n')}\n`, 'utf8');
    totalRows += batch.length;

    const last = batch[batch.length - 1];
    batchCursor = { createdAt: last.createdAt, id: last.id };
  }

  return totalRows;
};

const startAuditExportJob = (filters: AuditExportFilters): AuditExportJob => {
  const id = randomUUID();
  const fileName = `audit-logs-${Date.now()}-${id.slice(0, 8)}.csv`;
  const filePath = path.join(AUDIT_EXPORT_DIR, fileName);
  const job: AuditExportJob = {
    id,
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    filters,
    rowCount: 0,
    fileName,
    filePath,
  };
  auditExportJobs.set(id, job);

  setImmediate(async () => {
    try {
      job.status = 'processing';
      job.updatedAt = Date.now();

      const where = buildAuditWhere(filters);
      job.rowCount = await buildAuditExportFile(where, filePath);
      job.status = 'completed';
      job.updatedAt = Date.now();
    } catch (error) {
      console.error('Audit export job failed:', error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown export error';
      job.updatedAt = Date.now();
    }
  });

  return job;
};

export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = getAuditFiltersFromQuery(req.query);
    const baseWhere = buildAuditWhere(filters);
    const countsPromise = getCachedAuditCounts(baseWhere, filters);

    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const sinceCursor = decodeAuditCursor(req.query.since);
    const pageCursor = decodeAuditCursor(req.query.cursor);
    if ((req.query.since && !sinceCursor) || (req.query.cursor && !pageCursor)) {
      res.status(400).json({ success: false, message: 'Invalid cursor format' });
      return;
    }

    if (sinceCursor) {
      const where = withNewerThanCursor(baseWhere, sinceCursor);
      const logs = await prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, role: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: limit,
      });

      const formattedLogs = logs.map(formatAuditLog);
      const counts = await countsPromise;
      const latest = logs[logs.length - 1];
      const latestCursor = latest ? encodeAuditCursor(latest.createdAt, latest.id) : req.query.since;

      res.status(200).json({
        success: true,
        count: formattedLogs.length,
        data: {
          logs: formattedLogs,
          pagination: {
            limit,
            total: counts.total,
            hasMore: false,
            nextCursor: null,
            currentCursor: null,
          },
          counts,
          mode: 'incremental',
          latestCursor,
        },
      });
      return;
    }

    const where = withOlderThanCursor(baseWhere, pageCursor);
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const counts = await countsPromise;

    const hasMore = logs.length > limit;
    const pageLogs = hasMore ? logs.slice(0, limit) : logs;
    const last = pageLogs[pageLogs.length - 1];
    const nextCursor = hasMore && last ? encodeAuditCursor(last.createdAt, last.id) : null;
    const latestCursor = pageLogs.length > 0 ? encodeAuditCursor(pageLogs[0].createdAt, pageLogs[0].id) : null;

    res.status(200).json({
      success: true,
      count: pageLogs.length,
      data: {
        logs: pageLogs.map(formatAuditLog),
        pagination: {
          limit,
          total: counts.total,
          hasMore,
          nextCursor,
          currentCursor: req.query.cursor ?? null,
        },
        counts,
        latestCursor,
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const exportAuditLogsCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = getAuditFiltersFromQuery(req.query);
    const where = buildAuditWhere(filters);
    const total = await prisma.auditLog.count({ where });

    await logAuditEvent('BULK_EXPORT', req, {
      userId: req.user?.id,
      severity: 'HIGH',
      metadata: { format: 'csv', filters: req.query, mode: total > AUDIT_EXPORT_SYNC_LIMIT ? 'async' : 'direct' },
    });

    if (total > AUDIT_EXPORT_SYNC_LIMIT) {
      await cleanupOldExportJobs();
      const job = startAuditExportJob(filters);
      res.status(202).json({
        success: true,
        message: 'Large export queued. Poll job status for completion.',
        data: {
          mode: 'async',
          jobId: job.id,
          status: job.status,
          rowCount: total,
        },
      });
      return;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: AUDIT_EXPORT_SYNC_LIMIT,
    });

    const csv = [
      'Timestamp,User,Role,Event,Status,IP,EntityType,EntityId,Severity,Details',
      ...toCsvRows(logs),
    ].join('\n');

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createAuditLogsExportJob = async (req: Request, res: Response): Promise<void> => {
  try {
    await cleanupOldExportJobs();
    const filters = getAuditFiltersFromQuery(req.body || {});

    await logAuditEvent('BULK_EXPORT', req, {
      userId: req.user?.id,
      severity: 'HIGH',
      metadata: { format: 'csv', filters, mode: 'async-job' },
    });

    const job = startAuditExportJob(filters);

    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
      },
    });
  } catch (error) {
    console.error('Create audit export job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAuditLogsExportJob = async (req: Request, res: Response): Promise<void> => {
  try {
    await cleanupOldExportJobs();
    const jobId = String(req.params.jobId);
    const job = auditExportJobs.get(jobId);

    if (!job) {
      res.status(404).json({ success: false, message: 'Export job not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        rowCount: job.rowCount,
        error: job.error || null,
      },
    });
  } catch (error) {
    console.error('Get audit export job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const downloadAuditLogsExportJob = async (req: Request, res: Response): Promise<void> => {
  try {
    await cleanupOldExportJobs();
    const jobId = String(req.params.jobId);
    const job = auditExportJobs.get(jobId);

    if (!job) {
      res.status(404).json({ success: false, message: 'Export job not found' });
      return;
    }
    if (job.status !== 'completed' || !job.filePath || !job.fileName) {
      res.status(409).json({ success: false, message: 'Export file is not ready yet' });
      return;
    }

    try {
      await fs.access(job.filePath);
    } catch {
      res.status(404).json({ success: false, message: 'Export artifact is no longer available' });
      return;
    }

    res.download(job.filePath, job.fileName);
  } catch (error) {
    console.error('Download audit export job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

