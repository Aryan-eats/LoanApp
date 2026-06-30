import { Router } from 'express';
import { resolvePartnerOrg } from '../../shared/middleware/partnerContext.js';
import { validateSoftCheckRequest } from '../../shared/middleware/softCheckValidation.js';
import { protect, authorize } from '../../shared/middleware/auth.js';
import { requireApprovedPartnerOnboarding } from '../../shared/middleware/onboarding.js';
import { validateUUID } from '../../shared/middleware/validateUUID.js';
import { softCheckLimiter } from '../../shared/middleware/rateLimiter.js';
import { runPartnerSoftCheck } from './softCheck.controller.js';

const router = Router();

router.use(protect);
router.use(authorize('partner'));
router.use(requireApprovedPartnerOnboarding);
router.use(resolvePartnerOrg);
router.use(softCheckLimiter);
router.use(validateUUID);
router.post('/', validateSoftCheckRequest, runPartnerSoftCheck);

export default router;
