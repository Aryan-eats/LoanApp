/**
 * Documents API Client
 *
 * API functions for document upload and download.
 * Matches backend /api/documents routes.
 */

import apiClient from './apiClient';

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  data?: {
    document: {
      id: string;
      type: string;
      fileName: string;
      fileSize: string | null;
      fileUrl: string | null;
      mimeType: string | null;
      uploadedBy: string | null;
      uploadedAt: string;
      status: string;
    };
  };
}

export interface DocumentDownloadResponse {
  success: boolean;
  data?: {
    url: string;
    document: {
      id: string;
      fileName: string;
      mimeType: string | null;
    };
    expiresIn: number;
  };
  message?: string;
}

/**
 * POST /api/documents/lead/:leadId/doc/:documentId/upload
 * Upload a file for a specific lead document slot.
 */
export const uploadLeadDocument = async (
  leadId: string,
  documentId: string,
  file: File,
): Promise<DocumentUploadResponse> => {
  const formData = new FormData();
  formData.append('document', file);

  const response = await apiClient.post(
    `/documents/lead/${leadId}/doc/${documentId}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return response.data;
};

export interface DocumentDeleteResponse {
  success: boolean;
  message?: string;
}

/**
 * GET /api/documents/lead/:documentId/download
 * Get a temporary download URL for a lead document.
 */
export const getDocumentDownloadUrl = async (
  documentId: string,
): Promise<DocumentDownloadResponse> => {
  const response = await apiClient.get(`/documents/lead/${documentId}/download`);
  return response.data;
};

/**
 * DELETE /api/documents/lead/:documentId
 * Clear (delete) an uploaded file from a lead document slot, resetting it to pending.
 */
export const deleteLeadDocument = async (
  documentId: string,
): Promise<DocumentDeleteResponse> => {
  const response = await apiClient.delete(`/documents/lead/${documentId}`);
  return response.data;
};

export interface DocumentStatusUpdateResponse {
  success: boolean;
  message?: string;
  data?: {
    document: {
      id: string;
      type: string;
      status: string;
      rejectionReason?: string | null;
    };
  };
}

export interface BulkDocumentStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    count: number;
  };
}

/**
 * PATCH /api/documents/lead/:documentId/status
 * Update the status of a lead document (verify or reject). Admin only.
 */
export const updateDocumentStatus = async (
  documentId: string,
  status: 'verified' | 'rejected',
  rejectionReason?: string,
): Promise<DocumentStatusUpdateResponse> => {
  const response = await apiClient.patch(`/documents/lead/${documentId}/status`, {
    status,
    rejectionReason,
  });
  return response.data;
};

/**
 * PATCH /api/documents/lead/bulk-status
 * Bulk verify or reject multiple lead documents. Admin only.
 */
export const bulkUpdateDocumentStatus = async (
  documentIds: string[],
  status: 'verified' | 'rejected',
  rejectionReason?: string,
): Promise<BulkDocumentStatusResponse> => {
  const response = await apiClient.patch('/documents/lead/bulk-status', {
    documentIds,
    status,
    rejectionReason,
  });
  return response.data;
};

export default {
  uploadLeadDocument,
  getDocumentDownloadUrl,
  deleteLeadDocument,
  updateDocumentStatus,
  bulkUpdateDocumentStatus,
};
