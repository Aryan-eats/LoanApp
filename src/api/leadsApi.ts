/**
 * Leads API Client
 * 
 * API functions for lead management, connecting to backend.
 * Types match frontend partner-dashboard.ts Lead type.
 */

import apiClient from './apiClient';
import type { Lead, LeadStatus, LoanType, LeadDocument, LeadTimelineEvent, LeadCommission, EligibilityResult, Client } from '../partner/types/partner-dashboard';

export type { Lead, LeadStatus, LoanType, LeadDocument, LeadTimelineEvent, LeadCommission, EligibilityResult, Client };

export interface CreateLeadData {
  // Client details
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  panNumber?: string;
  employmentType?: string;
  monthlyIncome?: number;
  companyName?: string;
  workExperience?: number;
  city?: string;
  pincode?: string;
  // Loan details
  loanType: string;
  loanAmount: number;
  tenure?: number;
  // Customer preference
  preferredBank?: string;
}

export interface MatchedOffer {
  id: string;
  name: string;
  code: string;
  logo: string | null;
  supportedLoanTypes: string[];
  matchedLoanTypes: string[];
  interestRateMin: number;
  interestRateMax: number;
  processingFee: string;
  maxTenure: number;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  isPopular: boolean;
  displayAmount: number;
  estimatedEmi: number | null;
}

export interface MatchOffersRequest {
  loanType?: string;
  loanSubType?: string;
  loanAmount?: number;
}

export interface LeadsResponse {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LeadStatsResponse {
  stats: {
    total: number;
    totalAmount: number;
    byStatus: Record<string, number>;
    byLoanType: { type: string; count: number }[];
    recentLeads: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Query parameters for fetching leads
export interface LeadsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  loanType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get all leads (as partner - own leads only, as admin - all leads)
 */
export const getLeads = async (
  params: LeadsQueryParams = {},
  isAdmin = false
): Promise<ApiResponse<LeadsResponse>> => {
  const baseUrl = isAdmin ? '/admin/leads' : '/partner/leads';
  const response = await apiClient.get(baseUrl, { params });
  return response.data;
};

/**
 * Get a single lead by ID
 */
export const getLeadById = async (
  id: string,
  isAdmin = false
): Promise<ApiResponse<{ lead: Lead }>> => {
  const baseUrl = isAdmin ? `/admin/leads/${id}` : `/partner/leads/${id}`;
  const response = await apiClient.get(baseUrl);
  return response.data;
};

/**
 * Create a new lead (public endpoint for website, or partner endpoint)
 * Website forms use /api/leads (public), partners use /api/partner/leads (auth required)
 */
export const createLead = async (
  data: CreateLeadData,
  isPartner = true
): Promise<ApiResponse<{ lead: Lead; leadToken?: string }>> => {
  const endpoint = isPartner ? '/partner/leads' : '/leads';
  const response = await apiClient.post(endpoint, data);
  return response.data;
};

/**
 * Create a new lead as admin
 */
export const createAdminLead = async (data: CreateLeadData): Promise<ApiResponse<{ lead: Lead }>> => {
  const response = await apiClient.post('/admin/leads', data);
  return response.data;
};

/**
 * Update a lead
 */
export const updateLead = async (
  id: string,
  data: Partial<Lead>,
  isAdmin = false
): Promise<ApiResponse<{ lead: Lead }>> => {
  const baseUrl = isAdmin ? `/admin/leads/${id}` : `/partner/leads/${id}`;
  const response = await apiClient.put(baseUrl, data);
  return response.data;
};

/**
 * Update lead status with timeline entry
 */
export const updateLeadStatus = async (
  id: string,
  status: LeadStatus,
  note?: string,
  isAdmin = false
): Promise<ApiResponse<{ lead: Lead }>> => {
  const baseUrl = isAdmin ? `/admin/leads/${id}/status` : `/partner/leads/${id}/status`;
  const response = await apiClient.patch(baseUrl, { status, note });
  return response.data;
};

/**
 * Assign bank to a lead (admin only)
 */
export const assignBank = async (
  id: string,
  bankName: string,
  bankCode?: string,
  bankLogo?: string,
  note?: string
): Promise<ApiResponse<{ lead: Lead }>> => {
  const response = await apiClient.patch(`/admin/leads/${id}/assign-bank`, { bankName, bankCode, bankLogo, note });
  return response.data;
};

/**
 * Delete a lead (admin only)
 */
export const deleteLead = async (id: string): Promise<ApiResponse<void>> => {
  const response = await apiClient.delete(`/admin/leads/${id}`);
  return response.data;
};

/**
 * Get lead statistics
 */
export const getLeadStats = async (isAdmin = false): Promise<ApiResponse<LeadStatsResponse>> => {
  const baseUrl = isAdmin ? '/admin/leads/stats' : '/partner/leads/stats';
  const response = await apiClient.get(baseUrl);
  return response.data;
};

export const matchOffers = async (
  data: MatchOffersRequest
): Promise<ApiResponse<{ offers: MatchedOffer[]; resolvedLoanTypes: string[] }>> => {
  const response = await apiClient.post('/leads/match-offers', data);
  return response.data;
};

/**
 * Update preferred bank for a lead (public endpoint for website users)
 * Requires the leadToken returned during lead creation.
 */
export const updatePreferredBank = async (
  id: string,
  preferredBank: string,
  leadToken: string
): Promise<ApiResponse<{ lead: Lead }>> => {
  const response = await apiClient.patch(
    `/leads/${id}/preferred-bank`,
    { preferredBank },
    { headers: { 'x-lead-token': leadToken } }
  );
  return response.data;
};

export default {
  getLeads,
  getLeadById,
  createLead,
  createAdminLead,
  updateLead,
  updateLeadStatus,
  assignBank,
  deleteLead,
  getLeadStats,
  matchOffers,
  updatePreferredBank,
};
