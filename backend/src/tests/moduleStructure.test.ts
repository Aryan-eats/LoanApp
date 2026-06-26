import { describe, expect, it } from 'vitest';
import * as profileController from '../modules/profile/profile.controller.js';
import profileRoutes from '../modules/profile/profile.routes.js';
import * as softCheckController from '../modules/soft-check/softCheck.controller.js';
import softCheckRoutes from '../modules/soft-check/softCheck.routes.js';
import * as softCheckService from '../modules/soft-check/softCheck.service.js';

describe('small backend modules', () => {
  it('exposes profile and soft-check through module-local files', () => {
    expect(profileController.getProfile).toBeTypeOf('function');
    expect(profileRoutes).toBeDefined();
    expect(softCheckController.runPartnerSoftCheck).toBeTypeOf('function');
    expect(softCheckRoutes).toBeDefined();
    expect(softCheckService.runSoftCheck).toBeTypeOf('function');
  });
});
