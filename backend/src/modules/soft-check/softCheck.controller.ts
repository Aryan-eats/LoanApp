import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import prisma from '../../shared/db/prisma.js';
import { logAuditEvent } from '../audit/auditLogger.js';
import { getSoftCheckConfiguration, persistSoftCheckDecision } from './softCheckRepository.js';
import { buildBorrowerHash, buildInputHash, buildResultChecksum } from './softCheckIntegrity.js';
import {
  getSoftCheckEngineMode,
  normalizeSoftCheckInput,
  runSoftCheckForMode,
  type SoftCheckBank,
  type SoftCheckInput,
} from './softCheck.service.js';
import { decryptLeadSoftCheckPii, decryptStoredClientSoftCheckPii } from './softCheckPiiContext.js';

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

    const { storedClientId, leadId, consentCredit, requestId: suppliedRequestId } = req.body as {
      storedClientId?: string;
      leadId?: string;
      consentCredit?: boolean;
      requestId?: string;
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

    const [storedClientForCheck, leadForCheck] = await Promise.all([
      decryptStoredClientSoftCheckPii(partnerOrgId, storedClient),
      decryptLeadSoftCheckPii(lead),
    ]).catch((error) => {
      console.error(
        'Soft-check source PII decrypt failed:',
        error instanceof Error ? error.name : 'unknown error',
      );
      return [null, null] as const;
    });

    if ((storedClient && !storedClientForCheck) || (lead && !leadForCheck)) {
      res.status(503).json({ success: false, message: 'Soft check source data unavailable' });
      return;
    }

    const input: SoftCheckInput = {
      fullName: storedClientForCheck?.fullName ?? leadForCheck?.clientFullName ?? String(req.body.fullName ?? ''),
      phone: storedClientForCheck?.phone ?? leadForCheck?.clientPhone ?? String(req.body.phone ?? ''),
      monthlyIncome: Number(storedClient?.monthlyIncome ?? lead?.clientIncome ?? req.body.monthlyIncome ?? 0),
      existingEMI: Number(req.body.existingEMI ?? 0),
      employmentType:
        storedClient?.employmentType ?? lead?.clientEmployment ?? String(req.body.employmentType ?? ''),
      loanType: storedClient?.loanType ?? lead?.loanType ?? String(req.body.loanType ?? ''),
      loanAmount: Number(storedClient?.loanAmount ?? lead?.loanAmount ?? req.body.loanAmount ?? 0),
      consentCredit: true,
      age: req.body.age === undefined ? undefined : Number(req.body.age),
      requestedTenureMonths:
        storedClient?.tenure ?? lead?.tenure ?? (
          req.body.requestedTenureMonths === undefined
            ? undefined
            : Number(req.body.requestedTenureMonths)
        ),
      propertyValue: req.body.propertyValue === undefined ? undefined : Number(req.body.propertyValue),
      propertyType: req.body.propertyType ? String(req.body.propertyType) : undefined,
      declaredCibilRange: req.body.declaredCibilRange ? String(req.body.declaredCibilRange) : undefined,
      purpose: storedClient?.loanPurpose ?? (req.body.purpose ? String(req.body.purpose) : undefined),
      cityTier: req.body.cityTier,
      residenceType: storedClient?.residenceType ?? (
        req.body.residenceType ? String(req.body.residenceType) : undefined
      ),
      businessProfile: req.body.businessProfile,
      goldProfile: req.body.goldProfile,
    };

    if (!input.fullName || !input.phone || !input.employmentType || !input.loanType || input.monthlyIncome <= 0 || input.loanAmount <= 0) {
      res.status(400).json({
        success: false,
        message: 'fullName, phone, monthlyIncome, employmentType, loanType and loanAmount are required',
      });
      return;
    }

    const engineMode = getSoftCheckEngineMode();
    const [bankRows, configurationResult] = await Promise.all([
      prisma.bank.findMany({ where: { status: 'active' } }),
      getSoftCheckConfiguration(input.loanType)
        .then((configuration) => ({ configuration, error: null }))
        .catch((error) => ({ configuration: null, error })),
    ]);
    if (configurationResult.error) {
      console.error(
        'Soft-check configuration load failed:',
        configurationResult.error instanceof Error ? configurationResult.error.message : 'unknown error',
      );
      if (engineMode === 'v2') {
        res.status(503).json({ success: false, message: 'Soft check configuration unavailable' });
        return;
      }
    }
    if (engineMode === 'v2' && !configurationResult.configuration) {
      res.status(503).json({ success: false, message: 'Soft check configuration unavailable' });
      return;
    }
    const banks = bankRows.map(toSoftCheckBank);
    const softCheckRun = runSoftCheckForMode({
      input,
      banks,
      configuration: configurationResult.configuration,
      mode: engineMode,
    });
    const result = softCheckRun.response;
    const isV2Result = 'schemaVersion' in result;
    const requestId = suppliedRequestId ?? randomUUID();
    let responseResult: typeof result | Record<string, unknown> = result;

    if (isV2Result) {
      const normalizedInput = normalizeSoftCheckInput(input);
      const inputHash = buildInputHash(normalizedInput);
      const resultPayload = { ...result, requestId };
      const checksum = buildResultChecksum({
        inputHash,
        result: resultPayload,
        ruleConfigReleaseId: result.ruleConfigReleaseId,
      });

      try {
        const persisted = await persistSoftCheckDecision({
          requestId,
          partnerOrgId,
          actorUserId: req.user!.id,
          sourceType: lead ? 'LEAD' : storedClient ? 'PARTNER_DATA' : 'RAW',
          sourceId: lead?.id ?? storedClient?.id ?? null,
          borrowerHash: buildBorrowerHash(partnerOrgId, input.phone),
          inputHash,
          normalizedInput,
          result: resultPayload,
          ruleTrace: result.auditTrail,
          ruleSetIds: [result.ruleConfigReleaseId],
          eligibilityStatus: result.eligibilityStatus,
          confidenceTier: result.confidenceTier,
          schemaVersion: result.schemaVersion,
          engineVersion: 'soft-check-engine-v2',
          consentNoticeVersion: 'soft-check-v1',
          retentionPolicyCode: 'RBI_CREDIT_DECISION_AUDIT_5Y',
          retentionUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
          checksum,
          leadUpdate: lead
            ? {
                leadId: lead.id,
                data: {
                  isEligible: result.isEligible,
                  maxLoanAmount: result.maxLoanAmount,
                  minLoanAmount: result.minLoanAmount,
                  estimatedEMI: result.estimatedEMI,
                  eligibilityCheckedAt: new Date(),
                },
              }
            : undefined,
        });

        const existingResult =
          !persisted.created &&
          persisted.record.result &&
          typeof persisted.record.result === 'object' &&
          !Array.isArray(persisted.record.result)
            ? persisted.record.result as Record<string, unknown>
            : resultPayload;
        responseResult = {
          ...existingResult,
          requestId,
          resultId: persisted.record.id,
          engineVersion: 'soft-check-engine-v2',
        } as typeof responseResult;
      } catch {
        res.status(503).json({
          success: false,
          message: 'Soft check result persistence failed',
        });
        return;
      }
    } else if (lead) {
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
        ruleConfigReleaseId:
          'ruleConfigReleaseId' in result ? result.ruleConfigReleaseId : null,
        shadowMetrics: softCheckRun.shadowMetrics ?? null,
      },
    });

    res.status(200).json({ success: true, data: responseResult });
  } catch (err) {
    console.error('runPartnerSoftCheck error:', err instanceof Error ? err.name : 'unknown error');
    res.status(500).json({ success: false, message: 'Failed to run soft check' });
  }
};
