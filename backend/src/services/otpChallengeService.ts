/**
 * OTP challenge flow for phone-based verification during onboarding.
 *
 * Uses Redis when available (ephemeral data with TTL), falling back
 * to PostgreSQL via Prisma for environments without Redis.
 */

import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { getRedisClient, isRedisAvailable } from '../config/redis.js';

const OTP_TTL_SECONDS = 5 * 60; // 5 minutes
const VERIFICATION_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

const PREFIX_OTP = 'otp_challenge:';
const PREFIX_VTOKEN = 'otp_vtoken:';

const hashOtp = (otp: string): string =>
  crypto.createHash('sha256').update(otp).digest('hex');

// ─── Redis implementation ──────────────────────────────────

const redisCreateOtp = async (phone: string): Promise<string> => {
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = hashOtp(otp);
  const redis = getRedisClient();

  // Store hashed OTP with TTL; also clear any stale verification token
  await redis.set(`${PREFIX_OTP}${phone}`, otpHash, 'EX', OTP_TTL_SECONDS);
  await redis.del(`${PREFIX_VTOKEN}${phone}`);

  return otp;
};

const redisVerifyOtp = async (
  phone: string,
  otp: string
): Promise<{ success: boolean; token?: string; reason?: string }> => {
  const redis = getRedisClient();
  const stored = await redis.get(`${PREFIX_OTP}${phone}`);

  if (!stored) return { success: false, reason: 'expired' };
  if (hashOtp(otp) !== stored) return { success: false, reason: 'invalid' };

  // OTP matched – remove it and create a verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  await redis.del(`${PREFIX_OTP}${phone}`);
  await redis.set(
    `${PREFIX_VTOKEN}${phone}`,
    verificationToken,
    'EX',
    VERIFICATION_TOKEN_TTL_SECONDS
  );

  return { success: true, token: verificationToken };
};

const redisConsumeToken = async (phone: string, token: string): Promise<boolean> => {
  const redis = getRedisClient();
  const stored = await redis.get(`${PREFIX_VTOKEN}${phone}`);
  if (!stored || stored !== token) return false;

  await redis.del(`${PREFIX_VTOKEN}${phone}`);
  return true;
};

// ─── Prisma (DB) implementation ────────────────────────────

const dbCreateOtp = async (phone: string): Promise<string> => {
  const otp = crypto.randomInt(100000, 999999).toString();
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
  if (!challenge || challenge.otpExpiresAt < new Date()) {
    return { success: false, reason: 'expired' };
  }

  if (hashOtp(otp) !== challenge.otpHash) {
    return { success: false, reason: 'invalid' };
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = new Date(
    Date.now() + VERIFICATION_TOKEN_TTL_SECONDS * 1000
  );

  await prisma.otpChallenge.update({
    where: { phone },
    data: { verifiedAt: new Date(), verificationToken, verificationTokenExpires },
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
  if (challenge.verificationToken !== token) return false;
  if (challenge.verificationTokenExpires < new Date()) return false;

  await prisma.otpChallenge.update({
    where: { phone },
    data: { verificationToken: null, verificationTokenExpires: null },
  });

  return true;
};

// ─── Exported façade (auto-selects backend) ────────────────

export const createOtpChallenge = (phone: string) =>
  isRedisAvailable() ? redisCreateOtp(phone) : dbCreateOtp(phone);

export const verifyOtpChallenge = (phone: string, otp: string) =>
  isRedisAvailable() ? redisVerifyOtp(phone, otp) : dbVerifyOtp(phone, otp);

export const consumeVerificationToken = (phone: string, token: string) =>
  isRedisAvailable() ? redisConsumeToken(phone, token) : dbConsumeToken(phone, token);
