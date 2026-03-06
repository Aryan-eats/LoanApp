// Admin Types for GPS India Financial Services Admin Dashboard
// Re-exports shared types and adds admin-specific types

import type { LoanProductCode } from '../../data/loanProductsData';

// Re-export shared types for convenience
export type {
  DocumentStatus,
  CommissionStatus,
  ApplicationStatus,
  AdminRole,
  BankDetails,
  TimelineEvent,
} from '../../types/shared';

// Import shared types for internal use
import type {
  DocumentStatus,
  CommissionStatus,
  ApplicationStatus,
  AdminRole,
} from '../../types/shared';

// Admin-specific lead status (matching backend Lead model)
export type LeadStatus = 'draft' | 'submitted' | 'docs_pending' | 'docs_uploaded' | 'bank_processing' | 'approved' | 'disbursed' | 'rejected';

// Partner type (admin has more detailed categorization)
export type PartnerType = 'freelancer' | 'used_car_dealer' | 'property_dealer' | 'builder' | 'sub_dsa';

// LoanType references the canonical registry - supports all 80+ loan products
export type LoanType = LoanProductCode;

export interface Partner {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  partnerType: PartnerType;
  city: string;
  status: ApplicationStatus;
  leadsSubmitted: number;
  joinedDate: string;
  panNumber: string;
  businessName?: string;
  businessAddress?: string;
  gstNumber?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  notes?: string;
}

export interface Lead {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  loanType: LoanType;
  loanAmount: number;
  partnerId: string;
  partnerName: string;
  status: LeadStatus;
  bankAssigned?: string;
  bankCode?: string;
  preferredBank?: string;
  createdAt: string;
  updatedAt: string;
  timeline: LeadTimelineEvent[];
  documents: LeadDocument[];
  commission?: LeadCommission;
}

export interface LeadCommission {
  disbursedAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
}

export interface LeadTimelineEvent {
  id: string;
  status: LeadStatus;
  timestamp: string;
  note?: string;
  updatedBy: string;
}

export interface LeadDocument {
  id: string;
  type: string;
  fileName: string;
  fileSize?: string;
  fileUrl?: string;
  mimeType?: string;
  r2ObjectKey?: string;
  uploadedBy: string;
  uploadedAt: string;
  status: DocumentStatus;
  url?: string;
}

export interface Document {
  id: string;
  leadId: string;
  customerName: string;
  type: string;
  fileName: string;
  fileType: 'pdf' | 'image';
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  status: DocumentStatus;
}

export interface Bank {
  id: string;
  name: string;
  code: string;
  logo?: string;
  supportedLoanTypes: LoanType[];
  avgTat: number;
  activeLeads: number;
  approvalRate: number;
  totalDisbursed: string;
  status: 'active' | 'inactive';
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  commissionSlabs: BankCommissionSlab[];
}

export interface BankCommissionSlab {
  loanType: LoanType;
  rate: number;
}

export interface BankProduct {
  id: string;
  name: string;
  loanType: LoanType;
  minAmount: number;
  maxAmount: number;
  interestRate: string;
  processingFee: string;
  isActive: boolean;
}

export interface Commission {
  id: string;
  leadId: string;
  partnerId: string;
  partnerName: string;
  customerName: string;
  loanType: LoanType;
  bank: string;
  disbursedAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  createdAt: string;
  paidAt?: string;
}

export type AuditEventType =
  // Auth
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_CHANGE'
  | 'OTP_SENT'
  | 'OTP_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_REFRESH'
  | 'SUSPICIOUS_ACTIVITY'
  // Lead lifecycle
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_DELETED'
  | 'LEAD_ASSIGNED'
  // Documents
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_DELETED'
  // Partners
  | 'PARTNER_UPDATED'
  | 'PARTNER_APPROVED'
  | 'PARTNER_SUSPENDED'
  | 'PARTNER_KYC_UPDATED'
  // Financials
  | 'COMMISSION_CALCULATED'
  | 'COMMISSION_PAID'
  | 'COMMISSION_RATE_CHANGED'
  // Consent & Data Rights
  | 'CONSENT_GIVEN'
  | 'CONSENT_WITHDRAWN'
  | 'DATA_DELETION_REQUEST'
  // Admin
  | 'ADMIN_ROLE_CHANGED'
  | 'ADMIN_USER_CREATED'
  | 'ADMIN_USER_DELETED'
  | 'BULK_EXPORT'
  | 'PII_ACCESS'
  | 'BANK_UPDATED'
  | 'BANK_STATUS_CHANGED';

export interface AuditLog {
  id: string;
  event: AuditEventType;
  userName: string;
  userRole: string;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  entityId: string | null;
  entityType: string | null;
  severity: string;
  createdAt: string;
}

export interface AuditLogsPagination {
  limit: number;
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  currentCursor: string | null;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: AuditLogsPagination;
  counts: {
    loginEvents: number;
    securityEvents: number;
    authEvents: number;
  };
}

export interface AuditLogsFilters {
  event?: AuditEventType | '';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  since?: string;
  limit?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface DashboardStats {
  leadsToday: number;
  leadsMTD: number;
  activePartners: number;
  loansApprovedMTD: number;
  loansDisbursedMTD: number;
  totalCommissionMTD: number;
  pendingReview: number;
  leadsByLoanType: { type: string; count: number }[];
  disbursementTrend: { date: string; amount: number }[];
}

export interface CommissionSlab {
  id: string;
  loanType: LoanType;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  isActive: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'whatsapp' | 'sms' | 'email';
  template: string;
  isActive: boolean;
}
