import apiClient from './apiClient';
import type { CustomerActivityItem, CustomerConsentSummary, Lead, LocalLead } from '../partner/types/partner-dashboard';

export interface PartnerCustomerIdentity {
  customerId: string;
  customerKey?: string;
  fullName: string;
  phone: string;
  email?: string;
  leadSource?: string;
  leadScore?: number;
  scoreBand?: string;
  consentSummary?: CustomerConsentSummary;
}

export interface PartnerCustomerDetailResponse {
  customer: PartnerCustomerIdentity;
  storedClient?: LocalLead | null;
  relatedLeads: Lead[];
  activity: CustomerActivityItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const getCustomerDetail = async (
  customerId: string
): Promise<ApiResponse<PartnerCustomerDetailResponse>> => {
  const response = await apiClient.get(`/partner/customers/${customerId}`);
  return response.data;
};

export default {
  getCustomerDetail,
};
