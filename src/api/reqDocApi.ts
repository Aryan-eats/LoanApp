/**
 * reqDocApi.ts
 * API client for Lender Document Requirements.
 * Matches backend /api/admin/docs/reqdoc routes.
 */

import apiClient from './apiClient';

export interface LenderDocRequirement {
  id: string;
  lenderCode: string;
  lenderName: string;
  loanCode: string;
  docId: string;
  docName: string;
  description: string | null;
  mandatory: boolean;
  acceptedFormats: string[];
  maxSizeMB: number;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data?: T;
}

export type GetDocsResponse   = ApiResponse<LenderDocRequirement[]>;
export type SingleDocResponse = ApiResponse<LenderDocRequirement>;
export type DeleteResponse    = ApiResponse<null>;

/**
 * GET /api/admin/docs/reqdoc
 * Optionally filter by lenderCode and/or loanCode.
 */
export const getDocRequirements = async (
  filters?: { lenderCode?: string; loanCode?: string }
): Promise<GetDocsResponse> => {
  const params: Record<string, string> = {};
  if (filters?.lenderCode) params.lenderCode = filters.lenderCode;
  if (filters?.loanCode)   params.loanCode   = filters.loanCode;
  const response = await apiClient.get('/admin/docs/reqdoc', { params });
  return response.data;
};

/**
 * POST /api/admin/docs/reqdoc
 * Add a new document requirement.
 */
export const createDocRequirement = async (payload: {
  lenderCode: string;
  lenderName: string;
  loanCode: string;
  docId?: string;
  docName: string;
  description?: string;
  mandatory?: boolean;
  acceptedFormats?: string[];
  maxSizeMB?: number;
}): Promise<SingleDocResponse> => {
  const response = await apiClient.post('/admin/docs/reqdoc', payload);
  return response.data;
};

/**
 * PATCH /api/admin/docs/reqdoc/:id
 * Update an existing document requirement.
 */
export const updateDocRequirement = async (
  id: string,
  payload: {
    docName?: string;
    description?: string;
    mandatory?: boolean;
    acceptedFormats?: string[];
    maxSizeMB?: number;
  }
): Promise<SingleDocResponse> => {
  const response = await apiClient.patch(`/admin/docs/reqdoc/${id}`, payload);
  return response.data;
};

/**
 * DELETE /api/admin/docs/reqdoc/:id
 * Remove a document requirement.
 */
export const deleteDocRequirement = async (id: string): Promise<DeleteResponse> => {
  const response = await apiClient.delete(`/admin/docs/reqdoc/${id}`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Public (authenticated) endpoint – flat deduped list per loan code
// ---------------------------------------------------------------------------

export interface FlatDocRequirement {
  id: string;
  name: string;
  description?: string | null;
  mandatory: boolean;
  acceptedFormats: string[];
  maxSizeMB: number;
}

export type FlatDocsResponse = ApiResponse<FlatDocRequirement[]>;

/**
 * GET /api/documents/req-docs/flat?loanCode=xxx&lenderCode=yyy
 * Returns a deduped flat list of document requirements for a loan code.
 * When lenderCode is provided, returns bank-specific requirements.
 * Accessible to all authenticated roles.
 */
export const getFlatDocRequirements = async (
  loanCode: string,
  lenderCode?: string,
): Promise<FlatDocsResponse> => {
  const params: Record<string, string> = { loanCode };
  if (lenderCode) params.lenderCode = lenderCode;
  const response = await apiClient.get('/documents/req-docs/flat', { params });
  return response.data;
};
