import crypto from 'crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { User } from '@prisma/client';

// -- Response formatting -----------------------------------------------------

type SensitiveUserFields =
  | 'password'
  | 'otpHash'
  | 'otpExpires'
  | 'resetPasswordToken'
  | 'resetPasswordExpires'
  | 'refreshToken'
  | 'refreshTokenExpires';

export const sanitizeAdminUserResponse = <T extends Record<string, unknown>>(
  user: T
): Omit<T, SensitiveUserFields> => {
  const {
    password,
    otpHash,
    otpExpires,
    resetPasswordToken,
    resetPasswordExpires,
    refreshToken,
    refreshTokenExpires,
    ...safeUser
  } = user as T & Record<SensitiveUserFields, unknown>;

  void password;
  void otpHash;
  void otpExpires;
  void resetPasswordToken;
  void resetPasswordExpires;
  void refreshToken;
  void refreshTokenExpires;

  return safeUser;
};

export const formatUserResponse = (user: User) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  onboardingStatus: user.onboardingStatus,
  createdAt: user.createdAt,
});

// -- Token helpers -----------------------------------------------------------

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

// -- Phone normalisation -----------------------------------------------------

export const normalizePhone = (phone: string): string => phone.replace(/[^\d]/g, '');

// -- MSG91 verification JWT --------------------------------------------------

export interface Msg91VerificationTokenPayload extends JwtPayload {
  sub: string;
  phone: string;
  purpose: 'msg91_verification';
}

export const getMsg91VerificationSecret = (): string => {
  const secret = process.env.MSG91_VERIFICATION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('MSG91_VERIFICATION_SECRET or JWT_SECRET must be configured');
  }
  return secret;
};

export const signMsg91VerificationToken = (userId: string, phone: string): string =>
  jwt.sign(
    {
      sub: userId,
      phone: normalizePhone(phone),
      purpose: 'msg91_verification',
    } satisfies Msg91VerificationTokenPayload,
    getMsg91VerificationSecret(),
    { expiresIn: '15m', algorithm: 'HS256' }
  );

export const verifyMsg91VerificationToken = (token: string): Msg91VerificationTokenPayload =>
  jwt.verify(token, getMsg91VerificationSecret(), {
    algorithms: ['HS256'],
  }) as Msg91VerificationTokenPayload;
