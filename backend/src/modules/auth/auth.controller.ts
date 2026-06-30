import { Request, Response } from 'express';
import { Prisma, type User } from '@prisma/client';
import prisma from '../../shared/db/prisma.js';
import { REFRESH_COOKIE, getRefreshCookieOptions, getClearCookieOptions } from '../../shared/security/cookieConfig.js';
import {
  logAuditEvent,
  generateDeviceFingerprint,
  getClientIP,
  checkSuspiciousActivity,
} from '../audit/auditLogger.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getAccessTokenTtlSeconds,
  extractTokenFromHeader,
  getTokenExpirationMs,
} from '../../shared/security/jwt.js';
import { tokenBlacklist } from '../../shared/security/tokenBlacklist.js';
import {
  comparePassword,
  hashPassword,
  isLocked,
  incrementLoginAttempts,
  addSession,
  removeSession,
} from './user.service.js';
import { formatUserResponse, hashToken, normalizePhone, verifyMsg91VerificationToken } from './auth.service.js';
import { consumeVerificationToken } from './otpChallenge.service.js';
import { isAdminRole } from '../users/adminPermissions.service.js';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAuthError,
  buildGoogleAuthorizationUrl,
  createOAuthState,
  createPkceVerifier,
  exchangeGoogleCodeForIdToken,
  getGoogleIdentityFromIdToken,
  getPartnerOAuthSuccessRedirect,
  publicOAuthFailureReason,
  resolveGooglePartnerUser,
} from './oauth.service.js';

const isMissingTableError = (error: unknown, tableName: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2021' &&
  typeof error.meta?.table === 'string' &&
  error.meta.table.includes(tableName);

const oauthCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth/login/partner/google',
  maxAge: 10 * 60 * 1000,
};

const clearOAuthCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth/login/partner/google',
};

const frontendUrl = (): string => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const loginFailure = async (
  req: Request,
  res: Response,
  status: number,
  email: string,
  message = 'Invalid credentials',
  code?: string,
  userId?: string,
  failureReason = message
): Promise<void> => {
  await logAuditEvent('LOGIN_FAILED', req, {
    userId,
    email,
    success: false,
    failureReason,
  });

  res.status(status).json({
    success: false,
    message,
    ...(code ? { code } : {}),
  });
};

const issueLoginSession = async (
  req: Request,
  res: Response,
  user: User,
  redirectTo?: string
): Promise<void> => {
  const fingerprint = generateDeviceFingerprint(req);
  let isSuspicious = false;
  try {
    isSuspicious = await checkSuspiciousActivity(user.id, fingerprint);
  } catch (error) {
    if (!isMissingTableError(error, 'audit_logs')) throw error;
    console.warn('login suspicious-activity check skipped: audit_logs table is missing');
  }

  if (isSuspicious) {
    await logAuditEvent('SUSPICIOUS_ACTIVITY', req, {
      userId: user.id,
      email: user.email,
      metadata: { reason: 'Login from new device' },
    });
  }

  const refreshToken = signRefreshToken(user);
  const refreshExpiresAt = getTokenExpirationMs(refreshToken);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockUntil: null,
          lastLogin: new Date(),
          refreshToken: hashToken(refreshToken),
          refreshTokenExpires: refreshExpiresAt ? new Date(refreshExpiresAt) : null,
        },
      });

      await addSession(
        user.id,
        {
          deviceFingerprint: fingerprint,
          userAgent: req.headers['user-agent'] || '',
          ip: getClientIP(req),
        },
        tx
      );
    });
  } catch (error) {
    if (!isMissingTableError(error, 'active_sessions')) throw error;

    console.warn('login session tracking skipped: active_sessions table is missing');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date(),
        refreshToken: hashToken(refreshToken),
        refreshTokenExpires: refreshExpiresAt ? new Date(refreshExpiresAt) : null,
      },
    });
  }

  logAuditEvent('LOGIN_SUCCESS', req, {
    userId: user.id,
    email: user.email,
  }).catch((err) => console.error('Audit log failed for LOGIN_SUCCESS:', err));

  res.cookie(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());

  if (redirectTo) {
    res.redirect(redirectTo);
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: formatUserResponse(user),
      accessToken: signAccessToken(user),
      expiresIn: getAccessTokenTtlSeconds(),
    },
  });
};

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
        encryptionVersion: 1,
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

    // Validate phone verification token server-side
    let isPhoneVerified = false;
    if (phoneVerificationToken && mobileNumber) {
      // Try signed JWT (MSG91 path) first — no side effects
      try {
        const payload = verifyMsg91VerificationToken(phoneVerificationToken);
        if (payload.phone === normalizePhone(mobileNumber)) {
          isPhoneVerified = true;
        }
      } catch {
        // Not a valid JWT; try as OTP challenge token (Redis/DB path)
        const consumed = await consumeVerificationToken(mobileNumber, phoneVerificationToken);
        if (consumed) {
          isPhoneVerified = true;
        }
      }
    }

    if (!isPhoneVerified) {
      res.status(400).json({
        success: false,
        message: 'Phone verification is required. Please verify your phone number first.',
      });
      return;
    }

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
        encryptionVersion: 1,
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

