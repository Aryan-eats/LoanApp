/**
 * JWT Configuration Validator
 * 
 * Validates JWT secret strength and configuration on startup.
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
  const isProduction = process.env.NODE_ENV === 'production';

  // Check if secret exists
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  // Check minimum length
  if (secret.length < 32) {
    if (isProduction) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    console.warn('⚠️ WARNING: JWT_SECRET should be at least 32 characters');
  }

  // Check for common weak secrets
  const lowerSecret = secret.toLowerCase();
  for (const weak of WEAK_SECRETS) {
    if (lowerSecret.includes(weak)) {
      if (isProduction) {
        throw new Error(`JWT_SECRET contains weak pattern "${weak}" - change it immediately!`);
      }
      console.warn(`⚠️ WARNING: JWT_SECRET contains weak pattern "${weak}"`);
    }
  }

  // Validate JWT_EXPIRES_IN format
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
  const validExpiryPattern = /^(\d+)(s|m|h|d)$/;
  if (!validExpiryPattern.test(expiresIn)) {
    console.warn(`⚠️ WARNING: JWT_EXPIRES_IN "${expiresIn}" may not be valid`);
  }

  // Warn about long expiry times in production
  const expiryMatch = expiresIn.match(/^(\d+)(d)$/);
  if (expiryMatch && isProduction) {
    const days = parseInt(expiryMatch[1]);
    if (days > 1) {
      console.warn(`⚠️ WARNING: JWT expiry of ${days} days is long for production`);
    }
  }

  console.log('✅ JWT configuration validated');
};

/**
 * Generate a secure random JWT secret (for setup assistance)
 */
export const generateSecureSecret = (): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(64).toString('hex');
};
