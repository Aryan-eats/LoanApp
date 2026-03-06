import { Router } from 'express';
import {
  register,
  registerPartner,
  login,
  getMe,
  logout,
  refreshAccessToken,
} from '../controllers/authController.js';
import {
  sendOTP,
  verifyOTP,
  verifyMsg91OTP,
  // MSG91 REST API handlers
  msg91SendOTP,
  msg91VerifyOTP,
  msg91ResendOTP,
} from '../controllers/otpController.js';
import {
  forgotPassword,
  resetPassword,
} from '../controllers/passwordController.js';
import { protect } from '../middleware/auth.js';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  otpLimiter,
  refreshLimiter,
} from '../middleware/rateLimiter.js';
import {
  validateLogin,
  validateRegister,
  validatePartnerRegister,
  validateForgotPassword,
  validateResetPassword,
  validateSendOTP,
  validateVerifyOTP,
} from '../middleware/validators.js';

const router = Router();

// Public routes with rate limiting and validation
router.post('/register', registerLimiter, validateRegister, register);
router.post('/register-partner', registerLimiter, validatePartnerRegister, registerPartner);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPassword);
router.post('/send-otp', otpLimiter, validateSendOTP, sendOTP);
router.post('/verify-otp', otpLimiter, validateVerifyOTP, verifyOTP);
router.post('/verify-msg91', otpLimiter, protect, verifyMsg91OTP);

// NEW: MSG91 REST API OTP routes (no widget dependency)
router.post('/otp/send', otpLimiter, msg91SendOTP);
router.post('/otp/verify', otpLimiter, msg91VerifyOTP);
router.post('/otp/resend', otpLimiter, msg91ResendOTP);

// Refresh token endpoint (no auth required, but rate limited)
router.post('/refresh-token', refreshLimiter, refreshAccessToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
