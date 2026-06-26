import { Router } from 'express';
import { body } from 'express-validator';
import { validateUUIDParam } from '../../shared/middleware/validateUUID.js';
import { handleValidationErrors } from '../../shared/middleware/validators.js';
import {
  createPublicLead,
  matchOffers,
  updatePreferredBank,
} from './lead.controller.js';

// --------------------------------
// Public lead payload validators
// --------------------------------
const validatePublicLead = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .escape(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\d{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('loanAmount')
    .notEmpty()
    .withMessage('Loan amount is required')
    .custom((value: string | number) => {
      const stripped = String(value).replace(/,/g, '');
      const num = Number(stripped);
      if (!Number.isFinite(num) || num <= 0) {
        throw new Error('Loan amount must be a valid positive number');
      }
      return true;
    }),
  body('loanType')
    .trim()
    .notEmpty()
    .withMessage('Loan type is required'),
  body('employmentType')
    .optional()
    .trim()
    .escape(),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters')
    .escape(),
  handleValidationErrors,
];

const router = Router();
router.param('id', validateUUIDParam);

router.post('/', ...validatePublicLead, createPublicLead);
router.post('/match-offers', matchOffers);

// Public route - allows setting preferred bank for recently created leads (within 1 hour)
// This is used by the BestOffers page after a user submits a lead and selects a bank
router.patch('/:id/preferred-bank', updatePreferredBank);

export default router;
