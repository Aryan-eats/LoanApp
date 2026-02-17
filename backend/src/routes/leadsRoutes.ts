import { Router, Request, Response } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

const getSystemPartnerId = (): string | null => {
  const id = process.env.SYSTEM_PARTNER_ID;
  return id && id.trim().length > 0 ? id : null;
};

router.post('/', async (req: Request, res: Response): Promise<void> => {
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

    if (!fullName || !phone || !loanType || !loanAmount) {
      res.status(400).json({
        success: false,
        message: 'Please provide fullName, phone, loanType, and loanAmount',
      });
      return;
    }

    // Validate loanAmount is a valid positive number
    const parsedLoanAmount = Number(loanAmount);
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
        clientEmail: email || 'not-provided@website.lead',
        clientCity: city || null,
        clientEmployment: employmentType || null,
        loanType,
        loanAmount: parsedLoanAmount,
        status: 'submitted',
        partnerId: systemPartnerId,
        partnerName: 'Website Direct',
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
      data: { lead },
    });
  } catch (error) {
    console.error('Create public lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit lead. Please try again.',
    });
  }
});

// Public route - allows setting preferred bank for recently created leads (within 1 hour)
// This is used by the BestOffers page after a user submits a lead and selects a bank
router.patch('/:id/preferred-bank', async (req: Request, res: Response): Promise<void> => {
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

    // Security check: only allow updating preferred bank for leads created within the last hour
    // This prevents unauthorized updates to old leads while allowing the legitimate flow
    // where users select their preferred bank immediately after form submission
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
