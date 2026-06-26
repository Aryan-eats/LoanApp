import type { Lead, LeadDocument, LeadTimeline, Prisma } from '@prisma/client';
import {
  computeLeadScore,
  deriveCustomerIdentity,
  deriveLeadSource,
  scoreBandForLeadScore,
  summarizeConsentGrants,
  type ConsentGrantLike,
} from '../../utils/crmHelpers.js';

type LeadWithRelations = Lead & {
  documents: LeadDocument[];
  timeline: LeadTimeline[];
  consentGrants?: ConsentGrantLike[] | null;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const formatLeadResponse = (lead: LeadWithRelations) => {
  const customerIdentity = deriveCustomerIdentity({
    id: lead.id,
    partnerId: lead.partnerId,
    sourcePartnerDataId: lead.sourcePartnerDataId,
    phone: lead.clientPhone,
    email: lead.clientEmail,
    panNumber: lead.clientPanNumber,
  });

  const consentSummary = summarizeConsentGrants(lead.consentGrants ?? null);
  const leadScore = computeLeadScore({
    id: lead.id,
    partnerId: lead.partnerId,
    sourcePartnerDataId: lead.sourcePartnerDataId,
    phone: lead.clientPhone,
    email: lead.clientEmail,
    panNumber: lead.clientPanNumber,
    employmentType: lead.clientEmployment ?? null,
    monthlyIncome: lead.clientIncome ?? null,
    companyName: lead.clientCompany ?? null,
    city: lead.clientCity ?? null,
    pincode: lead.clientPincode ?? null,
    documentsCount: lead.documents?.length ?? 0,
    consentGrants: lead.consentGrants ?? null,
  });
  const scoreBand = scoreBandForLeadScore(leadScore);
  const leadSource = deriveLeadSource(lead.sourcePartnerDataId);

  const eligibilityResult =
    lead.isEligible !== null ||
    lead.maxLoanAmount !== null ||
    lead.minLoanAmount !== null ||
    lead.estimatedEMI !== null ||
    lead.eligibilityCheckedAt !== null
      ? {
          isEligible: lead.isEligible ?? false,
          maxLoanAmount: lead.maxLoanAmount ? Number(lead.maxLoanAmount) : undefined,
          minLoanAmount: lead.minLoanAmount ? Number(lead.minLoanAmount) : undefined,
          estimatedEMI: lead.estimatedEMI ? Number(lead.estimatedEMI) : undefined,
          checkedAt: lead.eligibilityCheckedAt?.toISOString(),
        }
      : undefined;

  const commission =
    lead.commissionAmount !== null ||
    lead.commissionRate !== null ||
    lead.commissionStatus !== null ||
    lead.commissionPaidAt !== null
      ? {
          amount: lead.commissionAmount ? Number(lead.commissionAmount) : undefined,
          rate: lead.commissionRate ? Number(lead.commissionRate) : undefined,
          status: lead.commissionStatus || undefined,
          paidAt: lead.commissionPaidAt?.toISOString(),
        }
      : undefined;

  const customerName = lead.clientFullName || 'Unknown';
  const customerPhone = lead.clientPhone || '';
  const customerEmail = lead.clientEmail || '';

  return {
    id: lead.id,
    customerId: customerIdentity.customerId,
    customerKey: customerIdentity.customerKey,
    leadSource,
    leadScore,
    scoreBand,
    consentSummary,
    client: {
      id: customerIdentity.customerId,
      fullName: customerName,
      phone: customerPhone,
      email: customerEmail,
      dateOfBirth: lead.clientDateOfBirth || undefined,
      panNumber: lead.clientPanNumber || undefined,
      aadhaarNumber: lead.clientAadhaar || undefined,
      employmentType: lead.clientEmployment || undefined,
      monthlyIncome: toOptionalNumber(lead.clientIncome),
      companyName: lead.clientCompany || undefined,
      workExperience: toOptionalNumber(lead.clientExperience),
      city: lead.clientCity || undefined,
      pincode: lead.clientPincode || undefined,
    },
    customerName,
    customerPhone,
    customerEmail,
    loanType: lead.loanType,
    loanAmount: Number(lead.loanAmount),
    tenure: lead.tenure || undefined,
    sanctionedAmount: lead.sanctionedAmount ? Number(lead.sanctionedAmount) : undefined,
    disbursedAmount: lead.disbursedAmount ? Number(lead.disbursedAmount) : undefined,
    interestRate: lead.interestRate ? Number(lead.interestRate) : undefined,
    emi: lead.emi ? Number(lead.emi) : undefined,
    status: lead.status,
    bankAssigned: lead.bankAssigned || undefined,
    bankCode: lead.bankCode || undefined,
    bankLogo: lead.bankLogo || undefined,
    preferredBank: lead.preferredBank || undefined,
    partnerId: lead.partnerId || 'SYSTEM',
    partnerName: lead.partnerName || 'Website Direct',
    documents: (lead.documents || []).map((doc: LeadDocument) => ({
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      fileSize: doc.fileSize || undefined,
      fileUrl: doc.fileUrl || undefined,
      mimeType: doc.mimeType || undefined,
      uploadedBy: doc.uploadedBy || undefined,
      r2ObjectKey: doc.r2ObjectKey || undefined,
      uploadedAt: doc.uploadedAt?.toISOString(),
      status: doc.status,
      rejectionReason: doc.rejectionReason || undefined,
    })),
    timeline: (lead.timeline || []).map((event: LeadTimeline) => ({
      id: event.id,
      status: event.status,
      timestamp: event.timestamp?.toISOString(),
      note: event.note || undefined,
      updatedBy: event.updatedBy,
    })),
    eligibilityResult,
    commission,
    createdAt: lead.createdAt?.toISOString().split('T')[0] || '',
    updatedAt: lead.updatedAt?.toISOString().split('T')[0] || '',
  };
};

export { computeLeadScore, deriveCustomerIdentity, deriveLeadSource, scoreBandForLeadScore, summarizeConsentGrants };

const GPSIFS_LEAD_ID_REGEX = /^GPSIFS\d+$/;
const GPSIFS_LEAD_ID_QUERY_REGEX = '^GPSIFS[0-9]+$';

type LeadIdDbClient = Pick<Prisma.TransactionClient, '$queryRaw'>;

export const isGpsifsLeadId = (value: string): boolean => GPSIFS_LEAD_ID_REGEX.test(value);

export const getNextGpsifsLeadId = async (db: LeadIdDbClient): Promise<string> => {
  const rows = await db.$queryRaw<Array<{ maxSuffix: bigint | number | string | null }>>`
    SELECT MAX(CAST(regexp_replace(id, '^GPSIFS', '') AS BIGINT)) AS "maxSuffix"
    FROM leads
    WHERE id ~ ${GPSIFS_LEAD_ID_QUERY_REGEX}
  `;

  const rawMaxSuffix = rows[0]?.maxSuffix;
  const maxSuffix =
    rawMaxSuffix == null
      ? -1
      : typeof rawMaxSuffix === 'bigint'
        ? Number(rawMaxSuffix)
        : Number(rawMaxSuffix);

  if (!Number.isSafeInteger(maxSuffix)) {
    throw new Error('Unable to determine the next GPSIFS lead ID');
  }

  return `GPSIFS${maxSuffix + 1}`;
};
