import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import adminLeadRoutes from '../modules/leads/adminLead.routes.js';
import * as leadController from '../modules/leads/lead.controller.js';
import * as leadHelpers from '../modules/leads/lead.helpers.js';
import * as leadService from '../modules/leads/lead.service.js';
import partnerLeadRoutes from '../modules/leads/partnerLead.routes.js';
import publicLeadRoutes from '../modules/leads/publicLead.routes.js';
import * as documentController from '../modules/documents/document.controller.js';
import documentRoutes from '../modules/documents/document.routes.js';
import * as documentService from '../modules/documents/document.service.js';

describe('lead and document modules', () => {
  const oldPath = (...parts: string[]) => parts.join('/');

  it('exposes leads and documents from module-local files', () => {
    expect(publicLeadRoutes).toBeDefined();
    expect(adminLeadRoutes).toBeDefined();
    expect(partnerLeadRoutes).toBeDefined();
    expect(leadController.getLeads).toBeTypeOf('function');
    expect(leadHelpers.formatLeadResponse).toBeTypeOf('function');
    expect(leadService.generateLeadToken).toBeTypeOf('function');
    expect(documentRoutes).toBeDefined();
    expect(documentController.uploadLeadDoc).toBeTypeOf('function');
    expect(documentService.sanitiseFilename).toBeTypeOf('function');
  });

  it('removes old lead and document route/controller/service files', () => {
    expect(existsSync(oldPath('src', 'routes', 'leadsRoutes.ts'))).toBe(false);
    expect(existsSync(oldPath('src', 'routes', 'documentRoutes.ts'))).toBe(false);
    expect(existsSync(oldPath('src', 'controllers', 'leadController.ts'))).toBe(false);
    expect(existsSync(oldPath('src', 'controllers', 'documentController.ts'))).toBe(false);
    expect(existsSync(oldPath('src', 'services', 'documentService.ts'))).toBe(false);
    expect(existsSync(oldPath('src', 'utils', 'leadHelpers.ts'))).toBe(false);
    expect(existsSync(oldPath('src', 'utils', 'leadId.ts'))).toBe(false);
  });
});
