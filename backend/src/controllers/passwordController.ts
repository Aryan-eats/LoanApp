import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../shared/db/prisma.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { hashToken } from '../services/authService.js';
import {
  hashPassword,
  generatePasswordResetToken,
  isPasswordReused,
  addToPasswordHistory,
} from '../services/userService.js';

const timingSafeCompare = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user || !user.resetPasswordToken || !timingSafeCompare(user.resetPasswordToken, hashedToken)) {
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
