import { describe, expect, it } from 'vitest';
import * as partners from '../modules/partners/partners.controller.js';
import partnerRoutes from '../modules/partners/partners.routes.js';
import * as partnerData from '../modules/partner-data/partnerData.controller.js';
import partnerDataRoutes from '../modules/partner-data/partnerData.routes.js';
import * as consent from '../modules/partner-data/consent.service.js';
import * as context from '../shared/middleware/partnerContext.js';

describe('partner capability modules', () => {
  it('exposes partner management, partner data, consent, and partner context', () => {
    expect(partners.getPartners).toBeTypeOf('function');
    expect(partnerRoutes).toBeDefined();
    expect(partnerData.getStoredClients).toBeTypeOf('function');
    expect(partnerDataRoutes).toBeDefined();
    expect(consent.grantAccess).toBeTypeOf('function');
    expect(context.resolvePartnerOrg).toBeTypeOf('function');
  });
});
