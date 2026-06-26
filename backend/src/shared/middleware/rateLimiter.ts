import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, isRedisAvailable } from '../config/redis.js';
import { buildBorrowerHash } from '../../modules/soft-check/softCheckIntegrity.js';

const isDev = process.env.NODE_ENV !== 'production';
const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const apiRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX) || (isDev ? 500 : 100);

const isLocalDevRequest = (req: Request): boolean => {
  if (!isDev) return false;

  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0]?.trim()
    : Array.isArray(forwardedFor)
      ? forwardedFor[0]?.trim()
      : null;

  const ip = forwardedIp || req.ip || req.socket.remoteAddress || '';
  const hostname = req.hostname?.toLowerCase() || '';

  return LOOPBACK_IPS.has(ip) || hostname === 'localhost';
};

/**
 * Build a RedisStore for express-rate-limit when Redis is available.
 * Returns `undefined` to fall back to the default in-memory store.
 */
const buildStore = (prefix: string) => {
  if (!isRedisAvailable()) return undefined;

  return new RedisStore({
    // @ts-expect-error - ioredis sendCommand is compatible
    sendCommand: async (...args: string[]) => {
      if (!isRedisAvailable()) throw new Error('Redis unavailable');
      const redis = await getRedisClient();
      // Must call on the instance directly to preserve `this` context;
      // extracting redis.call into a variable loses the binding and causes
      // "Cannot read properties of undefined (reading 'options')" in ioredis.
      return redis.call(...(args as [string, ...string[]]));
    },
    prefix: `rl:${prefix}:`,
  });
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: apiRateLimitMax,
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('api'),
});

// Rate limiter for login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 10,
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: isLocalDevRequest,
  store: buildStore('login'),
});

// Rate limiter for registration
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 50 : 5,
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('register'),
});

// Rate limiter for password reset requests
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many password reset requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('pwd_reset'),
});

// Rate limiter for token refresh (generous - active sessions refresh frequently)
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 30,
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many refresh requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: buildStore('refresh'),
});

// Rate limiter for OTP requests
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('otp'),
});

const softCheckBorrowerKey = (req: Request): string => {
  const partnerOrgId = req.partnerOrgId ?? 'unknown-partner';
  const borrowerIdentifier = String(req.body?.phone ?? req.body?.storedClientId ?? req.body?.leadId ?? req.ip ?? 'unknown');
  return buildBorrowerHash(partnerOrgId, borrowerIdentifier);
};

export const buildSoftCheckRateLimitKey = (req: Request): string =>
  `soft-check:${req.partnerOrgId ?? 'unknown'}:${softCheckBorrowerKey(req)}`;

export const softCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.SOFT_CHECK_RATE_LIMIT_MAX) || (isDev ? 100 : 20),
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many soft-check requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildSoftCheckRateLimitKey,
  store: buildStore('soft_check'),
});
