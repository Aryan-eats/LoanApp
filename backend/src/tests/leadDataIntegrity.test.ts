/**
 * Fintech: Loan lead data formatting & edge-case tests.
 *
 * Ensures formatLeadResponse handles nullable fields, numeric
 * coercions, and edge-case loan amounts correctly — critical
 * for financial calculations shown to partners and admins.
 */

import { describe, it, expect } from 'vitest';
import { formatLeadResponse } from '../utils/leadHelpers.js';

// ---------------------------------------------------------------------------
// Helpers – build mock lead objects
// ---------------------------------------------------------------------------

function buildMinimalLead(overrides = {}): any {
  return {
    id: 'lead-1',
    clientFullName: null,
    clientPhone: null,
    clientEmail: null,
    clientDateOfBirth: null,
    clientPanNumber: null,
    clientAadhaar: null,
    clientEmployment: null,
    clientIncome: null,
    clientCompany: null,
    clientExperience: null,
    clientCity: null,
    clientPincode: null,
    loanType: 'home-loan',
    loanAmount: '500000',
    tenure: null,
    sanctionedAmount: null,
    disbursedAmount: null,
    interestRate: null,
    emi: null,
    status: 'submitted',
    bankAssigned: null,
    bankCode: null,
    bankLogo: null,
    preferredBank: null,
    partnerId: null,
    partnerName: null,
    isEligible: null,
    maxLoanAmount: null,
    minLoanAmount: null,
    estimatedEMI: null,
    eligibilityCheckedAt: null,
    commissionAmount: null,
    commissionRate: null,
    commissionStatus: null,
    commissionPaidAt: null,
    documents: [],
    timeline: [],
    createdAt: new Date('2025-06-15T10:00:00Z'),
    updatedAt: new Date('2025-06-15T12:00:00Z'),
    ...overrides,
  };
}

