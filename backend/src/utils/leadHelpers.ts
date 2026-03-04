import type { Lead, LeadDocument, LeadTimeline } from '@prisma/client';

type LeadWithRelations = Lead & {
  documents: LeadDocument[];
  timeline: LeadTimeline[];
};

export const formatLeadResponse = (lead: LeadWithRelations) => {
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

  return {
    id: lead.id,
    client: {
      id: lead.id,
      fullName: lead.clientFullName || 'Unknown',
      phone: lead.clientPhone || '',
      email: lead.clientEmail || '',
      dateOfBirth: lead.clientDateOfBirth || undefined,
      panNumber: lead.clientPanNumber || undefined,
      aadhaarNumber: lead.clientAadhaar || undefined,
      employmentType: lead.clientEmployment || undefined,
      monthlyIncome: lead.clientIncome ? Number(lead.clientIncome) : undefined,
      companyName: lead.clientCompany || undefined,
      workExperience: lead.clientExperience || undefined,
      city: lead.clientCity || undefined,
      pincode: lead.clientPincode || undefined,
    },
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
