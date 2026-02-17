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

export default {
  uploadLeadDocument,
  getDocumentDownloadUrl,
};
