import { Request, Response } from 'express';
import type { User } from '@prisma/client';
import prisma from '../shared/db/prisma.js';
import {
  comparePassword,
  hashPassword,
  isPasswordReused,
  addToPasswordHistory,
} from '../services/userService.js';
import { logAuditEvent } from '../utils/auditLogger.js';

// Format user response (exclude sensitive data)
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
  updatedAt: user.updatedAt,
});

/**
 * @desc    Get current user profile
 * @route   GET /api/profile
 * @access  Private
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/profile
 * @access  Private
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    const { firstName, lastName, phone } = req.body;

    const updateData: Partial<{ firstName: string; lastName: string; phone: string }> = {};

    if (firstName !== undefined) {
      if (firstName.length > 50) {
        res.status(400).json({
          success: false,
          message: 'First name cannot exceed 50 characters',
        });
        return;
      }
      updateData.firstName = firstName;
    }

    if (lastName !== undefined) {
      if (lastName.length > 50) {
        res.status(400).json({
          success: false,
          message: 'Last name cannot exceed 50 characters',
        });
        return;
      }
      updateData.lastName = lastName;
    }

    if (phone !== undefined) {
      if (phone && !/^[0-9]{10}$/.test(phone)) {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit phone number',
        });
        return;
      }
      updateData.phone = phone;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update user password
 * @route   PUT /api/profile/password
 * @access  Private
 */
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Please provide current password and new password',
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.password) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const isMatch = await comparePassword(currentPassword, user.password);

    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    const reused = await isPasswordReused(user.id, newPassword);
    if (reused) {
      res.status(400).json({
        success: false,
        message: 'Cannot reuse a recent password. Please choose a different password.',
      });
      return;
    }

    await addToPasswordHistory(user.id, user.password);

    const newHashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHashed },
    });
    await logAuditEvent('PASSWORD_CHANGE', req, {
      userId: user.id,
      entityId: user.id,
      entityType: 'USER',
      metadata: { action: 'password_update' },
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Delete own account
 * @route   DELETE /api/profile
 * @access  Private
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        success: false,
        message: 'Please provide your password to confirm account deletion',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.password) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Password is incorrect',
      });
      return;
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isActive: false },
    });
    await logAuditEvent('DATA_DELETION_REQUEST', req, {
      userId: user.id,
      entityId: user.id,
      entityType: 'USER',
      metadata: { action: 'account_deactivation' },
    });

    res.status(200).json({
      success: true,
      message: 'Account has been deactivated successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
