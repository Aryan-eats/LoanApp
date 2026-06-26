import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as authController from '../modules/auth/auth.controller.js';
import authRoutes from '../modules/auth/auth.routes.js';
import * as authService from '../modules/auth/auth.service.js';
import * as emailVerification from '../modules/auth/emailVerification.service.js';
import * as mockVerification from '../modules/auth/mockVerification.service.js';
import * as otpController from '../modules/auth/otp.controller.js';
import * as otpChallenge from '../modules/auth/otpChallenge.service.js';
import * as passwordController from '../modules/auth/password.controller.js';

describe('auth module', () => {
  it('exposes auth through module-local files', () => {
    expect(authRoutes).toBeDefined();
    expect(authController.login).toBeTypeOf('function');
    expect(passwordController.resetPassword).toBeTypeOf('function');
    expect(otpController.sendOTP).toBeTypeOf('function');
    expect(authService.formatUserResponse).toBeTypeOf('function');
    expect(otpChallenge.consumeVerificationToken).toBeTypeOf('function');
    expect(emailVerification.sendVerificationCode).toBeTypeOf('function');
    expect(mockVerification.matchesMockOtp).toBeTypeOf('function');
  });

  it('removes old auth route/controller/service files', () => {
    expect(existsSync('src/routes/authRoutes.ts')).toBe(false);
    expect(existsSync('src/controllers/authController.ts')).toBe(false);
    expect(existsSync('src/controllers/passwordController.ts')).toBe(false);
    expect(existsSync('src/controllers/otpController.ts')).toBe(false);
    expect(existsSync('src/services/authService.ts')).toBe(false);
    expect(existsSync('src/services/otpChallengeService.ts')).toBe(false);
    expect(existsSync('src/services/emailVerificationService.ts')).toBe(false);
    expect(existsSync('src/services/mockVerificationService.ts')).toBe(false);
  });
});
