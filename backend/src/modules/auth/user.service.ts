import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { User } from '@prisma/client';
import prisma, { type ExtendedTransactionClient } from '../../shared/db/prisma.js';
import { getRedisClient, isRedisAvailable } from '../../shared/config/redis.js';
import {
  matchesMockOtp,
  type VerificationChannel,
} from './mockVerification.service.js';

const PASSWORD_HISTORY_LIMIT = 5;
const SESSION_LIMIT = 10;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 30 * 60 * 1000;
const RESET_TOKEN_MS = 10 * 60 * 1000;
const OTP_SECONDS = 5 * 60;

const USER_OTP_PREFIX = 'user_otp:';

export type VerifyUserOtpResult =
  | { status: 'verified' }
  | { status: 'invalid' }
  | { status: 'use_db' };

const hashOtp = (otp: string): string => crypto.createHash('sha256').update(otp).digest('hex');

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  candidatePassword: string,
  storedPassword: string | null
): Promise<boolean> => {
  if (!storedPassword) return false;
  return bcrypt.compare(candidatePassword, storedPassword);
};

/**
 * Standalone password-strength validator.
 * Mirrors the express-validator rules in validators.ts:
 *  - min 8 characters
 *  - at least one uppercase, one lowercase, one digit, one special character
 */
export const validatePassword = (password: string): boolean => {
  if (password.length < 8) return false;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password);
};

export const isLocked = (user: Pick<User, 'lockUntil'>): boolean => {
  return !!(user.lockUntil && user.lockUntil > new Date());
};

export const incrementLoginAttempts = async (
  userId: string,
  currentAttempts: number
): Promise<void> => {
  const updates: {
    failedLoginAttempts?: { increment: number };
    lockUntil?: Date | null;
  } = {
    failedLoginAttempts: { increment: 1 },
  };

  if (currentAttempts + 1 >= LOCKOUT_THRESHOLD) {
    updates.lockUntil = new Date(Date.now() + LOCKOUT_MS);
  }

  await prisma.user.update({
    where: { id: userId },
    data: updates,
  });
};

export const resetLoginAttempts = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockUntil: null,
    },
  });
};

export const generatePasswordResetToken = async (userId: string): Promise<string> => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await prisma.user.update({
    where: { id: userId },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_MS),
    },
  });

  return resetToken;
};

export const generateOTP = async (userId: string): Promise<string> => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashOtp(otp);
  const otpExpires = new Date(Date.now() + OTP_SECONDS * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      otpHash: hashedOtp,
      otpExpires,
    },
  });

  if (isRedisAvailable()) {
    try {
      const redis = await getRedisClient();
      await redis.set(
        `${USER_OTP_PREFIX}${userId}`,
        hashedOtp,
        'EX',
        OTP_SECONDS
      );
    } catch (error) {
      console.error('User OTP Redis SET error:', error);
    }
  }

  return otp;
};

/**
 * Verify an OTP for a registered user.
 * Checks Redis first (if available), then falls back to the DB columns.
 */
export const verifyUserOTP = async (
  userId: string,
  otp: string,
  channel?: VerificationChannel
): Promise<VerifyUserOtpResult> => {
  const hashedOtp = hashOtp(otp);

  if (isRedisAvailable()) {
    try {
      const redis = await getRedisClient();
      const stored = await redis.get(`${USER_OTP_PREFIX}${userId}`);
      if (!stored) return { status: 'invalid' };
      if (stored !== hashedOtp && !(channel && matchesMockOtp(channel, otp))) {
        return { status: 'invalid' };
      }
      await redis.del(`${USER_OTP_PREFIX}${userId}`);
      return { status: 'verified' };
    } catch (error) {
      console.error('User OTP Redis GET error:', error);
      return { status: 'use_db' };
    }
  }

  return { status: 'use_db' };
};

export const clearUserOTP = async (userId: string): Promise<void> => {
  if (!isRedisAvailable()) {
    return;
  }

  try {
    const redis = await getRedisClient();
    await redis.del(`${USER_OTP_PREFIX}${userId}`);
  } catch (error) {
    console.error('User OTP Redis DEL error:', error);
  }
};

export const isPasswordReused = async (
  userId: string,
  newPassword: string
): Promise<boolean> => {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { changedAt: 'desc' },
    take: PASSWORD_HISTORY_LIMIT,
  });

  for (const entry of history) {
    const isMatch = await bcrypt.compare(newPassword, entry.hash);
    if (isMatch) return true;
  }

  return false;
};

export const addToPasswordHistory = async (
  userId: string,
  hashedPassword: string
): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    await tx.passwordHistory.create({
      data: {
        userId,
        hash: hashedPassword,
      },
    });

    const allHistory = await tx.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'asc' },
    });

    if (allHistory.length > PASSWORD_HISTORY_LIMIT) {
      const toDelete = allHistory.slice(0, allHistory.length - PASSWORD_HISTORY_LIMIT);
      await tx.passwordHistory.deleteMany({
        where: { id: { in: toDelete.map((h) => h.id) } },
      });
    }
  });
};

export const addSession = async (
  userId: string,
  session: { deviceFingerprint: string; userAgent: string; ip: string },
  tx?: ExtendedTransactionClient
): Promise<void> => {
  const runSession = async (client: ExtendedTransactionClient) => {
    await client.activeSession.upsert({
      where: {
        userId_deviceFingerprint: {
          userId,
          deviceFingerprint: session.deviceFingerprint,
        },
      },
      create: {
        userId,
        deviceFingerprint: session.deviceFingerprint,
        userAgent: session.userAgent,
        ip: session.ip,
        lastActive: new Date(),
      },
      update: {
        userAgent: session.userAgent,
        ip: session.ip,
        lastActive: new Date(),
      },
    });

    const sessions = await client.activeSession.findMany({
      where: { userId },
      orderBy: { lastActive: 'desc' },
    });

    if (sessions.length > SESSION_LIMIT) {
      const toDelete = sessions.slice(SESSION_LIMIT).map((s) => s.id);
      await client.activeSession.deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  };

  if (tx) {
    await runSession(tx);
  } else {
    await prisma.$transaction(runSession);
  }
};

export const removeSession = async (
  userId: string,
  deviceFingerprint: string
): Promise<void> => {
  await prisma.activeSession.deleteMany({
    where: { userId, deviceFingerprint },
  });
};
