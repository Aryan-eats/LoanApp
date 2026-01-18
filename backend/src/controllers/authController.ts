import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import User, { IUser, UserRole } from '../models/User.js';
import { tokenBlacklist } from '../utils/tokenBlacklist.js';
import { logAuditEvent, generateDeviceFingerprint, getClientIP, checkSuspiciousActivity } from '../utils/auditLogger.js';

// Cookie options for secure token storage
const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge,
  path: '/',
});

// Generate JWT Access Token (short-lived)
const generateAccessToken = (id: string, role: UserRole): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }
  // Short-lived access token (15 minutes for security)
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';

  return jwt.sign({ id, role }, jwtSecret, {
    expiresIn,
  } as SignOptions);
};

// Generate JWT Refresh Token (longer-lived)
const generateRefreshTokenJWT = (id: string): string => {
  const jwtSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }
  // Refresh token valid for 7 days
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  return jwt.sign({ id, type: 'refresh' }, jwtSecret, {
    expiresIn,
  } as SignOptions);
};

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
});

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: 'Please provide email, password, firstName, and lastName',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // SECURITY: Always set role to 'partner' for public registration
    // Admin users must be created through secure internal scripts only
    const userRole: UserRole = 'partner';

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: userRole,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshTokenJWT(user._id.toString());

    // Store refresh token hash in database
    user.generateRefreshToken();
    await user.save();

    // Add session
    const fingerprint = generateDeviceFingerprint(req);
    await user.addSession({
      deviceFingerprint: fingerprint,
      userAgent: req.headers['user-agent'] || '',
      ip: getClientIP(req),
    });

    // Log audit event
    await logAuditEvent('REGISTER', req, {
      userId: user._id.toString(),
      email: user.email,
    });

    // Set httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserResponse(user),
        accessToken,
        // Also return tokens in body for non-cookie clients (mobile apps)
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle mongoose validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

/**
 * @desc    Register a new partner with onboarding data
 * @route   POST /api/auth/register-partner
 * @access  Public
 */
