import express from 'express';
import type { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProfile = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const updateProfile = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const updatePassword = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
const deleteAccount = vi.fn((_req: express.Request, res: express.Response) => res.status(200).json({ success: true }));
type JsonObject = Record<string, any>;

vi.mock('../controllers/profileController.js', () => ({
  getProfile,
  updateProfile,
  updatePassword,
  deleteAccount,
}));

vi.mock('../middleware/auth.js', () => ({
  protect: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      next();
      return;
    }
    res.status(401).json({ success: false, message: 'Not authorized' });
  },
}));

const profileRoutes = (await import('../routes/profileRoutes.js')).default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/profile', profileRoutes);
  return app;
};

const requestJson = async (
  method: 'GET' | 'PUT' | 'DELETE',
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

const authHeader = { authorization: 'Bearer valid-token' };

describe('profile routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication for profile access', async () => {
    const { response, json } = await requestJson('GET', '/api/profile');

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('routes authenticated profile access to the controller', async () => {
    const { response, json } = await requestJson('GET', '/api/profile', undefined, authHeader);

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid profile update input before calling the controller', async () => {
    const { response, json } = await requestJson(
      'PUT',
      '/api/profile',
      { firstName: 'A'.repeat(51), phone: '123' },
      authHeader,
    );

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Validation failed');
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('routes valid profile updates to the controller', async () => {
    const { response, json } = await requestJson(
      'PUT',
      '/api/profile',
      { firstName: 'Asha', lastName: 'Kumar', phone: '9876543210' },
      authHeader,
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(updateProfile).toHaveBeenCalledTimes(1);
  });

  it('rejects weak password updates before calling the controller', async () => {
    const { response, json } = await requestJson(
      'PUT',
      '/api/profile/password',
      { currentPassword: 'CurrentPass1!', newPassword: 'weak' },
      authHeader,
    );

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('routes valid password updates to the controller', async () => {
    const { response, json } = await requestJson(
      'PUT',
      '/api/profile/password',
      { currentPassword: 'CurrentPass1!', newPassword: 'NewStrongPass1!' },
      authHeader,
    );

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(updatePassword).toHaveBeenCalledTimes(1);
  });

  it('routes authenticated account deletion to the controller', async () => {
    const { response, json } = await requestJson('DELETE', '/api/profile', undefined, authHeader);

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(deleteAccount).toHaveBeenCalledTimes(1);
  });
});
