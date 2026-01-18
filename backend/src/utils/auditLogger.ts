import { Request } from 'express';
import crypto from 'crypto';
import AuditLog, { AuditEventType } from '../models/AuditLog.js';

/**
 * Generate a device fingerprint from request headers
 */
export const generateDeviceFingerprint = (req: Request): string => {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
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
 * Log an audit event
 */
export const logAuditEvent = async (
  event: AuditEventType,
  req: Request,
  options: {
    userId?: string;
    email?: string;
    success?: boolean;
    failureReason?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> => {
  try {
    await AuditLog.create({
      event,
      userId: options.userId,
      email: options.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      deviceFingerprint: generateDeviceFingerprint(req),
      success: options.success ?? true,
      failureReason: options.failureReason,
      metadata: options.metadata,
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
  const recentLogins = await AuditLog.find({
    userId,
    event: 'LOGIN_SUCCESS',
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .limit(5);

  // Check if login is from a new device
  const knownFingerprints = new Set(recentLogins.map((log) => log.deviceFingerprint));
  const isNewDevice = !knownFingerprints.has(currentFingerprint) && knownFingerprints.size > 0;

  return isNewDevice;
};
