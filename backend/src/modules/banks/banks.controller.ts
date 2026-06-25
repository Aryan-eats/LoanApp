import { Request, Response } from 'express';
import { basePrisma } from '../../shared/db/prisma.js';
import { cacheWrap, cacheDelete } from '../../shared/utils/cache.js';
import { logAuditEvent } from '../audit/auditLogger.js';

// -- Banks -------------------------------------------------------------------

export const listBanks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const banks = await cacheWrap(
      'banks:all',
      () => basePrisma.bank.findMany({ include: { commissionRates: true }, orderBy: { name: 'asc' } }),
      300 // 5-minute TTL
    );
    res.status(200).json({ success: true, count: banks.length, data: { banks } });
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBank = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const bank = await cacheWrap(
      `banks:id:${id}`,
      () => basePrisma.bank.findUnique({ where: { id }, include: { commissionRates: true } }),
      300
    );
    if (!bank) {
      res.status(404).json({ success: false, message: 'Bank not found' });
      return;
    }
    res.status(200).json({ success: true, data: { bank } });
  } catch (error) {
    console.error('Get bank error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const toggleBankStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body as { status: 'active' | 'inactive' };

    if (!status || !['active', 'inactive'].includes(status)) {
      res.status(400).json({ success: false, message: 'status must be "active" or "inactive"' });
      return;
    }

    let bank;
    try {
      bank = await basePrisma.bank.update({
        where: { id },
        data: { status },
        include: { commissionRates: true },
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Bank not found' });
        return;
      }
      throw err;
    }

    res.status(200).json({ success: true, message: `Bank ${status === 'active' ? 'activated' : 'deactivated'}`, data: { bank } });

    await cacheDelete('banks:all', `banks:id:${id}`);

    await logAuditEvent('BANK_STATUS_CHANGED', req, {
      userId: req.user?.id,
      entityId: id,
      entityType: 'bank',
      metadata: { status },
    });
  } catch (error) {
    console.error('Toggle bank status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateBank = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const {
      name, code, status, supportedLoanTypes,
      interestRateMin, interestRateMax, processingFee,
      maxTenure, minAmount, maxAmount, processingTime,
      isPopular, features, avgTat, activeLeads,
      approvalRate, totalDisbursed, contactPerson,
      contactEmail, contactPhone, commissionRates,
    } = req.body;

    // Build update data - only include fields that were sent
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (status !== undefined) updateData.status = status;
    if (supportedLoanTypes !== undefined) updateData.supportedLoanTypes = supportedLoanTypes;
    if (interestRateMin !== undefined) updateData.interestRateMin = interestRateMin;
    if (interestRateMax !== undefined) updateData.interestRateMax = interestRateMax;
    if (processingFee !== undefined) updateData.processingFee = processingFee;
    if (maxTenure !== undefined) updateData.maxTenure = maxTenure;
    if (minAmount !== undefined) updateData.minAmount = minAmount;
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount;
    if (processingTime !== undefined) updateData.processingTime = processingTime;
    if (isPopular !== undefined) updateData.isPopular = isPopular;
    if (features !== undefined) updateData.features = features;
    if (avgTat !== undefined) updateData.avgTat = avgTat;
    if (activeLeads !== undefined) updateData.activeLeads = activeLeads;
    if (approvalRate !== undefined) updateData.approvalRate = approvalRate;
    if (totalDisbursed !== undefined) updateData.totalDisbursed = totalDisbursed;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;

    // Use transaction to atomically update bank + replace commission rates
    const bank = await basePrisma.$transaction(async (tx) => {
      const updated = await tx.bank.update({ where: { id }, data: updateData });

      if (Array.isArray(commissionRates)) {
        await tx.bankCommissionRate.deleteMany({ where: { bankId: id } });
        if (commissionRates.length > 0) {
          await tx.bankCommissionRate.createMany({
            data: commissionRates.map((r: { loanType: string; partnerCommission: number; interestRate?: string; maxAmount?: number; minAmount?: number; maxTenure?: number }) => ({
              bankId: id,
              loanType: r.loanType,
              partnerCommission: r.partnerCommission,
              interestRate: r.interestRate ?? null,
              maxAmount: r.maxAmount ?? null,
              minAmount: r.minAmount ?? null,
              maxTenure: r.maxTenure ?? null,
            })),
          });
        }
      }

      return tx.bank.findUnique({
        where: { id: updated.id },
        include: { commissionRates: true },
      });
    });

    if (!bank) {
      res.status(404).json({ success: false, message: 'Bank not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Bank updated successfully', data: { bank } });

    await cacheDelete('banks:all', `banks:id:${id}`);

    await logAuditEvent('BANK_UPDATED', req, {
      userId: req.user?.id,
      entityId: id,
      entityType: 'bank',
      metadata: {
        updatedFields: Object.keys(updateData),
        commissionRatesUpdated: Array.isArray(commissionRates),
      },
    });

    if (Array.isArray(commissionRates)) {
      await logAuditEvent('COMMISSION_RATE_CHANGED', req, {
        userId: req.user?.id,
        entityId: id,
        entityType: 'bank',
        metadata: {
          ratesCount: commissionRates.length,
          loanTypes: commissionRates.map((r: { loanType: string }) => r.loanType),
        },
      });
    }
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ success: false, message: 'Bank not found' });
      return;
    }
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, message: 'Bank code already exists' });
      return;
    }
    console.error('Update bank error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