export const registerPartner = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      // Basic Identity (Step 1)
      fullName,
      mobileNumber,
      email,
      password,
      partnerType,
      city,
      // Business Details (Step 2)
      businessName,
      businessAddress,
      yearsInOperation,
      panNumber,
      gstNumber,
      hasExperience,
      expectedLeads,
      // Payout Info (Step 3)
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      // Consent (Step 4)
      consentDataShare,
      consentCommission,
      declarationNotEmployed,
      consentPrivacyPolicy,
    } = req.body;

    // Validate required fields
    if (!fullName || !mobileNumber || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide fullName, mobileNumber, email, and password',
      });
      return;
    }

    // Validate consent fields
    if (!consentDataShare || !consentCommission || !declarationNotEmployed || !consentPrivacyPolicy) {
      res.status(400).json({
        success: false,
        message: 'All consent fields must be agreed to',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // Check if phone number already exists
    const existingPhone = await User.findOne({ phone: mobileNumber });
    if (existingPhone) {
      res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
      return;
    }

    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Create partner user with all onboarding data
    // isActive is false so admin must approve before partner can submit leads
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone: mobileNumber,
      role: 'partner',
      isActive: false, // Partners require admin approval
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
      onboardingCompletedAt: new Date(),
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshTokenJWT(user._id.toString());

    user.generateRefreshToken();
    await user.save();

    // Add session
    const fingerprint = generateDeviceFingerprint(req);
    await user.addSession({
      deviceFingerprint: fingerprint,
      userAgent: req.headers['user-agent'] || '',
      ip: getClientIP(req),
    });

    // Log audit event
    await logAuditEvent('REGISTER', req, {
      userId: user._id.toString(),
      email: user.email,
      metadata: { partnerType },
    });

    // Set httpOnly cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(201).json({
      success: true,
      message: 'Partner registered successfully. Your application is pending approval.',
      data: {
        user: formatUserResponse(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Partner registration error:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Server error during partner registration',
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
      return;
    }

    // Find user by email (include password and lockout fields for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password +failedLoginAttempts +lockUntil +activeSessions'
    );

    if (!user) {
      // Log failed attempt even for non-existent user
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

    // Check if account is locked
    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil(
        ((user.lockUntil?.getTime() || 0) - Date.now()) / 60000
      );

      await logAuditEvent('LOGIN_FAILED', req, {
        userId: user._id.toString(),
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

    // Check if user is active
    if (!user.isActive) {
      await logAuditEvent('LOGIN_FAILED', req, {
        userId: user._id.toString(),
        email: user.email,
        success: false,
        failureReason: 'Account not active',
      });

      // Check if it's a pending partner (not yet approved)
      const isPendingPartner = user.role === 'partner' && user.onboardingStatus === 'pending';
      
      res.status(401).json({
        success: false,
        message: isPendingPartner 
          ? 'Your partner account is pending approval. You will receive an email once approved.'
          : 'Account has been deactivated. Please contact support.',
      });
      return;
    }

    // Compare password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      // Increment failed login attempts
      await user.incrementLoginAttempts();
      
      // Check if this caused an account lock
      if (user.failedLoginAttempts + 1 >= 5) {
        await logAuditEvent('ACCOUNT_LOCKED', req, {
          userId: user._id.toString(),
          email: user.email,
        });
      }

      await logAuditEvent('LOGIN_FAILED', req, {
        userId: user._id.toString(),
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

    // Reset failed login attempts on successful login
    await user.resetLoginAttempts();

    // Check for suspicious activity (new device)
    const fingerprint = generateDeviceFingerprint(req);
    const isSuspicious = await checkSuspiciousActivity(user._id.toString(), fingerprint);
    
    if (isSuspicious) {
      await logAuditEvent('SUSPICIOUS_ACTIVITY', req, {
        userId: user._id.toString(),
        email: user.email,
        metadata: { reason: 'Login from new device' },
      });
      // In production, you might want to send an email notification here
    }

    // Update last login and add session
    user.lastLogin = new Date();
    await user.save();

    await user.addSession({
      deviceFingerprint: fingerprint,
      userAgent: req.headers['user-agent'] || '',
      ip: getClientIP(req),
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshTokenJWT(user._id.toString());

    user.generateRefreshToken();
    await user.save();

    // Log successful login
    await logAuditEvent('LOGIN_SUCCESS', req, {
      userId: user._id.toString(),
      email: user.email,
    });

    // Set httpOnly cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        accessToken,
        refreshToken,
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

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public (with valid refresh token)
 */
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'No refresh token provided',
      });
      return;
    }

    // Verify refresh token
    const jwtSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    let decoded: { id: string; type?: string };
    try {
      decoded = jwt.verify(refreshToken, jwtSecret) as { id: string; type?: string };
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    // Verify it's a refresh token
    if (decoded.type !== 'refresh') {
      res.status(401).json({
        success: false,
        message: 'Invalid token type',
      });
      return;
    }

    // Find user
    const user = await User.findById(decoded.id).select('+refreshToken +refreshTokenExpires');

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
      return;
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id.toString(), user.role);

    // Log token refresh
    await logAuditEvent('TOKEN_REFRESH', req, {
      userId: user._id.toString(),
      email: user.email,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
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

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
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

/**
 * @desc    Logout user (invalidate token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // Decode token to get expiration time
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        try {
          const decoded = jwt.verify(token, jwtSecret) as { exp?: number };
          const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
          
          // Add token to blacklist
          await tokenBlacklist.add(token, expiresAt);
        } catch {
          // Token is invalid or expired, no need to blacklist
        }
      }
    }

    // Remove session
    if (req.user) {
      const fingerprint = generateDeviceFingerprint(req);
      await req.user.removeSession(fingerprint);

      // Log logout
      await logAuditEvent('LOGOUT', req, {
        userId: req.user._id.toString(),
        email: req.user.email,
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', { path: '/' });

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

/**
 * @desc    Forgot password - send reset token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
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

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    await logAuditEvent('PASSWORD_RESET_REQUEST', req, {
      email: email.toLowerCase(),
      success: !!user,
    });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });
      return;
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // In production, send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // TODO: Send email with resetUrl
    console.log('Password reset URL:', resetUrl);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request',
    });
  }
};

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide token and new password',
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

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires +password +passwordHistory');

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
      return;
    }

    // Check if password was used before
    const isReused = await user.isPasswordReused(password);
    if (isReused) {
      res.status(400).json({
        success: false,
        message: 'Cannot reuse a recent password. Please choose a different password.',
      });
      return;
    }

    // Add old password to history before changing
    if (user.password) {
      await user.addToPasswordHistory(user.password);
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Invalidate all refresh tokens by clearing them
    user.refreshToken = undefined;
    user.refreshTokenExpires = undefined;
    await user.save();

    // Log password reset
    await logAuditEvent('PASSWORD_RESET_SUCCESS', req, {
      userId: user._id.toString(),
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

/**
 * @desc    Send OTP to mobile number
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
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

    // Find user by phone or email
    const query = phone 
      ? { phone } 
      : { email: email.toLowerCase() };
    
    const user = await User.findOne(query);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Log OTP sent event
    await logAuditEvent('OTP_SENT', req, {
      userId: user._id.toString(),
      email: user.email,
      metadata: { method: phone ? 'phone' : 'email' },
    });

    // In production, send OTP via SMS or email
    // For development, log it (this will NOT be returned in response)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV ONLY] OTP for ${phone || email}: ${otp}`);
    }

    // TODO: Integrate with SMS service (Twilio, etc.) or email service

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${phone ? 'mobile number' : 'email'}`,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending OTP',
    });
  }
};

/**
 * @desc    Verify OTP (for partner onboarding)
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, otp } = req.body;

    if ((!phone && !email) || !otp) {
      res.status(400).json({
        success: false,
        message: 'Please provide phone/email and OTP',
      });
      return;
    }

    // Hash the provided OTP
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    // Find user with matching OTP
    const query = phone 
      ? { phone } 
      : { email: email.toLowerCase() };

    const user = await User.findOne({
      ...query,
      otp: hashedOTP,
      otpExpires: { $gt: new Date() },
    }).select('+otp +otpExpires');

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
      return;
    }

    // Mark phone/email as verified
    if (phone) {
      user.isPhoneVerified = true;
    } else {
      user.isEmailVerified = true;
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Log OTP verification
    await logAuditEvent('OTP_VERIFIED', req, {
      userId: user._id.toString(),
      email: user.email,
      metadata: { method: phone ? 'phone' : 'email' },
    });

    // Generate tokens for automatic login after verification
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshTokenJWT(user._id.toString());

    user.generateRefreshToken();
    await user.save();

    // Set httpOnly cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        user: formatUserResponse(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during OTP verification',
    });
  }
};
