import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, isRedisAvailable } from '../config/redis.js';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Build a RedisStore for express-rate-limit when Redis is available.
 * Returns `undefined` to fall back to the default in-memory store.
 */
const buildStore = (prefix: string) => {
  if (!isRedisAvailable()) return undefined;

  return new RedisStore({
    // @ts-expect-error - ioredis sendCommand is compatible
    sendCommand: async (...args: string[]) => {
      const redis = await getRedisClient();
      const call = redis.call as (...redisArgs: string[]) => Promise<unknown>;
      return call(...args);
    },
    prefix: `rl:${prefix}:`,
  });
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 100,
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
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: buildStore('login'),
});

// Rate limiter for registration
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 50 : 5,
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
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('otp'),
});
