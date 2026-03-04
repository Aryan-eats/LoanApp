/**
 * DocsReq.ts
 *
 * LIGHTWEIGHT version - types + minimal static fallback only.
 *
 * Full document requirement data now lives in the backend
 * (`lender_doc_requirements` table) and is fetched via
 * `GET /api/documents/req-docs/flat?loanCode=xxx`.
 *
 * The FALLBACK_DOCS below are used *only* when the API is
 * unreachable, keeping the frontend bundle small (~2 KB).
 *
 * @see useDocRequirements hook (src/admin/hooks/useDocRequirements.ts)
 * @see seedDocRequirements script (backend/src/scripts/seedDocRequirements.ts)
 */

// ---------------------------------------------------------------------------
// Types (kept for consumers that depend on shape)
// ---------------------------------------------------------------------------

export interface DocumentRequirement {
  id: string;
  name: string;
  description?: string | null;
  mandatory: boolean;
  acceptedFormats: string[];
  maxSizeMB: number;
}

// ---------------------------------------------------------------------------
// Minimal static fallback (standard KYC + income proof)
// ---------------------------------------------------------------------------

export const FALLBACK_DOCS: DocumentRequirement[] = [
  { id: 'pan',           name: 'PAN Card',                       description: null, mandatory: true,  acceptedFormats: ['pdf', 'jpg', 'png'], maxSizeMB: 5  },
  { id: 'aadhaar',       name: 'Aadhaar Card',                   description: null, mandatory: true,  acceptedFormats: ['pdf', 'jpg', 'png'], maxSizeMB: 5  },
  { id: 'bank_stmt_6m',  name: 'Bank Statement (Last 6 Months)', description: null, mandatory: true,  acceptedFormats: ['pdf'],               maxSizeMB: 15 },
  { id: 'income_proof',  name: 'Income Proof (Salary Slip / ITR)', description: null, mandatory: true,  acceptedFormats: ['pdf', 'jpg'],       maxSizeMB: 10 },
  { id: 'address_proof', name: 'Address Proof',                   description: null, mandatory: true,  acceptedFormats: ['pdf', 'jpg', 'png'], maxSizeMB: 5  },
  { id: 'photo',         name: 'Passport-size Photograph',        description: null, mandatory: false, acceptedFormats: ['jpg', 'png'],         maxSizeMB: 2  },
];

/**
 * Legacy helper - synchronous fallback for callers that haven't migrated
 * to the async `useDocRequirements` hook yet.
 *
 * @deprecated Use `useDocRequirements` hook instead for API-backed data.
 */
export function getRequiredDocsForLoanCode(_loanCode: string): DocumentRequirement[] {
  return FALLBACK_DOCS;
}