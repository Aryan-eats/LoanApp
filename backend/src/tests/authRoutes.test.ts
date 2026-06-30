import express from 'express';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const noOp = (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();

const register = vi.fn((_req: express.Request, res: express.Response) => res.status(201).json({ success: true }));
const registerPartner = vi.fn((_req: express.Request, res: express.Response) => res.status(201).json({ success: true }));
const loginPartner = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true, portal: 'partner' }));
const loginRestrictedAccess = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true, portal: 'admin' }));
const startGooglePartnerOAuth = vi.fn((_req: express.Request, res: express.Response) => res.status(302).end());
const handleGooglePartnerOAuthCallback = vi.fn((_req: express.Request, res: express.Response) => res.status(302).end());
const getMe = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const logout = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const refreshAccessToken = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const sendOTP = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const verifyOTP = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const verifyMsg91OTP = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const msg91SendOTP = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const msg91VerifyOTP = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const msg91ResendOTP = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const forgotPassword = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const resetPassword = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
type JsonObject = Record<string, any>;

vi.mock('../modules/auth/auth.controller.js', () => ({
  register,
  registerPartner,
  loginPartner,
  loginRestrictedAccess,
  startGooglePartnerOAuth,
  handleGooglePartnerOAuthCallback,
  getMe,
  logout,
  refreshAccessToken,
}));

vi.mock('../modules/auth/otp.controller.js', () => ({
  sendOTP,
  verifyOTP,
  verifyMsg91OTP,
  msg91SendOTP,
  msg91VerifyOTP,
  msg91ResendOTP,
}));

vi.mock('../modules/auth/password.controller.js', () => ({
  forgotPassword,
  resetPassword,
}));

vi.mock('../shared/middleware/rateLimiter.js', () => ({
  loginLimiter: noOp,
  oauthStartLimiter: noOp,
  oauthCallbackLimiter: noOp,
  registerLimiter: noOp,
  passwordResetLimiter: noOp,
  otpLimiter: noOp,
  refreshLimiter: noOp,
}));

vi.mock('../shared/middleware/auth.js', () => ({
  optionalAuth: noOp,
  protect: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Not authorized' });
  },
}));

const authRoutes = (await import('../modules/auth/auth.routes.js')).default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

const requestJson = async (
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address() as AddressInfo;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      redirect: 'manual',
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const json = text && response.headers.get('content-type')?.includes('application/json')
      ? JSON.parse(text) as JsonObject
      : {};
    return { response, json };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
};

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid partner login input before calling the controller', async () => {
    const { response, json } = await requestJson('POST', '/api/auth/login/partner', {
      email: 'not-an-email',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Validation failed');
    expect(loginPartner).not.toHaveBeenCalled();
  });

  it('routes valid partner login input to the partner login controller', async () => {
    const { response, json } = await requestJson('POST', '/api/auth/login/partner', {
      email: 'user@example.com',
      password: 'StrongPass1!',
    });

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.portal).toBe('partner');
    expect(loginPartner).toHaveBeenCalledTimes(1);
    expect(loginRestrictedAccess).not.toHaveBeenCalled();
  });

  it('routes valid restricted-access login input to the admin login controller', async () => {
    const { response, json } = await requestJson('POST', '/api/auth/login/restricted-access', {
      email: 'admin@example.com',
      password: 'StrongPass1!',
    });

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.portal).toBe('admin');
    expect(loginRestrictedAccess).toHaveBeenCalledTimes(1);
    expect(loginPartner).not.toHaveBeenCalled();
  });

  it('routes Google OAuth only under partner login', async () => {
    const start = await requestJson('GET', '/api/auth/login/partner/google');
    const callback = await requestJson('GET', '/api/auth/login/partner/google/callback?code=abc&state=xyz');

    expect(start.response.status).toBe(302);
    expect(callback.response.status).toBe(302);
    expect(startGooglePartnerOAuth).toHaveBeenCalledTimes(1);
    expect(handleGooglePartnerOAuthCallback).toHaveBeenCalledTimes(1);
  });

  it('rejects weak registration passwords before calling the controller', async () => {
    const { response, json } = await requestJson('POST', '/api/auth/register', {
      email: 'user@example.com',
      password: 'weak',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('routes valid registration input to the register controller', async () => {
    const { response, json } = await requestJson('POST', '/api/auth/register', {
      email: 'user@example.com',
      password: 'StrongPass1!',
      firstName: 'Test',
      lastName: 'User',
      phone: '9876543210',
    });

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('routes refresh-token without requiring bearer auth', async () => {
    const { response, json } = await requestJson('POST', '/api/auth/refresh-token');

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('rejects /me without authentication', async () => {
    const { response, json } = await requestJson('GET', '/api/auth/me');

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(getMe).not.toHaveBeenCalled();
  });

  it('allows /me with authentication', async () => {
    const { response, json } = await requestJson(
      'GET',
      '/api/auth/me',
      undefined,
      { authorization: 'Bearer valid-token' },
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(getMe).toHaveBeenCalledTimes(1);
  });
});
