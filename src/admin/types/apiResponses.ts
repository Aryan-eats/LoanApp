/**
 * Typed API response shapes for lead-related endpoints.
 * These mirror the backend's `formatLeadResponse` output shape
 * so that frontend mappers don't need `any`.
 */

import type { LeadStatus, DocumentStatus } from './admin';

/** Timeline event as returned by the API */
export interface ApiTimelineEvent {
  id: string;
  status: LeadStatus;
  timestamp: string;
  note?: string;
  updatedBy: string;
}

/** Lead document as returned by the API */
export interface ApiLeadDocument {
  id: string;
  type: string;
  fileName: string;
  fileSize?: string;
  fileUrl?: string;
  mimeType?: string;
  r2ObjectKey?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  status: DocumentStatus;
  rejectionReason?: string;
  url?: string;
}

/** Client sub-object inside the lead response */
export interface ApiLeadClient {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  employmentType?: string;
  monthlyIncome?: number;
  companyName?: string;
  workExperience?: number;
  city?: string;
  pincode?: string;
}

/** Commission sub-object inside the lead response */
export interface ApiLeadCommission {
  amount?: number;
  rate?: number;
  status?: string;
  paidAt?: string;
}

/** Full lead response from the API (matches backend `formatLeadResponse`) */
export interface ApiLeadResponse {
  id: string;
  client: ApiLeadClient;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  loanType: string;
  loanAmount: number;
  tenure?: number;
  sanctionedAmount?: number;
  disbursedAmount?: number;
  interestRate?: number;
  emi?: number;
  status: LeadStatus;
  bankAssigned?: string;
  bankCode?: string;
  bankLogo?: string;
  preferredBank?: string;
  partnerId: string;
  partnerName: string;
  documents: ApiLeadDocument[];
  timeline: ApiTimelineEvent[];
  commission?: ApiLeadCommission;
  createdAt: string;
  updatedAt: string;
}
