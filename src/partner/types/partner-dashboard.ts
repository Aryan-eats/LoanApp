// Partner Dashboard Types
// Re-exports shared types and adds partner-specific types

import type { LoanProductCode } from '../../data/loanProductsData';

// Re-export shared types for convenience
export type {
  DocumentStatus,
  CommissionStatus,
  KYCStatus,
  TicketStatus,
  TicketPriority,
  EmploymentType,
  TimelineEvent,
} from '../../types/shared';

// Import shared types for internal use
import type {
  DocumentStatus,
  CommissionStatus,
  KYCStatus,
  TicketStatus,
  TicketPriority,
  EmploymentType,
} from '../../types/shared';

// LoanType references the canonical registry - supports all 80+ loan products
export type LoanType = LoanProductCode;

export type LeadSource =
  | 'partner'
  | 'stored_client'
  | 'website'
  | 'referral'
  | 'manual'
  | 'import'
  | 'admin'
  | 'system'
  | string;

export type CustomerScoreBand = 'low' | 'medium' | 'high' | 'unknown' | string;

export interface CustomerConsentSummary {
  dataShare: boolean;
  contact: boolean;
  terms: boolean;
  privacyPolicy?: boolean;
  recordedAt?: string;
  recordedBy?: string;
  summary?: string;
}

export interface CustomerActivityItem {
  id: string;
  type: string;
  title?: string;
  description?: string;
  timestamp: string;
  customerId?: string;
  customerKey?: string;
  leadId?: string;
  source?: LeadSource;
  actorName?: string;
  metadata?: Record<string, unknown>;
}

// Partner-specific lead status (includes draft state)
export type LeadStatus = 'draft' | 'submitted' | 'docs_pending' | 'docs_uploaded' | 'docs_collected' | 'bank_processing' | 'bank_logged' | 'approved' | 'disbursed' | 'rejected';

// Status for leads managed locally by the partner (not yet submitted to admin)
export type LocalLeadStatus = 'new' | 'contacted' | 'docs_pending' | 'docs_collected' | 'processing' | 'approved' | 'rejected' | 'closed';

// A lead stored locally on the partner's device (not sent to admin yet)
export interface LocalLead {
  id: string;
  createdAt: string;
  updatedAt: string;
  localStatus: LocalLeadStatus;
  customerId?: string;
  customerKey?: string;
  leadSource?: LeadSource;
  leadScore?: number;
  scoreBand?: CustomerScoreBand;
  consentSummary?: CustomerConsentSummary;
  activityItems?: CustomerActivityItem[];
  notes?: string;
  // Client info
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  panNumber?: string;
  employmentType?: string;
  monthlyIncome?: number;
  companyName?: string;
  designation?: string;
  workExperience?: string;
  city?: string;
  pincode?: string;
  state?: string;
  currentAddress?: string;
  residenceType?: string;
  // Loan info
  loanCategory?: string;
  loanType: LoanType;
  loanAmount: number;
  tenure?: number;
  loanPurpose?: string;
}

export interface PartnerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  partnerType: 'freelancer' | 'car_dealer' | 'property_dealer' | 'builder' | 'sub_dsa';
  partnerCode: string;
  city: string;
  state: string;
  pincode: string;
  panNumber: string;
  aadhaarNumber: string;
  businessName?: string;
  gstNumber?: string;
  kycStatus: KYCStatus;
  joinedDate: string;
  profileImage?: string;
  bankDetails: BankDetails;
}

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  isVerified: boolean;
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  panNumber: string;
  aadhaarNumber: string;
  employmentType: EmploymentType;
  monthlyIncome: number;
  companyName?: string;
  workExperience?: number;
  city: string;
  pincode: string;
  customerId?: string;
  customerKey?: string;
  leadSource?: LeadSource;
  leadScore?: number;
  scoreBand?: CustomerScoreBand;
  consentSummary?: CustomerConsentSummary;
  activityItems?: CustomerActivityItem[];
}

export interface Lead {
  id: string;
  client: Client;
  customerId?: string;
  customerKey?: string;
  leadSource?: LeadSource;
  leadScore?: number;
  scoreBand?: CustomerScoreBand;
  consentSummary?: CustomerConsentSummary;
  activityItems?: CustomerActivityItem[];
  loanType: LoanType;
  loanAmount: number;
  tenure: number;
  partnerId?: string;
  partnerName?: string;
  status: LeadStatus;
  bankAssigned?: string;
  bankCode?: string;
  bankLogo?: string;
  preferredBank?: string;
  sanctionedAmount?: number;
  disbursedAmount?: number;
  interestRate?: number;
  emi?: number;
  createdAt: string;
  updatedAt: string;
  documents: LeadDocument[];
  timeline: LeadTimelineEvent[];
  eligibilityResult?: EligibilityResult;
  commission?: LeadCommission;
}

export interface LeadDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  fileSize: string;
  uploadedAt?: string;
  status: DocumentStatus;
  rejectionReason?: string;
}

export type DocumentType = 
  | 'pan_card'
  | 'aadhaar_front'
  | 'aadhaar_back'
  | 'photo'
  | 'salary_slip_1'
  | 'salary_slip_2'
  | 'salary_slip_3'
  | 'bank_statement'
  | 'itr_1'
  | 'itr_2'
  | 'form_16'
  | 'address_proof'
  | 'property_documents'
  | 'business_proof'
  | 'gst_certificate';

export interface LeadTimelineEvent {
  id: string;
  status: LeadStatus;
  timestamp: string;
  note?: string;
  updatedBy: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  maxLoanAmount: number;
  minLoanAmount: number;
  estimatedEMI: number;
  eligibleBanks: EligibleBank[];
  factors: EligibilityFactor[];
  checkedAt: string;
}

export interface EligibleBank {
  id: string;
  name: string;
  logo?: string;
  interestRate: string;
  maxAmount: number;
  processingFee: string;
  processingTime: string;
}

export interface EligibilityFactor {
  factor: string;
  status: 'positive' | 'neutral' | 'negative';
  description: string;
}

export interface LeadCommission {
  amount: number;
  rate: number;
  status: CommissionStatus;
  paidAt?: string;
}

export interface Commission {
  id: string;
  leadId: string;
  clientName: string;
  loanType: LoanType;
  disbursedAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  bankName: string;
  disbursedAt: string;
  paidAt?: string;
}

export interface LoanTypeCommission {
  loanType: LoanType;
  partnerCommission: number; // percentage
  interestRate?: string; // specific rate for this loan type
  maxAmount?: number;
  minAmount?: number;
  maxTenure?: number;
}

export interface BankOffer {
  id: string;
  bankName: string;
  bankLogo?: string;
  loanTypes: LoanType[];
  interestRateMin: number;
  interestRateMax: number;
  processingFee: string;
  maxTenure: number;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  features: string[];
  isPopular: boolean;
  commissionRates?: LoanTypeCommission[];
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: 'lead_issue' | 'commission' | 'documents' | 'technical' | 'other';
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  sender: 'partner' | 'support';
  senderName: string;
  message: string;
  timestamp: string;
  attachments?: string[];
}

export interface DashboardStats {
  totalLeads: number;
  approvedLoans: number;
  disbursedAmount: number;
  pendingLeads: number;
  totalCommission: number;
  pendingCommission: number;
  thisMonthLeads: number;
  thisMonthDisbursed: number;
}

export interface LeadFunnel {
  totalLeads: number;
  submitted: number;
  docsCollected?: number;
  bankProcessing?: number;
  approved: number;
  disbursed: number;
}

export interface Notification {
  id: string;
  type: 'lead_update' | 'commission' | 'document' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}