const loginWithRolePolicy = async (
  req: Request,
  res: Response,
  isAllowedRole: (role: string) => boolean,
  forbiddenMessage: string
): Promise<void> => {
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
      await loginFailure(req, res, 401, email.toLowerCase(), 'Invalid credentials', undefined, undefined, 'User not found');
      return;
    }

    if (!isAllowedRole(user.role)) {
      await loginFailure(req, res, 403, user.email, forbiddenMessage, 'FORBIDDEN_LOGIN_PORTAL', user.id, 'Wrong login portal');
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

    if (!user.password) {
      await loginFailure(
        req,
        res,
        401,
        user.email,
        'This account uses Google sign-in. Continue with Google.',
        'GOOGLE_SIGN_IN_REQUIRED',
        user.id,
        'OAuth-only account'
      );
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

    const fingerprint = generateDeviceFingerprint(req);
    let isSuspicious = false;
    try {
      isSuspicious = await checkSuspiciousActivity(user.id, fingerprint);
    } catch (error) {
      if (!isMissingTableError(error, 'audit_logs')) {
        throw error;
      }

      console.warn('login suspicious-activity check skipped: audit_logs table is missing');
    }

    if (isSuspicious) {
      await logAuditEvent('SUSPICIOUS_ACTIVITY', req, {
        userId: user.id,
        email: user.email,
        metadata: { reason: 'Login from new device' },
      });
    }

    const refreshToken = signRefreshToken(user as User);
    const refreshExpiresAt = getTokenExpirationMs(refreshToken);

    // Wrap all session-state writes in a single transaction so a mid-flight
    // crash cannot leave the user in a partially-authenticated state
    // (e.g. attempts reset but no refresh token stored, or token stored but
    // no active session record).
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockUntil: null,
            lastLogin: new Date(),
            refreshToken: hashToken(refreshToken),
            refreshTokenExpires: refreshExpiresAt ? new Date(refreshExpiresAt) : null,
          },
        });

        await addSession(
          user.id,
          {
            deviceFingerprint: fingerprint,
            userAgent: req.headers['user-agent'] || '',
            ip: getClientIP(req),
          },
          tx
        );
      });
    } catch (error) {
      if (!isMissingTableError(error, 'active_sessions')) {
        throw error;
      }

      console.warn('login session tracking skipped: active_sessions table is missing');
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockUntil: null,
          lastLogin: new Date(),
          refreshToken: hashToken(refreshToken),
          refreshTokenExpires: refreshExpiresAt ? new Date(refreshExpiresAt) : null,
        },
      });
    }

    // Audit is fire-and-forget — user must not wait for it
    logAuditEvent('LOGIN_SUCCESS', req, {
      userId: user.id,
      email: user.email,
    }).catch((err) => console.error('Audit log failed for LOGIN_SUCCESS:', err));

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

export const loginPartner = async (req: Request, res: Response): Promise<void> =>
  loginWithRolePolicy(req, res, (role) => role === 'partner', 'Please use the restricted access portal for admin accounts.');

export const loginRestrictedAccess = async (req: Request, res: Response): Promise<void> =>
  loginWithRolePolicy(req, res, (role) => isAdminRole(role), 'Please use the partner portal for partner accounts.');

export const login = loginPartner;

const loginUrlWithReason = (reason: string): string =>
  `${frontendUrl()}/login/partner?oauth=${encodeURIComponent(reason)}`;

export const startGooglePartnerOAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_REDIRECT_URI) {
      throw new OAuthError('OAUTH_CONFIGURATION_ERROR');
    }

    const state = createOAuthState();
    const codeVerifier = createPkceVerifier();

    res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions);
    res.cookie(OAUTH_VERIFIER_COOKIE, codeVerifier, oauthCookieOptions);

    logAuditEvent('OAUTH_START', req, {
      metadata: { provider: 'google', portal: 'partner' },
    }).catch((err) => console.error('Audit log failed for OAUTH_START:', err));

    res.redirect(buildGoogleAuthorizationUrl({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
      state,
      codeVerifier,
    }));
  } catch (error) {
    console.error('Google OAuth start error:', error instanceof OAuthError ? error.code : 'OAUTH_PROVIDER_ERROR');
    res.redirect(loginUrlWithReason(publicOAuthFailureReason(error)));
  }
};

