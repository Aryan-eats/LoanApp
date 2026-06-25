import { describe, expect, it } from 'vitest';

describe('small backend modules', () => {
  it('exposes profile and soft-check through module-local files', async () => {
    const [
      profileController,
      profileRoutes,
      softCheckController,
      softCheckRoutes,
      softCheckService,
    ] = await Promise.all([
      import('../modules/profile/profile.controller.js'),
      import('../modules/profile/profile.routes.js'),
      import('../modules/soft-check/softCheck.controller.js'),
      import('../modules/soft-check/softCheck.routes.js'),
      import('../modules/soft-check/softCheck.service.js'),
    ]);

    expect(profileController.getProfile).toBeTypeOf('function');
    expect(profileRoutes.default).toBeDefined();
    expect(softCheckController.runPartnerSoftCheck).toBeTypeOf('function');
    expect(softCheckRoutes.default).toBeDefined();
    expect(softCheckService.runSoftCheck).toBeTypeOf('function');
  });
});
