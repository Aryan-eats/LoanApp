import { Router } from 'express';
import { resolvePartnerOrg } from '../../middleware/rlsContext.js';
import { protect, authorize } from '../../shared/middleware/auth.js';
import { validateUUID } from '../../shared/middleware/validateUUID.js';
import { runPartnerSoftCheck } from './softCheck.controller.js';

const router = Router();

router.use(protect);
router.use(authorize('partner'));
router.use(resolvePartnerOrg);
router.use(validateUUID);
router.post('/', runPartnerSoftCheck);

export default router;
