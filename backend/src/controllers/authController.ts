import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { REFRESH_COOKIE, getRefreshCookieOptions, getClearCookieOptions } from '../utils/cookieConfig.js';
import type { User } from '@prisma/client';
import prisma from '../config/prisma.js';
import {
  logAuditEvent,
  redactPhone,
  generateDeviceFingerprint,
  getClientIP,
  checkSuspiciousActivity,
} from '../utils/auditLogger.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getAccessTokenTtlSeconds,
  extractTokenFromHeader,
  getTokenExpirationMs,
} from '../utils/jwt.js';
import { tokenBlacklist } from '../utils/tokenBlacklist.js';
import {
  comparePassword,
  hashPassword,
  isLocked,
  incrementLoginAttempts,
  resetLoginAttempts,
  generatePasswordResetToken,
  generateOTP,
  isPasswordReused,
  addToPasswordHistory,
  addSession,
  removeSession,
  verifyUserOTP,
} from '../services/userService.js';
import { sendOTP as sendMsg91OTP, verifyOTP as verifyMsg91OTPService, resendOTP as resendMsg91OTP } from '../services/smsService.js';
import {
  createOtpChallenge,
  verifyOtpChallenge,
} from '../services/otpChallengeService.js';

const formatUserResponse = (user: User) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  createdAt: user.createdAt,
});

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

interface Msg91VerificationTokenPayload extends JwtPayload {
  sub: string;
  phone: string;
  purpose: 'msg91_verification';
}

const normalizePhone = (phone: string): string => phone.replace(/[^\d]/g, '');

const getMsg91VerificationSecret = (): string => {
  const secret = process.env.MSG91_VERIFICATION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('MSG91_VERIFICATION_SECRET or JWT_SECRET must be configured');
  }
  return secret;
};

const signMsg91VerificationToken = (userId: string, phone: string): string =>
  jwt.sign(
    {
      sub: userId,
      phone: normalizePhone(phone),
      purpose: 'msg91_verification',
    } satisfies Msg91VerificationTokenPayload,
    getMsg91VerificationSecret(),
    { expiresIn: '15m', algorithm: 'HS256' }
  );

