import { Request } from 'express';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import type { AuditEventType } from '@prisma/client';
import prisma from '../config/prisma.js';

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

/**
 * Get client IP address from request
 */
export const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
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
  try {
    const hashedEmail = options.email ? hashEmail(options.email) : null;
    const userAgent = normalizeHeaderValue(req.headers['user-agent']);
    const now = new Date();
    const severity = options.severity ?? getDefaultSeverity(event);

    const checksum = computeChecksum(event, options.userId, options.entityId, now);

    await prisma.auditLog.create({
      data: {
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
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit logging error:', error);
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