function buildFullLead(): any {
  return buildMinimalLead({
    clientFullName: 'Rajesh Kumar',
    clientPhone: '9876543210',
    clientEmail: 'rajesh@example.com',
    clientDateOfBirth: '1990-05-15',
    clientPanNumber: 'ABCDE1234F',
    clientAadhaar: '123456789012',
    clientEmployment: 'salaried',
    clientIncome: '75000',
    clientCompany: 'Infosys',
    clientExperience: '5 years',
    clientCity: 'Mumbai',
    clientPincode: '400001',
    loanType: 'home-loan',
    loanAmount: '5000000',
    tenure: '20',
    sanctionedAmount: '4500000',
    disbursedAmount: '4500000',
    interestRate: '8.5',
    emi: '38000',
    bankAssigned: 'HDFC Bank',
    bankCode: 'HDFC',
    bankLogo: 'hdfc-logo.png',
    preferredBank: 'HDFC Bank',
    partnerId: 'partner-1',
    partnerName: 'Finance Partners Ltd',
    isEligible: true,
    maxLoanAmount: '6000000',
    minLoanAmount: '1000000',
    estimatedEMI: '42000',
    eligibilityCheckedAt: new Date('2025-06-15T11:00:00Z'),
    commissionAmount: '50000',
    commissionRate: '1.0',
    commissionStatus: 'paid',
    commissionPaidAt: new Date('2025-06-20T10:00:00Z'),
    documents: [
      {
        id: 'doc-1',
        type: 'aadhaar',
        fileName: 'aadhaar.pdf',
        fileSize: 1024,
        fileUrl: 'https://example.com/doc',
        mimeType: 'application/pdf',
        uploadedBy: 'partner-1',
        r2ObjectKey: 'users/partner-1/documents/aadhaar.pdf',
        uploadedAt: new Date('2025-06-15T10:30:00Z'),
        status: 'uploaded',
        rejectionReason: null,
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        status: 'submitted',
        timestamp: new Date('2025-06-15T10:00:00Z'),
        note: 'Lead submitted',
        updatedBy: 'partner-1',
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Minimal lead – all nullable fields null or empty
// ---------------------------------------------------------------------------

describe('formatLeadResponse – minimal lead (nullable edge cases)', () => {
  const result = formatLeadResponse(buildMinimalLead());

  it('does not crash with all-null optional fields', () => {
    expect(result).toBeDefined();
    expect(result.id).toBe('lead-1');
  });

  it('provides fallback for missing client name', () => {
    expect(result.client.fullName).toBe('Unknown');
  });

  it('provides empty string for missing phone and email', () => {
    expect(result.client.phone).toBe('');
    expect(result.client.email).toBe('');
  });

  it('coerces loanAmount to number', () => {
    expect(result.loanAmount).toBe(500000);
    expect(typeof result.loanAmount).toBe('number');
  });

  it('omits eligibilityResult when all eligibility fields are null', () => {
    expect(result.eligibilityResult).toBeUndefined();
  });

  it('omits commission when all commission fields are null', () => {
    expect(result.commission).toBeUndefined();
  });

  it('returns empty arrays for documents and timeline', () => {
    expect(result.documents).toEqual([]);
    expect(result.timeline).toEqual([]);
  });

  it('formats createdAt as date-only string', () => {
    expect(result.createdAt).toBe('2025-06-15');
  });

  it('falls back to "SYSTEM" for missing partnerId', () => {
    expect(result.partnerId).toBe('SYSTEM');
  });

  it('falls back to "Website Direct" for missing partnerName', () => {
    expect(result.partnerName).toBe('Website Direct');
  });
});

// ---------------------------------------------------------------------------
// Full lead – all fields populated
// ---------------------------------------------------------------------------

describe('formatLeadResponse – full lead', () => {
  const result = formatLeadResponse(buildFullLead());

  it('maps client fields correctly', () => {
    expect(result.client.fullName).toBe('Rajesh Kumar');
    expect(result.client.phone).toBe('9876543210');
    expect(result.client.email).toBe('rajesh@example.com');
    expect(result.client.city).toBe('Mumbai');
  });

  it('coerces all financial amounts to numbers', () => {
    expect(typeof result.loanAmount).toBe('number');
    expect(result.loanAmount).toBe(5000000);
    expect(typeof result.sanctionedAmount).toBe('number');
    expect(typeof result.disbursedAmount).toBe('number');
    expect(typeof result.interestRate).toBe('number');
    expect(result.interestRate).toBe(8.5);
    expect(typeof result.emi).toBe('number');
  });

  it('includes eligibilityResult when eligibility data exists', () => {
    expect(result.eligibilityResult).toBeDefined();
    expect(result.eligibilityResult!.isEligible).toBe(true);
    expect(typeof result.eligibilityResult!.maxLoanAmount).toBe('number');
    expect(typeof result.eligibilityResult!.estimatedEMI).toBe('number');
  });

  it('includes commission when commission data exists', () => {
    expect(result.commission).toBeDefined();
    expect(typeof result.commission!.amount).toBe('number');
    expect(typeof result.commission!.rate).toBe('number');
    expect(result.commission!.status).toBe('paid');
  });

  it('maps documents with all fields', () => {
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].type).toBe('aadhaar');
    expect(result.documents[0].fileName).toBe('aadhaar.pdf');
    expect(result.documents[0].status).toBe('uploaded');
  });

  it('maps timeline entries', () => {
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].status).toBe('submitted');
    expect(result.timeline[0].note).toBe('Lead submitted');
  });
});

// ---------------------------------------------------------------------------
// Fintech edge cases – financial calculations
// ---------------------------------------------------------------------------

describe('formatLeadResponse – financial edge cases', () => {
  it('handles zero loan amount', () => {
    const result = formatLeadResponse(buildMinimalLead({ loanAmount: '0' }));
    expect(result.loanAmount).toBe(0);
    expect(typeof result.loanAmount).toBe('number');
  });

  it('handles very large loan amount (crore-scale)', () => {
    // 10 crore = 100 million
    const result = formatLeadResponse(buildMinimalLead({ loanAmount: '100000000' }));
    expect(result.loanAmount).toBe(100000000);
  });

  it('handles decimal loan amount', () => {
    const result = formatLeadResponse(buildMinimalLead({ loanAmount: '500000.50' }));
    expect(result.loanAmount).toBe(500000.50);
  });

  it('handles negative sanctioned amount (should still coerce)', () => {
    const result = formatLeadResponse(buildMinimalLead({ sanctionedAmount: '-100000' }));
    expect(result.sanctionedAmount).toBe(-100000);
    expect(typeof result.sanctionedAmount).toBe('number');
  });

  it('handles interest rate edge cases', () => {
    // Very high interest rate
    const high = formatLeadResponse(buildMinimalLead({ interestRate: '36.0' }));
    expect(high.interestRate).toBe(36.0);

    // Zero interest rate
    const zero = formatLeadResponse(buildMinimalLead({ interestRate: '0' }));
    expect(zero.interestRate).toBe(0);
  });

  it('eligibility shows isEligible=false when field is false', () => {
    const result = formatLeadResponse(
      buildMinimalLead({ isEligible: false })
    );
    expect(result.eligibilityResult).toBeDefined();
    expect(result.eligibilityResult!.isEligible).toBe(false);
  });

  it('handles clientIncome coercion to number', () => {
    const result = formatLeadResponse(
      buildMinimalLead({ clientIncome: '75000' })
    );
    expect(result.client.monthlyIncome).toBe(75000);
    expect(typeof result.client.monthlyIncome).toBe('number');
  });
});
