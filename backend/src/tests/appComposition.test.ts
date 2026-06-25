import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import app from '../app.js';

describe('Express app composition', () => {
  it('serves health checks when imported without starting the production server', async () => {
    const server = app.listen(0);
    const address = server.address() as AddressInfo;

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
      const json = await response.json() as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(json).toMatchObject({
        success: true,
        message: 'Server is running',
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
