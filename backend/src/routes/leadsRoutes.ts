import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { body } from 'express-validator';
import prisma from '../config/prisma.js';
import { matchLeadOffers } from '../services/bankMatchingService.js';
import { validateUUID } from '../middleware/validateUUID.js';
import { handleValidationErrors } from '../middleware/validators.js';

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

const getSystemPartnerId = (): string | null => {
  const id = process.env.SYSTEM_PARTNER_ID;
  return id && id.trim().length > 0 ? id : null;
};

const LEAD_TOKEN_SECRET = process.env.LEAD_TOKEN_SECRET || 'change-me-lead-token-secret';

/** Generate a short-lived HMAC token tied to a specific lead ID. */
const generateLeadToken = (leadId: string): string =>
  crypto.createHmac('sha256', LEAD_TOKEN_SECRET).update(leadId).digest('hex');

/** Verify that a token matches the expected HMAC for the given lead ID. */
const verifyLeadToken = (leadId: string, token: string): boolean => {
  const expected = generateLeadToken(leadId);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
};

router.post('/', ...validatePublicLead, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fullName,
      phone,
      email,
      city,
      loanType,
      loanAmount,
      employmentType,
    } = req.body;

    // Strip commas from Indian-formatted numbers (e.g., 5,00,000)
    const parsedLoanAmount = Number(String(loanAmount).replace(/,/g, ''));
    if (!Number.isFinite(parsedLoanAmount) || parsedLoanAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'loanAmount must be a valid positive number',
      });
      return;
    }

    const systemPartnerId = getSystemPartnerId();
    if (!systemPartnerId) {
      res.status(500).json({
        success: false,
        message: 'System partner is not configured',
      });
      return;
    }

    const lead = await prisma.lead.create({
      data: {
        clientFullName: fullName,
        clientPhone: phone,
        clientEmail: email || null,
        clientCity: city || null,
        clientEmployment: employmentType || null,
        loanType,
        loanAmount: parsedLoanAmount,
        status: 'submitted',
        partnerId: systemPartnerId,
        partnerName: 'Website Direct',
        encryptionVersion: 1,
        timeline: {
          create: {
            status: 'submitted',
            timestamp: new Date(),
            updatedBy: 'Website',
            note: 'Lead submitted via website form',
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Lead submitted successfully',
      data: { lead, leadToken: generateLeadToken(lead.id) },
    });
  } catch (error) {
    console.error('Create public lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit lead. Please try again.',
    });
  }
});

router.post('/match-offers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanType, loanSubType, loanAmount } = req.body as {
      loanType?: string;
      loanSubType?: string;
      loanAmount?: number;
    };

    if ((!loanType || loanType.trim().length === 0) && (!loanSubType || loanSubType.trim().length === 0)) {
      res.status(400).json({
        success: false,
        message: 'loanType or loanSubType is required',
      });
      return;
    }

    if (loanAmount !== undefined) {
      const parsedLoanAmount = Number(loanAmount);
      if (!Number.isFinite(parsedLoanAmount) || parsedLoanAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'loanAmount must be a valid positive number',
        });
        return;
      }
    }

    const data = await matchLeadOffers({
      loanType,
      loanSubType,
      loanAmount: loanAmount !== undefined ? Number(loanAmount) : undefined,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Match offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to match bank offers. Please try again.',
    });
  }
});

// Public route - allows setting preferred bank for recently created leads (within 1 hour)
// This is used by the BestOffers page after a user submits a lead and selects a bank
router.patch('/:id/preferred-bank', validateUUID, async (req: Request, res: Response): Promise<void> => {
  try {
    const { preferredBank } = req.body;
    const leadId = req.params.id as string;

    if (!preferredBank) {
      res.status(400).json({
        success: false,
        message: 'Preferred bank is required',
      });
      return;
    }

    // First check if the lead exists and was created recently
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!existingLead) {
      res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
      return;
    }

    // Verify signed lead token from header
    const leadToken = req.headers['x-lead-token'] as string | undefined;
    if (!leadToken || !verifyLeadToken(leadId, leadToken)) {
      res.status(403).json({
        success: false,
        message: 'Invalid or missing lead token',
      });
      return;
    }

    // Additional time-window check: only allow within 1 hour of creation
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (existingLead.createdAt < oneHourAgo) {
      res.status(403).json({
        success: false,
        message: 'Preferred bank can only be set within 1 hour of lead submission. Please contact support.',
      });
      return;
    }

    // Update the lead (errors here are real DB errors, not "not found")
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: { preferredBank },
    });

    res.status(200).json({
      success: true,
      message: 'Preferred bank updated successfully',
      data: { lead },
    });
  } catch (error) {
    console.error('Update preferred bank error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferred bank. Please try again.',
    });
  }
});

export default router;
