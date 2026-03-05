/**
 * Banks API Client
 *
 * API functions for bank management endpoints.
 * Matches backend /api/admin/banks routes.
 */

import apiClient from './apiClient';

export interface BankCommissionRate {
  id: string;
  bankId: string;
  loanType: string;
  partnerCommission: string; // Decimal comes as string from API
  interestRate: string | null;
  maxAmount: string | null;
  minAmount: string | null;
  maxTenure: number | null;
}

export interface BankFromApi {
  id: string;
  name: string;
  code: string;
  logo: string | null;
  status: 'active' | 'inactive';
  supportedLoanTypes: string[];
  interestRateMin: string; // Decimal comes as string
  interestRateMax: string;
  processingFee: string;
  maxTenure: number;
  minAmount: string;
  maxAmount: string;
  processingTime: string;
  isPopular: boolean;
  features: string[];
  avgTat: number;
  activeLeads: number;
  approvalRate: number;
  totalDisbursed: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
  commissionRates: BankCommissionRate[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data?: T;
}

/**
 * GET /api/admin/banks - Get all banks
 */
export const getBanks = async (): Promise<ApiResponse<{ banks: BankFromApi[] }>> => {
  const response = await apiClient.get('/admin/banks');
  return response.data;
};

/**
 * GET /api/admin/banks/:id - Get bank by ID
 */
export const getBankById = async (id: string): Promise<ApiResponse<{ bank: BankFromApi }>> => {
  const response = await apiClient.get(`/admin/banks/${id}`);
  return response.data;
};

/**
 * PATCH /api/admin/banks/:id/status - Toggle bank status
 */
export const toggleBankStatus = async (
  id: string,
  status: 'active' | 'inactive'
): Promise<ApiResponse<{ bank: BankFromApi }>> => {
  const response = await apiClient.patch(`/admin/banks/${id}/status`, { status });
  return response.data;
};

/**
 * PUT /api/admin/banks/:id - Update bank data
 */
export const updateBank = async (
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<{ bank: BankFromApi }>> => {
  const response = await apiClient.put(`/admin/banks/${id}`, data);
  return response.data;
};

export default {
  getBanks,
  getBankById,
  toggleBankStatus,
  updateBank,
};
