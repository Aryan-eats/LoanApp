import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import {
  logAuditEvent,
  redactPhone,
} from '../utils/auditLogger.js';
import {
  formatUserResponse,
  hashToken,
  normalizePhone,
  verifyMsg91VerificationToken,
  signMsg91VerificationToken,
} from '../services/authService.js';
import {
  generateOTP,
  verifyUserOTP,
} from '../services/userService.js';
import { sendOTP as sendMsg91OTP, verifyOTP as verifyMsg91OTPService, resendOTP as resendMsg91OTP } from '../services/smsService.js';
import {
  createOtpChallenge,
  verifyOtpChallenge,
} from '../services/otpChallengeService.js';

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

    // -- Registered-user OTP verification -------------------
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

    let verifiedPayload: ReturnType<typeof verifyMsg91VerificationToken>;
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

    const updateData: { isPhoneVerified?: boolean; isEmailVerified?: boolean } = {};
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
// MSG91 REST API Handlers
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