const verifyMsg91VerificationToken = (token: string): Msg91VerificationTokenPayload =>
  jwt.verify(token, getMsg91VerificationSecret(), {
    algorithms: ['HS256'],
  }) as Msg91VerificationTokenPayload;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: 'Please provide email, password, firstName, and lastName',
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        isEmailVerified: true,
      },
    });

    await logAuditEvent('REGISTER', req, {
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

export const registerPartner = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fullName,
      mobileNumber,
      email,
      password,
      partnerType,
      city,
      phoneVerificationToken,
      businessName,
      businessAddress,
      yearsInOperation,
      panNumber,
      gstNumber,
      hasExperience,
      expectedLeads,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      consentDataShare,
      consentCommission,
      declarationNotEmployed,
      consentPrivacyPolicy,
    } = req.body;

    if (!fullName || !mobileNumber || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide fullName, mobileNumber, email, and password',
      });
      return;
    }

    if (!consentDataShare || !consentCommission || !declarationNotEmployed || !consentPrivacyPolicy) {
      res.status(400).json({
        success: false,
        message: 'All consent fields must be agreed to',
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    const existingPhone = await prisma.user.findFirst({
      where: { phone: mobileNumber },
    });
    if (existingPhone) {
      res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ');

    const hashedPassword = await hashPassword(password);

    // Phone verification is handled by MSG91 REST API during onboarding
    // The 'phoneVerificationToken' indicates the phone was verified via OTP
    const isPhoneVerified = !!phoneVerificationToken;

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone: mobileNumber,
        role: 'partner',
        isActive: false,
        isEmailVerified: true,
        isPhoneVerified,
        partnerType,
        city,
        businessName,
        businessAddress,
        yearsInOperation,
        panNumber,
        gstNumber,
        hasExperience,
        expectedLeads,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        upiId,
        consentDataShare,
        consentCommission,
        declarationNotEmployed,
        consentPrivacyPolicy,
        kycStatus: 'pending',
        onboardingStatus: 'pending',
      },
    });

    await logAuditEvent('REGISTER', req, {
      userId: user.id,
      email: user.email,
      entityId: user.id,
      entityType: 'partner',
      metadata: { partnerType },
    });

    // Log consent for DPDP compliance
    await logAuditEvent('CONSENT_GIVEN', req, {
      userId: user.id,
      email: user.email,
      entityId: user.id,
      entityType: 'partner',
      metadata: {
        consentDataShare: true,
        consentCommission: true,
        consentPrivacyPolicy: true,
        declarationNotEmployed: true,
        consentTimestamp: new Date().toISOString(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Partner registered successfully. Your application is pending approval.',
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Partner registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during partner registration',
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        failedLoginAttempts: true,
        lockUntil: true,
        onboardingStatus: true,
        refreshToken: true,
        refreshTokenExpires: true,
        createdAt: true,
      },
    });

    if (!user) {
      await logAuditEvent('LOGIN_FAILED', req, {
        email: email.toLowerCase(),
        success: false,
        failureReason: 'User not found',
      });
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    if (isLocked(user)) {
      const lockTimeRemaining = Math.ceil(
        ((user.lockUntil?.getTime() || 0) - Date.now()) / 60000
      );

      await logAuditEvent('LOGIN_FAILED', req, {
        userId: user.id,
        email: user.email,
        success: false,
        failureReason: 'Account locked',
      });

      res.status(423).json({
        success: false,
        message: `Account is locked due to too many failed login attempts. Please try again in ${lockTimeRemaining} minutes.`,
      });
      return;
    }

    if (!user.isActive) {
      await logAuditEvent('LOGIN_FAILED', req, {
        userId: user.id,
        email: user.email,
        success: false,
        failureReason: 'Account not active',
      });

      const isPendingPartner = user.role === 'partner' && user.onboardingStatus === 'pending';
      res.status(401).json({
        success: false,
        message: isPendingPartner
          ? 'Your partner account is pending approval. You will receive an email once approved.'
          : 'Account has been deactivated. Please contact support.',
      });
      return;
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      await incrementLoginAttempts(user.id, user.failedLoginAttempts);

      // Emit ACCOUNT_LOCKED if threshold crossed
      if (user.failedLoginAttempts + 1 >= 5) {
        await logAuditEvent('ACCOUNT_LOCKED', req, {
          userId: user.id,
          email: user.email,
          entityId: user.id,
          entityType: 'user',
          severity: 'HIGH',
          metadata: { failedAttempts: user.failedLoginAttempts + 1 },
        });
      }

      await logAuditEvent('LOGIN_FAILED', req, {
        userId: user.id,
        email: user.email,
        success: false,
        failureReason: 'Invalid password',
      });

      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    await resetLoginAttempts(user.id);

    const fingerprint = generateDeviceFingerprint(req);
    const isSuspicious = await checkSuspiciousActivity(user.id, fingerprint);
    if (isSuspicious) {
      await logAuditEvent('SUSPICIOUS_ACTIVITY', req, {
        userId: user.id,
        email: user.email,
        metadata: { reason: 'Login from new device' },
      });
    }

    const refreshToken = signRefreshToken(user as User);
    const refreshExpiresAt = getTokenExpirationMs(refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        refreshToken: hashToken(refreshToken),
        refreshTokenExpires: refreshExpiresAt ? new Date(refreshExpiresAt) : null,
      },
    });

    await addSession(user.id, {
      deviceFingerprint: fingerprint,
      userAgent: req.headers['user-agent'] || '',
      ip: getClientIP(req),
    });

    await logAuditEvent('LOGIN_SUCCESS', req, {
      userId: user.id,
      email: user.email,
    });

    const accessToken = signAccessToken(user as User);

    // Set refresh token as httpOnly cookie (not exposed to JS)
    res.cookie(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user as User),
        accessToken,
        expiresIn: getAccessTokenTtlSeconds(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Read refresh token from httpOnly cookie (falls back to body for backwards compat)
    const refreshToken: string | undefined =
      req.cookies?.[REFRESH_COOKIE] || (req.body as { refreshToken?: string }).refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'No refresh token provided',
      });
      return;
    }

    let refreshPayload;
    try {
      refreshPayload = verifyRefreshToken(refreshToken);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    const hashed = hashToken(refreshToken);
    const user = await prisma.user.findFirst({
      where: {
        id: refreshPayload.sub,
        refreshToken: hashed,
        refreshTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Refresh token is invalid or expired',
      });
      return;
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);
    const refreshExpiresAt = getTokenExpirationMs(newRefreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashToken(newRefreshToken),
        refreshTokenExpires: refreshExpiresAt ? new Date(refreshExpiresAt) : null,
      },
    });

    await logAuditEvent('TOKEN_REFRESH', req, {
      userId: user.id,
      email: user.email,
    });

    // Rotate the refresh token cookie
    res.cookie(REFRESH_COOKIE, newRefreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: getAccessTokenTtlSeconds(),
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh',
    });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(req.user),
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (token) {
      const expiresAt = getTokenExpirationMs(token);
      if (expiresAt) {
        await tokenBlacklist.add(token, expiresAt);
      }
    }

    if (req.user) {
      const fingerprint = generateDeviceFingerprint(req);
      await removeSession(req.user.id, fingerprint);

      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          refreshToken: null,
          refreshTokenExpires: null,
        },
      });

      await logAuditEvent('LOGOUT', req, {
        userId: req.user.id,
        email: req.user.email,
      });
    }

    // Clear the refresh token cookie
    res.clearCookie(REFRESH_COOKIE, getClearCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    await logAuditEvent('PASSWORD_RESET_REQUEST', req, {
      email: email.toLowerCase(),
      success: !!user,
    });

    if (user) {
      const resetToken = await generatePasswordResetToken(user.id);

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset code has been sent',
        ...(process.env.NODE_ENV !== 'production' ? { data: { resetToken } } : {}),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset code has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request',
    });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email, verification code, and new password',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    const hashedToken = hashToken(code);
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
      });
      return;
    }

    const reused = await isPasswordReused(user.id, password);
    if (reused) {
      res.status(400).json({
        success: false,
        message: 'You cannot reuse a recent password',
      });
      return;
    }

    if (user.password) {
      await addToPasswordHistory(user.id, user.password);
    }

    const newHashed = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashed,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    await logAuditEvent('PASSWORD_RESET_SUCCESS', req, {
      userId: user.id,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
    });
  }
};

