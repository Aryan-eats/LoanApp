import { Router } from 'express';
import { resolvePartnerOrg } from '../../shared/middleware/partnerContext.js';
import { validateSoftCheckRequest } from '../../shared/middleware/softCheckValidation.js';
import { protect, authorize } from '../../shared/middleware/auth.js';
import { validateUUID } from '../../shared/middleware/validateUUID.js';
import { runPartnerSoftCheck } from './softCheck.controller.js';

const router = Router();

router.use(protect);
router.use(authorize('partner'));
router.use(resolvePartnerOrg);
router.use(validateUUID);
router.post('/', validateSoftCheckRequest, runPartnerSoftCheck);

export default router;
