import { Request } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import type { AuditEventType } from '@prisma/client';
import prisma from '../../shared/db/prisma.js';

const EMAIL_HASH_KEY_ENV = 'EMAIL_HASH_KEY';

const getEmailHashKey = (): string => {
  const key = process.env[EMAIL_HASH_KEY_ENV];
  if (!key) {
    throw new Error(`${EMAIL_HASH_KEY_ENV} is not configured`);
  }
  return key;
};

const normalizeHeaderValue = (
  value: string | string[] | undefined
): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
};

/**
 * Generate a device fingerprint from request headers
 */
export const generateDeviceFingerprint = (req: Request): string => {
  const userAgent = normalizeHeaderValue(req.headers['user-agent']) ?? '';
  const acceptLanguage = normalizeHeaderValue(req.headers['accept-language']) ?? '';
  const acceptEncoding = normalizeHeaderValue(req.headers['accept-encoding']) ?? '';

  const components = [
    userAgent,
    acceptLanguage,
    acceptEncoding,
  ].join('|');

  return crypto.createHash('sha256').update(components).digest('hex').substring(0, 16);
};

// -- IP Validation -------------------------------------------------------------

const IP_V4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IP_V6_RE = /^[\da-fA-F:]{2,45}$/;

const isValidIP = (ip: string): boolean =>
  IP_V4_RE.test(ip) || (ip.includes(':') && IP_V6_RE.test(ip));

/**
 * Get client IP address from request.
 *
 * When a trusted proxy is in front of the app, callers expect the left-most
 * X-Forwarded-For hop. We only honor that header when Express exposes it as a
 * single string; array values are ignored and we fall back to req.ip.
 */
export const getClientIP = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() ?? '';
  }

  const raw = req.ip || req.socket.remoteAddress || 'unknown';
  if (raw === 'unknown') return raw;

  // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:127.0.0.1 → 127.0.0.1)
  const normalized = raw.startsWith('::ffff:') ? raw.slice(7) : raw;

  return isValidIP(normalized) ? normalized : 'unknown';
};

/**
 * Redact a phone number for safe logging — keeps only the last 4 digits.
 */
export const redactPhone = (phone: string): string => {
  if (phone.length <= 4) return '****';
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
};

/**
 * Redact a PAN number — shows only first 2 and last 1 characters.
 * e.g., "ABCDE1234F" → "AB*******F"
 */
export const redactPAN = (pan: string): string => {
  if (!pan || pan.length < 4) return '****';
  return pan.slice(0, 2) + '*'.repeat(pan.length - 3) + pan.slice(-1);
};

/**
 * Redact an Aadhaar number — shows only last 4 digits.
 * e.g., "123456789012" → "********9012"
 */
export const redactAadhaar = (aadhaar: string): string => {
  if (!aadhaar || aadhaar.length <= 4) return '****';
  return '*'.repeat(aadhaar.length - 4) + aadhaar.slice(-4);
};

const hashEmail = (email: string): string =>
  crypto
    .createHmac('sha256', getEmailHashKey())
    .update(email.trim().toLowerCase())
    .digest('hex');

// -- Severity Mapping ----------------------------------------------------------

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const HIGH_SEVERITY_EVENTS: string[] = [
  'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY',
  'LEAD_DELETED', 'PARTNER_SUSPENDED', 'ADMIN_ROLE_CHANGED',
  'ADMIN_USER_DELETED', 'DATA_DELETION_REQUEST', 'BULK_EXPORT',
  'DOCUMENT_DELETED',
];

const MEDIUM_SEVERITY_EVENTS: string[] = [
  'LOGIN_SUCCESS', 'LOGOUT', 'REGISTER',
  'PASSWORD_CHANGE', 'PASSWORD_RESET_SUCCESS', 'PASSWORD_RESET_REQUEST',
  'LEAD_STATUS_CHANGED', 'LEAD_ASSIGNED',
  'DOCUMENT_VERIFIED', 'DOCUMENT_REJECTED',
  'PARTNER_APPROVED', 'PARTNER_UPDATED', 'PARTNER_KYC_UPDATED',
  'COMMISSION_PAID', 'COMMISSION_RATE_CHANGED',
  'CONSENT_GIVEN', 'CONSENT_WITHDRAWN',
  'ADMIN_USER_CREATED', 'BANK_UPDATED', 'BANK_STATUS_CHANGED',
  'PII_ACCESS',
];

const getDefaultSeverity = (event: AuditEventType): AuditSeverity => {
  if (HIGH_SEVERITY_EVENTS.includes(event)) return 'HIGH';
  if (MEDIUM_SEVERITY_EVENTS.includes(event)) return 'MEDIUM';
  return 'LOW';
};

// -- Log Integrity Checksum ----------------------------------------------------

/**
 * Compute a SHA-256 checksum over the core log fields for per-row tamper detection.
 */
