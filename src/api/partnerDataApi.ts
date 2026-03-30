/**
 * Partner Data (Stored Clients) API Client
 *
 * Connects to /api/partner/stored-clients endpoints.
 * Replaces localStorage persistence with database persistence.
 */

import apiClient from './apiClient';
import type { LocalLead, LocalLeadStatus } from '../partner/types/partner-dashboard';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateStoredClientData {
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
  loanCategory?: string;
  loanType: string;
  loanAmount: number;
  tenure?: number;
  loanPurpose?: string;
  localStatus?: string;
  notes?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface SubmitStoredClientResponse {
  leadId: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

/** Fetch all stored clients for the current partner */
export async function getStoredClients(): Promise<ApiResponse<LocalLead[]>> {
  const { data } = await apiClient.get<ApiResponse<LocalLead[]>>('/partner/stored-clients');
  return data;
}

/** Create a single stored client */
export async function createStoredClient(payload: CreateStoredClientData): Promise<ApiResponse<LocalLead>> {
  const { data } = await apiClient.post<ApiResponse<LocalLead>>('/partner/stored-clients', payload);
  return data;
}

/** Update status of a stored client */
export async function updateStoredClientStatus(id: string, localStatus: LocalLeadStatus): Promise<ApiResponse<void>> {
  const { data } = await apiClient.patch<ApiResponse<void>>(`/partner/stored-clients/${id}/status`, { localStatus });
  return data;
}

/** Update notes of a stored client */
export async function updateStoredClientNotes(id: string, notes: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.patch<ApiResponse<void>>(`/partner/stored-clients/${id}/notes`, { notes });
  return data;
}

/** Delete a stored client */
export async function deleteStoredClient(id: string): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete<ApiResponse<void>>(`/partner/stored-clients/${id}`);
  return data;
}

/** Submit a stored client to GPS India through the consent handoff */
export async function submitStoredClientToGPS(
  id: string
): Promise<ApiResponse<SubmitStoredClientResponse>> {
  const { data } = await apiClient.post<ApiResponse<SubmitStoredClientResponse>>(
    `/partner/stored-clients/${id}/submit`
  );
  return data;
}

/** Bulk-create stored clients (used for one-time localStorage migration) */
export async function bulkCreateStoredClients(
  clients: (CreateStoredClientData & { createdAt?: string })[]
): Promise<ApiResponse<LocalLead[]>> {
  const { data } = await apiClient.post<ApiResponse<LocalLead[]>>('/partner/stored-clients/bulk', { clients });
  return data;
}
