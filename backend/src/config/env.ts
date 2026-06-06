/**
 * Environment bootstrap.
 *
 * This module is imported by prisma.ts (and potentially other config modules)
 * to guarantee that dotenv is loaded before any database/redis connections are
 * initialised. Node ESM evaluates imports before the calling module's body, so
 * index.ts's own `dotenv.config()` call runs too late for prisma.ts.
 *
 * Import side-effect:  import { envConfig } from './env.js';
 */

import dotenv from 'dotenv';

dotenv.config();

const require_ = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Check your .env file or deployment configuration.'
    );
  }
  return value;
};

export const envConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  // Database
  DATABASE_URL: require_('DATABASE_URL'),

  // JWT
  JWT_SECRET: require_('JWT_SECRET'),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? '',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Redis (optional in dev)
  REDIS_URL: process.env.REDIS_URL ?? '',

  // Encryption (AES-256-GCM)
  FIELD_ENCRYPTION_KEY: require_('FIELD_ENCRYPTION_KEY'),

  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:5173',
} as const;
