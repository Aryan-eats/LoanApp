import { Request, Response } from 'express';
import User, { IUser } from '../models/User.js';

// Format user response (exclude sensitive data)
const formatUserResponse = (user: IUser) => ({
  id: user._id,
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

    // Get fresh user data from database
    const user = await User.findById(req.user._id);

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

    // Build update object with only allowed fields
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

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

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

    // Get user with password and password history
    const user = await User.findById(req.user._id).select('+password +passwordHistory');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Check if new password was used before (password history)
    const isReused = await user.isPasswordReused(newPassword);
    if (isReused) {
      res.status(400).json({
        success: false,
        message: 'Cannot reuse a recent password. Please choose a different password.',
      });
      return;
    }

    // Add current password to history before changing
    await user.addToPasswordHistory(user.password);

    // Update password
    user.password = newPassword;
    await user.save();

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

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Password is incorrect',
      });
      return;
    }

    // Soft delete - deactivate account instead of removing
    user.isActive = false;
    await user.save();

    // Or hard delete:
    // await User.findByIdAndDelete(req.user._id);

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