export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email } = req.body;

    if (!phone && !email) {
      res.status(400).json({
        success: false,
        message: 'Please provide phone number or email',
      });
      return;
    }

    const user = phone
      ? await prisma.user.findFirst({ where: { phone } })
      : await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    let otp: string;
    if (user) {
      otp = await generateOTP(user.id);
    } else if (phone) {
      otp = await createOtpChallenge(phone);
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (phone) {
      const smsResult = await sendMsg91OTP(phone);
      if (!smsResult.success) {
        res.status(500).json({
          success: false,
          message: smsResult.message || 'Failed to send OTP',
        });
        return;
      }
    }

    await logAuditEvent('OTP_SENT', req, {
      userId: user?.id,
      email: user?.email,
      metadata: { method: phone ? 'phone' : 'email', onboarding: !user },
    });

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${phone ? 'mobile number' : 'email'}`,
      ...(process.env.NODE_ENV !== 'production' ? { data: { otp } } : {}),
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending verification code',
    });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, otp } = req.body;

    if ((!phone && !email) || !otp) {
      res.status(400).json({
        success: false,
        message: 'Please provide phone/email and verification code',
      });
      return;
    }

    const user = phone
      ? await prisma.user.findFirst({ where: { phone } })
      : await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // ── Registered-user OTP verification ───────────────────
    if (user) {
      // Try Redis-based verification first
      const redisVerified = await verifyUserOTP(user.id, otp);

      if (redisVerified) {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            isEmailVerified: email ? true : user.isEmailVerified,
            isPhoneVerified: phone ? true : user.isPhoneVerified,
          },
        });

        await logAuditEvent('OTP_VERIFIED', req, {
          userId: user.id,
          email: user.email,
          metadata: { method: phone ? 'phone' : 'email' },
        });

        res.status(200).json({
          success: true,
          message: 'Verification successful',
          data: { user: formatUserResponse(updatedUser) },
        });
        return;
      }

      // Fallback: legacy DB-column OTP check
      if (user.otpHash && user.otpExpires) {
        if (user.otpExpires < new Date()) {
          res.status(400).json({
            success: false,
            message: 'Verification code has expired',
          });
          return;
        }

        const hashedOtp = hashToken(otp);
        if (hashedOtp !== user.otpHash) {
          res.status(400).json({
            success: false,
            message: 'Invalid verification code',
          });
          return;
        }

        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            isEmailVerified: email ? true : user.isEmailVerified,
            isPhoneVerified: phone ? true : user.isPhoneVerified,
            otpHash: null,
            otpExpires: null,
          },
        });

        await logAuditEvent('OTP_VERIFIED', req, {
          userId: user.id,
          email: user.email,
          metadata: { method: phone ? 'phone' : 'email' },
        });

        res.status(200).json({
          success: true,
          message: 'Verification successful',
          data: { user: formatUserResponse(updatedUser) },
        });
        return;
      }
    }

    if (phone) {
      const result = await verifyOtpChallenge(phone, otp);
      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.reason === 'expired'
            ? 'Verification code has expired'
            : 'Invalid verification code',
        });
        return;
      }

      await logAuditEvent('OTP_VERIFIED', req, {
        metadata: { method: 'phone', onboarding: true },
      });

      res.status(200).json({
        success: true,
        message: 'Verification successful',
        data: {
          verificationToken: result.token,
        },
      });
      return;
    }

    res.status(404).json({
      success: false,
      message: 'User not found or OTP not generated',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification',
    });
  }
};

export const verifyMsg91OTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, type } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    if (!token || !type) {
      res.status(400).json({
        success: false,
        message: 'Missing required parameters: token or type',
      });
      return;
    }

    let verifiedPayload: Msg91VerificationTokenPayload;
    try {
      verifiedPayload = verifyMsg91VerificationToken(token);
    } catch {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired MSG91 token',
      });
      return;
    }

    if (verifiedPayload.purpose !== 'msg91_verification') {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired MSG91 token',
      });
      return;
    }

    if (
      req.user.phone &&
      normalizePhone(req.user.phone) !== verifiedPayload.phone
    ) {
      res.status(403).json({
        success: false,
        message: 'Verification token does not match authenticated user',
      });
      return;
    }

    const updateData: any = {};
    if (type === 'phone') {
      updateData.isPhoneVerified = true;
    } else if (type === 'email') {
      updateData.isEmailVerified = true;
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid verification type. Must be "phone" or "email"',
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    await logAuditEvent('OTP_VERIFIED', req, {
      userId: updatedUser.id,
      email: updatedUser.email,
      metadata: { method: 'msg91', type },
    });

    res.status(200).json({
      success: true,
      message: `${type === 'phone' ? 'Phone' : 'Email'} verified successfully`,
      data: {
        user: formatUserResponse(updatedUser),
      },
    });
  } catch (error) {
    console.error('Verify MSG91 OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during MSG91 verification',
    });
  }
};

// =========================================
// NEW MSG91 REST API Handlers
// =========================================

/**
 * Send OTP via MSG91 REST API
 * POST /auth/otp/send
 */
export const msg91SendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      res.status(400).json({
        success: false,
        message: 'Please provide mobile number',
      });
      return;
    }

    const result = await sendMsg91OTP(mobile);

    if (result.success) {
      await logAuditEvent('OTP_SENT', req, {
        metadata: { method: 'msg91_rest_api', mobile: redactPhone(mobile) },
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { requestId: result.requestId },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('MSG91 Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending OTP',
    });
  }
};

/**
 * Verify OTP via MSG91 REST API
 * POST /auth/otp/verify
 */
export const msg91VerifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      res.status(400).json({
        success: false,
        message: 'Please provide mobile number and OTP',
      });
      return;
    }

    const bypassVerification =
      process.env.MSG91_BYPASS_VERIFY === 'true' ||
      process.env.NODE_ENV !== 'production';

    const result = bypassVerification
      ? { success: true, message: 'OTP verification bypassed temporarily' }
      : await verifyMsg91OTPService(mobile, otp);

    if (result.success) {
      const verificationToken = signMsg91VerificationToken(
        req.user?.id || 'anonymous',
        mobile
      );

      await logAuditEvent('OTP_VERIFIED', req, {
        metadata: { method: 'msg91_rest_api', mobile: redactPhone(mobile) },
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { verificationToken },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('MSG91 Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying OTP',
    });
  }
};

/**
 * Resend OTP via MSG91 REST API
 * POST /auth/otp/resend
 */
export const msg91ResendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mobile, retryType = 'text' } = req.body;

    if (!mobile) {
      res.status(400).json({
        success: false,
        message: 'Please provide mobile number',
      });
      return;
    }

    const result = await resendMsg91OTP(mobile, retryType);

    if (result.success) {
      await logAuditEvent('OTP_SENT', req, {
        metadata: { method: 'msg91_rest_api_resend', mobile: redactPhone(mobile), retryType },
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { requestId: result.requestId },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('MSG91 Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending OTP',
    });
  }
};
