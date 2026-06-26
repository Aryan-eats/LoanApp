/**
 * Shared JWT configuration validator
 *
 * Validates JWT configuration on startup.
 */

const WEAK_SECRETS = [
  'your-super-secret',
  'change-this',
  'secret',
  'jwt-secret',
  'password',
  '123456',
];

export const validateJWTConfig = (): void => {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (secret.length < 32) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    console.warn('WARNING: JWT_SECRET should be at least 32 characters');
  }

  const lowerSecret = secret.toLowerCase();
  for (const weak of WEAK_SECRETS) {
    if (lowerSecret.includes(weak)) {
      if (isProduction) {
        throw new Error(`JWT_SECRET contains weak pattern "${weak}" - change it immediately!`);
      }
      console.warn(`WARNING: JWT_SECRET contains weak pattern "${weak}"`);
    }
  }

  const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const validExpiryPattern = /^\s*(\d+)\s*(ms|s|m|h|d|w|y)\s*$/;

  if (!validExpiryPattern.test(accessExpiresIn)) {
    if (isProduction) {
      throw new Error(`JWT_ACCESS_EXPIRES_IN "${accessExpiresIn}" is not a valid expiry format (expected e.g. 15m, 1h, 7d)`);
    }
    console.warn(`WARNING: JWT_ACCESS_EXPIRES_IN "${accessExpiresIn}" may not be valid`);
  }

  if (!validExpiryPattern.test(refreshExpiresIn)) {
    if (isProduction) {
      throw new Error(`JWT_REFRESH_EXPIRES_IN "${refreshExpiresIn}" is not a valid expiry format (expected e.g. 15m, 1h, 7d)`);
    }
    console.warn(`WARNING: JWT_REFRESH_EXPIRES_IN "${refreshExpiresIn}" may not be valid`);
  }

  if (refreshSecret && refreshSecret.length < 32) {
    if (isProduction) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
    }
    console.warn('WARNING: JWT_REFRESH_SECRET should be at least 32 characters');
  }

  if (refreshSecret) {
    const lowerRefreshSecret = refreshSecret.toLowerCase();
    for (const weak of WEAK_SECRETS) {
      if (lowerRefreshSecret.includes(weak)) {
        if (isProduction) {
          throw new Error(`JWT_REFRESH_SECRET contains weak pattern "${weak}" - change it immediately!`);
        }
        console.warn(`WARNING: JWT_REFRESH_SECRET contains weak pattern "${weak}"`);
      }
    }
  }

  console.log('JWT configuration validated');
};

export const generateSecureSecret = (): string => {
  return crypto.randomBytes(64).toString('hex');
};
import crypto from 'node:crypto';
