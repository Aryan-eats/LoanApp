import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updatePassword,
  deleteAccount,
} from './profile.controller.js';
import { protect } from '../../shared/middleware/auth.js';
import {
  validateProfileUpdate,
  validatePasswordUpdate,
} from '../../shared/middleware/validators.js';

const router = Router();

// All routes are protected
router.use(protect);

// Profile routes
router.get('/', getProfile);
router.put('/', validateProfileUpdate, updateProfile);
router.put('/password', validatePasswordUpdate, updatePassword);
router.delete('/', deleteAccount);

export default router;