export const handleGooglePartnerOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  const clearOAuthCookies = () => {
    res.clearCookie(OAUTH_STATE_COOKIE, clearOAuthCookieOptions);
    res.clearCookie(OAUTH_VERIFIER_COOKIE, clearOAuthCookieOptions);
  };

  try {
    clearOAuthCookies();

    if (typeof req.query.error === 'string') {
      throw new OAuthError('OAUTH_PROVIDER_ERROR');
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
    const verifier = req.cookies?.[OAUTH_VERIFIER_COOKIE];

    if (!code || !state || !expectedState || !verifier || state !== expectedState) {
      throw new OAuthError('OAUTH_INVALID_STATE');
    }

    const idToken = await exchangeGoogleCodeForIdToken(code, verifier);
    const identity = getGoogleIdentityFromIdToken(idToken);
    const { user, accountAction } = await resolveGooglePartnerUser(identity);

    if (accountAction === 'created' || accountAction === 'linked') {
      logAuditEvent(accountAction === 'created' ? 'OAUTH_ACCOUNT_CREATED' : 'OAUTH_ACCOUNT_LINKED', req, {
        userId: user.id,
        email: user.email,
        metadata: { provider: 'google', portal: 'partner' },
      }).catch((err) => console.error('Audit log failed for OAuth account action:', err));
    }

    logAuditEvent('OAUTH_SUCCESS', req, {
      userId: user.id,
      email: user.email,
      metadata: { provider: 'google', portal: 'partner' },
    }).catch((err) => console.error('Audit log failed for OAUTH_SUCCESS:', err));

    await issueLoginSession(req, res, user, getPartnerOAuthSuccessRedirect(user));
  } catch (error) {
    const reason = publicOAuthFailureReason(error);
    console.error('Google OAuth callback error:', error instanceof OAuthError ? error.code : 'OAUTH_PROVIDER_ERROR');
    if (error instanceof OAuthError && error.code === 'ACCOUNT_LINK_REQUIRED') {
      logAuditEvent('OAUTH_ACCOUNT_LINK_BLOCKED', req, {
        success: false,
        failureReason: 'ACCOUNT_LINK_REQUIRED',
        metadata: { provider: 'google', portal: 'partner' },
      }).catch((err) => console.error('Audit log failed for OAUTH_ACCOUNT_LINK_BLOCKED:', err));
    }
    logAuditEvent('OAUTH_FAILURE', req, {
      success: false,
      failureReason: reason,
      metadata: { provider: 'google', portal: 'partner' },
    }).catch((err) => console.error('Audit log failed for OAUTH_FAILURE:', err));
    res.redirect(loginUrlWithReason(reason));
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Read refresh token from httpOnly cookie (falls back to body for backwards compat)
    const refreshToken: string | undefined =
      req.cookies?.[REFRESH_COOKIE] || (req.body as { refreshToken?: string } | undefined)?.refreshToken;

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
    const user = await prisma.user.findUnique({
      where: { id: refreshPayload.sub },
    });

    if (
      !user
      || user.refreshToken !== hashed
      || !user.refreshTokenExpires
      || user.refreshTokenExpires <= new Date()
    ) {
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

    let logoutUser = req.user;

    if (!logoutUser) {
      const refreshToken = req.cookies?.[REFRESH_COOKIE];

      if (typeof refreshToken === 'string' && refreshToken.trim() !== '') {
        try {
          const refreshPayload = verifyRefreshToken(refreshToken);
          const hashedRefreshToken = hashToken(refreshToken);
          const user = await prisma.user.findUnique({
            where: { id: refreshPayload.sub },
          });

          if (
            user
            && user.refreshToken === hashedRefreshToken
            && user.refreshTokenExpires
            && user.refreshTokenExpires > new Date()
          ) {
            logoutUser = user;
          }
        } catch {
          // Best-effort logout: still clear the cookie below.
        }
      }
    }

    if (logoutUser) {
      const fingerprint = generateDeviceFingerprint(req);
      await removeSession(logoutUser.id, fingerprint);

      await prisma.user.update({
        where: { id: logoutUser.id },
        data: {
          refreshToken: null,
          refreshTokenExpires: null,
        },
      });

      await logAuditEvent('LOGOUT', req, {
        userId: logoutUser.id,
        email: logoutUser.email,
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
