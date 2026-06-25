import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import prisma from '../../shared/db/prisma.js';
import { logAuditEvent } from '../audit/auditLogger.js';
import {
  runSoftCheck,
  type SoftCheckBank,
  type SoftCheckInput,
} from './softCheck.service.js';

type BankRow = Prisma.BankGetPayload<object>;

const toSoftCheckBank = (bank: BankRow): SoftCheckBank => ({
  ...bank,
  interestRateMin: Number(bank.interestRateMin.toString()),
  interestRateMax: Number(bank.interestRateMax.toString()),
  minAmount: Number(bank.minAmount.toString()),
  maxAmount: Number(bank.maxAmount.toString()),
});

export const runPartnerSoftCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;

    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }

    const { storedClientId, leadId, consentCredit } = req.body as {
      storedClientId?: string;
      leadId?: string;
      consentCredit?: boolean;
    };

    if (consentCredit !== true) {
      res.status(400).json({ success: false, message: 'Soft check consent is required' });
      return;
    }

    const [storedClient, lead] = await Promise.all([
      storedClientId
        ? prisma.partnerData.findFirst({ where: { id: storedClientId, partnerOrgId } })
        : Promise.resolve(null),
      leadId
        ? prisma.lead.findFirst({ where: { id: leadId, partnerOrgId } })
        : Promise.resolve(null),
    ]);

    if (storedClientId && !storedClient) {
      res.status(404).json({ success: false, message: 'Stored client not found' });
      return;
    }

    if (leadId && !lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const input: SoftCheckInput = {
      fullName: storedClient?.fullName ?? lead?.clientFullName ?? String(req.body.fullName ?? ''),
      phone: storedClient?.phone ?? lead?.clientPhone ?? String(req.body.phone ?? ''),
      monthlyIncome: Number(storedClient?.monthlyIncome ?? lead?.clientIncome ?? req.body.monthlyIncome ?? 0),
      existingEMI: Number(req.body.existingEMI ?? 0),
      employmentType:
        storedClient?.employmentType ?? lead?.clientEmployment ?? String(req.body.employmentType ?? ''),
      loanType: storedClient?.loanType ?? lead?.loanType ?? String(req.body.loanType ?? ''),
      loanAmount: Number(storedClient?.loanAmount ?? lead?.loanAmount ?? req.body.loanAmount ?? 0),
      consentCredit: true,
    };

    if (!input.fullName || !input.phone || !input.employmentType || !input.loanType || input.monthlyIncome <= 0 || input.loanAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'fullName, phone, monthlyIncome, employmentType, loanType and loanAmount are required',
      });
      return;
    }

    const banks = (await prisma.bank.findMany({ where: { status: 'active' } })).map(toSoftCheckBank);
    const result = runSoftCheck({ input, banks });

    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          isEligible: result.isEligible,
          maxLoanAmount: result.maxLoanAmount,
          minLoanAmount: result.minLoanAmount,
          estimatedEMI: result.estimatedEMI,
          eligibilityCheckedAt: new Date(),
        },
      });
    }

    await logAuditEvent('LEAD_UPDATED', req, {
      userId: req.user!.id,
      entityId: lead?.id ?? storedClient?.id ?? undefined,
      entityType: lead ? 'lead' : storedClient ? 'stored_client' : 'soft_check',
      metadata: {
        action: 'soft_check',
        creditImpact: 'none',
        checkType: 'soft',
        partnerOrgId,
      },
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('runPartnerSoftCheck error:', err);
    res.status(500).json({ success: false, message: 'Failed to run soft check' });
  }
};
