/**
 * OTP challenge flow for phone-based verification during onboarding.
 *
 * Uses Redis when available (ephemeral data with TTL), falling back
 * to PostgreSQL via Prisma for environments without Redis.
 */

import crypto from 'crypto';
import prisma from '../../shared/db/prisma.js';
import { getRedisClient, isRedisAvailable } from '../../shared/config/redis.js';
import { matchesMockOtp } from './mockVerification.service.js';

const OTP_TTL_SECONDS = 5 * 60; // 5 minutes
const VERIFICATION_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes

const PREFIX_OTP = 'otp_challenge:';
const PREFIX_VTOKEN = 'otp_vtoken:';
const PREFIX_ATTEMPTS = 'otp_attempts:';

const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(otp).digest('hex');

/** Constant-time string comparison to prevent timing side-channels. */
const timingSafeCompare = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

// --- Redis implementation ----------------------------------

const redisCreateOtp = async (phone: string): Promise<string> => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otp);
  const redis = await getRedisClient();

  // Store hashed OTP with TTL; also clear any stale verification token
  await redis.set(`${PREFIX_OTP}${phone}`, otpHash, 'EX', OTP_TTL_SECONDS);
  await redis.del(`${PREFIX_VTOKEN}${phone}`);

  return otp;
};

const redisVerifyOtp = async (
  phone: string,
  otp: string
): Promise<{ success: boolean; token?: string; reason?: string }> => {
  const redis = await getRedisClient();
  const attemptsKey = `${PREFIX_ATTEMPTS}${phone}`;

  // Check brute-force lockout
  const attempts = await redis.get(attemptsKey);
  if (attempts !== null && parseInt(attempts, 10) >= MAX_FAILED_ATTEMPTS) {
    return { success: false, reason: 'locked' };
  }

  const stored = await redis.get(`${PREFIX_OTP}${phone}`);

  if (!stored) return { success: false, reason: 'expired' };

  if (!matchesMockOtp('phone', otp) && !timingSafeCompare(hashOtp(otp), stored)) {
    // Increment failed attempts
    const newAttempts = await redis.incr(attemptsKey);
    if (newAttempts === 1) {
      await redis.expire(attemptsKey, LOCKOUT_SECONDS);
    }
    return { success: false, reason: 'invalid' };
  }

  // OTP matched — remove it and create a verification token; reset attempts
  const verificationToken = crypto.randomBytes(32).toString('hex');
  await redis.del(`${PREFIX_OTP}${phone}`);
  await redis.del(attemptsKey);
  await redis.set(
    `${PREFIX_VTOKEN}${phone}`,
    verificationToken,
    'EX',
    VERIFICATION_TOKEN_TTL_SECONDS
  );

  return { success: true, token: verificationToken };
};

const redisConsumeToken = async (phone: string, token: string): Promise<boolean> => {
  const redis = await getRedisClient();
  const stored = await redis.get(`${PREFIX_VTOKEN}${phone}`);
  if (!stored || !timingSafeCompare(stored, token)) return false;

  await redis.del(`${PREFIX_VTOKEN}${phone}`);
  return true;
};

// --- Prisma (DB) implementation ----------------------------

const dbCreateOtp = async (phone: string): Promise<string> => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.otpChallenge.upsert({
    where: { phone },
    update: {
      otpHash,
      otpExpiresAt: expiresAt,
      verificationToken: null,
      verificationTokenExpires: null,
      verifiedAt: null,
    },
    create: { phone, otpHash, otpExpiresAt: expiresAt },
  });

  return otp;
};

const dbVerifyOtp = async (
  phone: string,
  otp: string
): Promise<{ success: boolean; token?: string; reason?: string }> => {
  const challenge = await prisma.otpChallenge.findUnique({ where: { phone } });
  if (!challenge) return { success: false, reason: 'expired' };

  // Check brute-force lockout
  if (challenge.lockedUntil && challenge.lockedUntil > new Date()) {
    return { success: false, reason: 'locked' };
  }

  if (!challenge.otpHash || challenge.otpExpiresAt < new Date()) {
    return { success: false, reason: 'expired' };
  }

  if (!matchesMockOtp('phone', otp) && !timingSafeCompare(hashOtp(otp), challenge.otpHash)) {
    // Increment failed attempts; lock on threshold
    const newAttempts = challenge.failedAttempts + 1;
    await prisma.otpChallenge.update({
      where: { phone },
      data: {
        failedAttempts: newAttempts,
        ...(newAttempts >= MAX_FAILED_ATTEMPTS
          ? { lockedUntil: new Date(Date.now() + LOCKOUT_SECONDS * 1000) }
          : {}),
      },
    });
    return { success: false, reason: 'invalid' };
  }

  // Success — clear otpHash (replay prevention), reset attempts
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_SECONDS * 1000
  );

  await prisma.otpChallenge.update({
    where: { phone },
    data: {
      otpHash: null,
      verifiedAt: new Date(),
      verificationToken,
      verificationTokenExpires,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  return { success: true, token: verificationToken };
};

const dbConsumeToken = async (phone: string, token: string): Promise<boolean> => {
  const challenge = await prisma.otpChallenge.findUnique({ where: { phone } });
  if (
    !challenge ||
    !challenge.verificationToken ||
    !challenge.verificationTokenExpires
  )
    return false;
  if (!timingSafeCompare(challenge.verificationToken, token)) return false;
  if (challenge.verificationTokenExpires < new Date()) return false;

  await prisma.otpChallenge.update({
    where: { phone },
    data: { verificationToken: null, verificationTokenExpires: null },
  });

  return true;
};

// --- Exported façade (auto-selects backend) ----------------

export const createOtpChallenge = (phone: string) =>
  isRedisAvailable() ? redisCreateOtp(phone) : dbCreateOtp(phone);

export const verifyOtpChallenge = (phone: string, otp: string) =>
  isRedisAvailable() ? redisVerifyOtp(phone, otp) : dbVerifyOtp(phone, otp);

export const consumeVerificationToken = (phone: string, token: string) =>
  isRedisAvailable() ? redisConsumeToken(phone, token) : dbConsumeToken(phone, token);
