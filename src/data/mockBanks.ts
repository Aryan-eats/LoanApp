import type { LoanType } from '../partner/types/partner-dashboard';

export interface ConsolidatedBank {
  id: string; // Unified ID (e.g., 'BO001' or 'B001')
  name: string;
  code: string;
  logo?: string;
  status: 'active' | 'inactive';
  
  // Product info
  supportedLoanTypes: LoanType[];
  interestRateMin: number;
  interestRateMax: number;
  processingFee: string;
  maxTenure: number;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  
  // Partner dashboard specific
  isPopular: boolean;
  features: string[];
  commissionRates?: {
    loanType: LoanType;
    partnerCommission: number; // percentage
    interestRate?: string;
    maxAmount?: number;
    minAmount?: number;
    maxTenure?: number;
  }[];
  
  // Admin dashboard specific
  avgTat: number;
  activeLeads: number;
  approvalRate: number;
  totalDisbursed: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}

