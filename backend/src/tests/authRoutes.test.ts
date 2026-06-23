import express from 'express';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const noOp = (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();

const register = vi.fn((_req: express.Request, res: express.Response) => res.status(201).json({ success: true }));
const registerPartner = vi.fn((_req: express.Request, res: express.Response) => res.status(201).json({ success: true }));
const login = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
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

vi.mock('../controllers/authController.js', () => ({
  register,
  registerPartner,
  login,
  getMe,
  logout,
  refreshAccessToken,
}));

vi.mock('../controllers/otpController.js', () => ({
  sendOTP,
  verifyOTP,
  verifyMsg91OTP,
  msg91SendOTP,
  msg91VerifyOTP,
  msg91ResendOTP,
}));

vi.mock('../controllers/passwordController.js', () => ({
  forgotPassword,
  resetPassword,
}));

vi.mock('../middleware/rateLimiter.js', () => ({
  loginLimiter: noOp,
  registerLimiter: noOp,
  passwordResetLimiter: noOp,
  otpLimiter: noOp,
  refreshLimiter: noOp,
}));

vi.mock('../middleware/auth.js', () => ({
  optionalAuth: noOp,
  protect: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Not authorized' });
  },
}));

const authRoutes = (await import('../routes/authRoutes.js')).default;

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
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json() as JsonObject;
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

  it('rejects invalid login input before calling the controller', async () => {
    const { response, json } = await requestJson('POST', '/api/auth/login', {
      email: 'not-an-email',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Validation failed');
    expect(login).not.toHaveBeenCalled();
  });

  it('routes valid login input to the login controller', async () => {
    const { response, json } = await requestJson('POST', '/api/auth/login', {
      email: 'user@example.com',
      password: 'StrongPass1!',
    });

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(login).toHaveBeenCalledTimes(1);
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
