/**
 * Partners API Client
 * 
 * Complete API functions for partner management.
 * Matches backend /api/partners endpoints.
 */

import apiClient from './apiClient';
import type { Partner, ApplicationStatus } from '../admin/types/admin';

export type { Partner, ApplicationStatus };

export interface PartnersResponse {
  partners: Partner[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PartnerStatsResponse {
  stats: {
    total: number;
    active: number;
    pending: number;
    byType: { type: string; count: number }[];
  };
}

export interface PartnerLeadsResponse {
  leads: Array<{
    id: string;
    client: { fullName: string; phone: string; email: string };
    loanType: string;
    loanAmount: number;
    status: string;
    bankAssigned?: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PartnerCommissionsResponse {
  commissions: Array<{
    id: string;
    leadId: string;
    clientName: string;
    loanType: string;
    disbursedAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: string;
    paidAt?: string;
    createdAt: string;
  }>;
  summary: {
    total: number;
    paid: number;
    pending: number;
    count: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data?: T;
}

export interface GetPartnersParams {
  page?: number;
  limit?: number;
  status?: string;
  partnerType?: string;
  city?: string;
  search?: string;
}

/**
 * GET /api/partners - Get all partners (with filters)
 */
export const getPartners = async (
  params: GetPartnersParams = {}
): Promise<ApiResponse<PartnersResponse>> => {
  const response = await apiClient.get('/partners', { params });
  return response.data;
};

/**
 * POST /api/partners - Create/Register new partner (onboarding)
 * Note: This is the same as registerPartner in authApi
 */
export const createPartner = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  partnerType?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): Promise<ApiResponse<{ partner: Partner }>> => {
  const response = await apiClient.post('/partners', data);
  return response.data;
};

/**
 * GET /api/partners/:id - Get partner details
 */
export const getPartnerById = async (
  id: string
): Promise<ApiResponse<{ partner: Partner }>> => {
  const response = await apiClient.get(`/partners/${id}`);
  return response.data;
};

/**
 * PUT /api/partners/:id - Update partner details
 */
export const updatePartner = async (
  id: string,
  data: Partial<Partner>
): Promise<ApiResponse<{ partner: Partner }>> => {
  const response = await apiClient.put(`/partners/${id}`, data);
  return response.data;
};

/**
 * PATCH /api/partners/:id/status - Approve/Reject/Suspend partner
 */
export const updatePartnerStatus = async (
  id: string,
  status: 'approved' | 'rejected' | 'suspended' | 'pending',
  reason?: string
): Promise<ApiResponse<{ partner: Partner }>> => {
  const response = await apiClient.patch(`/partners/${id}/status`, { status, reason });
  return response.data;
};

/**
 * GET /api/partners/:id/leads - Get leads for specific partner
 */
export const getPartnerLeads = async (
  id: string,
  params: { page?: number; limit?: number; status?: string } = {}
): Promise<ApiResponse<PartnerLeadsResponse>> => {
  const response = await apiClient.get(`/partners/${id}/leads`, { params });
  return response.data;
};

/**
 * GET /api/partners/:id/commissions - Get commissions for partner
 */
export const getPartnerCommissions = async (
  id: string
): Promise<ApiResponse<PartnerCommissionsResponse>> => {
  const response = await apiClient.get(`/partners/${id}/commissions`);
  return response.data;
};

/**
 * PUT /api/partners/:id/profile - Update partner profile
 */
export const updatePartnerProfile = async (
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    state?: string;
    pincode?: string;
    businessName?: string;
    businessAddress?: string;
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  }
): Promise<ApiResponse<{ partner: Partner }>> => {
  const response = await apiClient.put(`/partners/${id}/profile`, data);
  return response.data;
};

/**
 * POST /api/partners/:id/kyc - Submit KYC documents
 */
export const submitPartnerKYC = async (
  id: string,
  data: {
    panNumber?: string;
    aadhaarNumber?: string;
    panDocument?: string;
    aadhaarDocument?: string;
    photoDocument?: string;
  }
): Promise<ApiResponse<{ partner: Partner }>> => {
  const response = await apiClient.post(`/partners/${id}/kyc`, data);
  return response.data;
};

/**
 * PATCH /api/partners/:id/kyc/status - Update KYC status
 */
export const updatePartnerKYCStatus = async (
  id: string,
  status: 'pending' | 'verified' | 'rejected',
  rejectionReason?: string
): Promise<ApiResponse<{ partner: Partner }>> => {
  const response = await apiClient.patch(`/partners/${id}/kyc/status`, { status, rejectionReason });
  return response.data;
};

/**
 * GET /api/partners/stats - Get partner statistics
 */
export const getPartnerStats = async (): Promise<ApiResponse<PartnerStatsResponse>> => {
  const response = await apiClient.get('/partners/stats');
  return response.data;
};

// Convenience aliases for common actions
export const approvePartner = (id: string) => updatePartnerStatus(id, 'approved');
export const rejectPartner = (id: string, reason?: string) => updatePartnerStatus(id, 'rejected', reason);
export const suspendPartner = (id: string, reason?: string) => updatePartnerStatus(id, 'suspended', reason);

export default {
  getPartners,
  createPartner,
  getPartnerById,
  updatePartner,
  updatePartnerStatus,
  getPartnerLeads,
  getPartnerCommissions,
  updatePartnerProfile,
  submitPartnerKYC,
  updatePartnerKYCStatus,
  getPartnerStats,
  approvePartner,
  rejectPartner,
  suspendPartner,
};
