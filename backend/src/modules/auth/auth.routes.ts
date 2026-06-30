import { Router } from 'express';
import {
  getMe,
  handleGooglePartnerOAuthCallback,
  loginPartner,
  loginRestrictedAccess,
  logout,
  refreshAccessToken,
  register,
  registerPartner,
  startGooglePartnerOAuth,
} from './auth.controller.js';
import {
  msg91ResendOTP,
  msg91SendOTP,
  msg91VerifyOTP,
  sendOTP,
  verifyMsg91OTP,
  verifyOTP,
} from './otp.controller.js';
import {
  forgotPassword,
  resetPassword,
} from './password.controller.js';
import { optionalAuth, protect } from '../../shared/middleware/auth.js';
import {
  loginLimiter,
  oauthStartLimiter,
  oauthCallbackLimiter,
  registerLimiter,
  passwordResetLimiter,
  otpLimiter,
  refreshLimiter,
} from '../../shared/middleware/rateLimiter.js';
import {
  validateLogin,
  validateRegister,
  validatePartnerRegister,
  validateForgotPassword,
  validateResetPassword,
  validateSendOTP,
  validateVerifyOTP,
  validateVerifyMsg91OTP,
  validateMsg91SendOTP,
  validateMsg91VerifyOTP,
  validateMsg91ResendOTP,
} from '../../shared/middleware/validators.js';

const router = Router();

// Public routes with rate limiting and validation
router.post('/register', registerLimiter, validateRegister, register);
router.post('/register-partner', registerLimiter, validatePartnerRegister, registerPartner);
router.post('/login/partner', loginLimiter, validateLogin, loginPartner);
router.post('/login/restricted-access', loginLimiter, validateLogin, loginRestrictedAccess);
router.get('/login/partner/google', oauthStartLimiter, startGooglePartnerOAuth);
router.get('/login/partner/google/callback', oauthCallbackLimiter, handleGooglePartnerOAuthCallback);
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateResetPassword, resetPassword);
router.post('/send-otp', otpLimiter, validateSendOTP, sendOTP);
router.post('/verify-otp', otpLimiter, validateVerifyOTP, verifyOTP);
router.post('/verify-msg91', otpLimiter, protect, validateVerifyMsg91OTP, verifyMsg91OTP);

// NEW: MSG91 REST API OTP routes (no widget dependency)
router.post('/otp/send', otpLimiter, validateMsg91SendOTP, msg91SendOTP);
router.post('/otp/verify', otpLimiter, validateMsg91VerifyOTP, msg91VerifyOTP);
router.post('/otp/resend', otpLimiter, validateMsg91ResendOTP, msg91ResendOTP);

// Refresh token endpoint (no auth required, but rate limited)
router.post('/refresh-token', refreshLimiter, refreshAccessToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', optionalAuth, logout);

export default router;
