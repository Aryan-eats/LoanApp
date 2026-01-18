import { Router } from 'express';
import { 
  register, 
  registerPartner,
  login, 
  getMe, 
  logout,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
  refreshAccessToken,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  otpLimiter,
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

// Refresh token endpoint (no auth required, but rate limited)
router.post('/refresh-token', loginLimiter, refreshAccessToken);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
