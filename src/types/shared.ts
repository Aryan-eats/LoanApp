// Shared Types - Common types used across Admin and Partner dashboards
import type { LoanProductCode } from '../data/loanProductsData';

// Canonical LoanType references the loan products registry
export type LoanType = LoanProductCode;

// Document Status - unified across all modules
export type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'rejected';

// Base Lead Status - common statuses across admin and partner
export type LeadStatus = 
  | 'draft'
  | 'submitted' 
  | 'docs_pending'
  | 'docs_uploaded'
  | 'docs_collected'
  | 'bank_processing'
  | 'bank_logged'
  | 'approved' 
  | 'disbursed' 
  | 'rejected';

// Commission Status
export type CommissionStatus = 'pending' | 'processing' | 'approved' | 'paid';

// Application Status (for partner applications)
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'under_review' | 'suspended';

// Partner Types
export type PartnerType = 'freelancer' | 'used_car_dealer' | 'car_dealer' | 'property_dealer' | 'builder' | 'sub_dsa';

// KYC Status
export type KYCStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

// Admin Roles
export type AdminRole = 'super_admin' | 'admin' | 'manager' | 'agent' | 'viewer';

// Ticket related types
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

// Employment Types
export type EmploymentType = 'salaried' | 'self_employed' | 'business_owner' | 'professional';

// Base Document Interface
export interface BaseDocument {
  id: string;
  type: string;
  fileName: string;
  fileSize?: string;
  status: DocumentStatus;
  uploadedAt: string;
  uploadedBy?: string;
}

// Bank Details Interface (shared)
export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  isVerified?: boolean;
}

// Timeline Event Interface
export interface TimelineEvent {
  id: string;
  status: string;
  timestamp: string;
  updatedBy: string;
  note?: string;
}

// Currency formatting utility
export const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};