const computeChecksum = (
  event: string,
  userId: string | undefined,
  entityId: string | undefined,
  timestamp: Date
): string => {
  const payload = [
    event,
    userId ?? '',
    entityId ?? '',
    timestamp.toISOString(),
    'GENESIS',
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
};

// -- Audit Retry Queue & File Fallback -----------------------------------------

const FALLBACK_LOG_DIR = path.resolve(process.cwd(), 'logs');
const FALLBACK_LOG_FILE = path.join(FALLBACK_LOG_DIR, 'audit-fallback.jsonl');
const MAX_QUEUE_SIZE = 500;
const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 30_000; // 30 s

interface QueuedAuditEntry {
  data: Prisma.AuditLogUncheckedCreateInput;
  retries: number;
}

const retryQueue: QueuedAuditEntry[] = [];

const CRITICAL_EVENTS = new Set<string>([
  ...HIGH_SEVERITY_EVENTS,
]);

/**
 * Append a JSON-lines record to the fallback log file on disk.
 * Used when both the primary DB write and all retries have failed.
 */
const writeToFallbackLog = (data: Prisma.AuditLogUncheckedCreateInput): void => {
  try {
    if (!fs.existsSync(FALLBACK_LOG_DIR)) {
      fs.mkdirSync(FALLBACK_LOG_DIR, { recursive: true });
    }
    const line =
      JSON.stringify({ ...data, _fallbackTs: new Date().toISOString() }) + '\n';
    fs.appendFileSync(FALLBACK_LOG_FILE, line, 'utf-8');
  } catch (fileErr) {
    console.error('Audit fallback file write failed:', fileErr);
  }
};

/**
 * Add a failed audit entry to the in-memory retry queue.
 * If the queue is full, non-critical entries are evicted first.
 */
const enqueueForRetry = (data: Prisma.AuditLogUncheckedCreateInput): void => {
  if (retryQueue.length >= MAX_QUEUE_SIZE) {
    const dropIdx = retryQueue.findIndex(
      (e) => !CRITICAL_EVENTS.has(e.data.event)
    );
    if (dropIdx >= 0) {
      const dropped = retryQueue.splice(dropIdx, 1)[0];
      writeToFallbackLog(dropped.data);
    } else {
      const dropped = retryQueue.shift()!;
      writeToFallbackLog(dropped.data);
    }
  }
  retryQueue.push({ data, retries: 0 });
};

/**
 * Attempt to flush all queued audit entries back to the database.
 */
const flushRetryQueue = async (): Promise<void> => {
  if (retryQueue.length === 0) return;

  const batch = retryQueue.splice(0, retryQueue.length);
  const stillFailing: QueuedAuditEntry[] = [];

  for (const entry of batch) {
    try {
      await prisma.auditLog.create({ data: entry.data });
    } catch {
      entry.retries += 1;
      if (entry.retries < MAX_RETRIES) {
        stillFailing.push(entry);
      } else {
        writeToFallbackLog(entry.data);
      }
    }
  }

  retryQueue.unshift(...stillFailing);
};

const retryTimer = setInterval(() => {
  flushRetryQueue().catch((err) =>
    console.error('Audit retry flush error:', err)
  );
}, RETRY_INTERVAL_MS);
retryTimer.unref();

// -- Primary Audit Logger ------------------------------------------------------

export interface AuditLogOptions {
  userId?: string;
  email?: string;
  success?: boolean;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  entityId?: string;
  entityType?: string;
  severity?: AuditSeverity;
}

/**
 * Log an audit event with entity tracking, severity, and integrity checksum.
 */
export const logAuditEvent = async (
  event: AuditEventType,
  req: Request,
  options: AuditLogOptions = {}
): Promise<void> => {
  let data: Prisma.AuditLogUncheckedCreateInput | undefined;
  try {
    const hashedEmail = options.email ? hashEmail(options.email) : null;
    const userAgent = normalizeHeaderValue(req.headers['user-agent']);
    const now = new Date();
    const severity = options.severity ?? getDefaultSeverity(event);

    const checksum = computeChecksum(event, options.userId, options.entityId, now);

    data = {
      event,
      userId: options.userId,
      hashedEmail,
      ip: getClientIP(req),
      userAgent,
      deviceFingerprint: generateDeviceFingerprint(req),
      success: options.success ?? true,
      failureReason: options.failureReason,
      metadata: (options.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      entityId: options.entityId,
      entityType: options.entityType,
      severity,
      checksum,
      createdAt: now,
    };

    await prisma.auditLog.create({ data });
  } catch (error) {
    console.error('Audit logging error:', error);

    if (data) {
      if (CRITICAL_EVENTS.has(event)) {
        writeToFallbackLog(data);
      }
      enqueueForRetry(data);
    }
  }
};

/**
 * Check for suspicious activity patterns
 */
export const checkSuspiciousActivity = async (
  userId: string,
  currentFingerprint: string
): Promise<boolean> => {
  const recentLogins = await prisma.auditLog.findMany({
    where: {
      userId,
      event: 'LOGIN_SUCCESS',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Check if login is from a new device
  const knownFingerprints = new Set(recentLogins.map((log) => log.deviceFingerprint));
  const isNewDevice = !knownFingerprints.has(currentFingerprint) && knownFingerprints.size > 0;

  return isNewDevice;
};
