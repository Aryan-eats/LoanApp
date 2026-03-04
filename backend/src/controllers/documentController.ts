/**
 * Document controller – handles HTTP requests for document CRUD.
 */

import { Request, Response } from 'express';
import {
  uploadDocument,
  getDownloadUrl,
  deleteDocument,
  documentExists,
  listUserDocuments,
  uploadLeadDocument,
  getLeadDocumentDownloadUrl,
  updateLeadDocumentStatus,
  bulkUpdateLeadDocumentStatus,
} from '../services/documentService.js';
import prisma from '../config/prisma.js';
import crypto from 'crypto';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * POST /api/documents/upload
 * Upload a single document for the authenticated user.
 */
export const upload = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const userId = req.user!.id;
    const result = await uploadDocument(
      userId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: result,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
    });
  }
};

/**
 * POST /api/documents/lead/:leadId/doc/:documentId/upload
 * Upload a document for a specific lead document slot.
 * Stores file in R2 and persists metadata in Postgres.
 */
export const uploadLeadDoc = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const leadId = String(req.params.leadId);
    const documentId = String(req.params.documentId);
    const currentUser = req.user!;

    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    // Authorization: only the lead owner or admin may upload
    if (lead.partnerId !== currentUser.id && currentUser.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Verify document belongs to this lead
    const doc = await prisma.leadDocument.findFirst({
      where: { id: documentId, leadId },
    });
    if (!doc) {
      res.status(404).json({
        success: false,
        message: 'Document not found for this lead',
      });
      return;
    }

    const uploaderName = req.user
      ? `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email
      : 'System';

    const updatedDoc = await uploadLeadDocument(
      leadId,
      documentId,
      file.originalname,
      file.buffer,
      file.mimetype,
      uploaderName,
    );

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: {
          id: updatedDoc.id,
          type: updatedDoc.type,
          fileName: updatedDoc.fileName,
          fileSize: updatedDoc.fileSize,
          fileUrl: updatedDoc.fileUrl,
          mimeType: updatedDoc.mimeType,
          uploadedBy: updatedDoc.uploadedBy,
          uploadedAt: updatedDoc.uploadedAt?.toISOString(),
          status: updatedDoc.status,
        },
      },
    });

    await logAuditEvent('DOCUMENT_UPLOADED', req, {
      userId: currentUser.id,
      entityId: documentId,
      entityType: 'document',
      metadata: {
        leadId,
        docType: doc.type,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  } catch (error) {
    console.error('Lead document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
    });
  }
};

/**
 * GET /api/documents/lead/:documentId/download
 * Generate a temporary download URL for a lead document.
 */
export const getLeadDocUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const documentId = String(req.params.documentId);
    const currentUser = req.user!;

    // Authorization: resolve the document's lead and verify ownership / admin
    const docRecord = await prisma.leadDocument.findUnique({
      where: { id: documentId },
      include: { lead: { select: { partnerId: true } } },
    });
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }
    if (docRecord.lead.partnerId !== currentUser.id && currentUser.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const result = await getLeadDocumentDownloadUrl(documentId);

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
        document: result.document,
        expiresIn: 3600,
      },
    });

    await logAuditEvent('DOCUMENT_DOWNLOADED', req, {
      userId: currentUser.id,
      entityId: documentId,
      entityType: 'document',
      metadata: {
        leadId: docRecord.leadId,
        docType: docRecord.type,
        fileName: docRecord.fileName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate download URL';
    const status = message.includes('not found') || message.includes('not been uploaded') ? 404 : 500;
    console.error('Lead document download error:', error);
    res.status(status).json({ success: false, message });
  }
};

/**
 * DELETE /api/documents/lead/:documentId
 * Clear the uploaded file from a lead document slot (admin or lead owner only).
 * Resets the slot back to pending without deleting the slot itself.
 */
export const deleteLeadDoc = async (req: Request, res: Response): Promise<void> => {
  try {
    const documentId = String(req.params.documentId);
    const currentUser = req.user!;

    const docRecord = await prisma.leadDocument.findUnique({
      where: { id: documentId },
      include: { lead: { select: { partnerId: true } } },
    });
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }
    if (docRecord.lead.partnerId !== currentUser.id && currentUser.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Delete from R2 if a file was actually uploaded
    if (docRecord.r2ObjectKey) {
      try {
        await deleteDocument(docRecord.r2ObjectKey);
      } catch {
        // Non-fatal - object may already be gone
      }
    }

    // Reset the slot back to pending
    await prisma.leadDocument.update({
      where: { id: documentId as string },
      data: {
        fileName: '',
        fileSize: null,
        fileUrl: null,
        mimeType: null,
        r2ObjectKey: null,
        uploadedBy: null,
        uploadedAt: new Date(0),
        status: 'pending',
      },
    });

    res.status(200).json({ success: true, message: 'Document deleted successfully' });

    await logAuditEvent('DOCUMENT_DELETED', req, {
      userId: currentUser.id,
      entityId: documentId,
      entityType: 'document',
      severity: 'HIGH',
      metadata: {
        leadId: docRecord.leadId,
        docType: docRecord.type,
        fileName: docRecord.fileName,
      },
    });
  } catch (error) {
    console.error('Lead document delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
};

/**
 * PATCH /api/documents/lead/:documentId/status
 * Update the status of a lead document (verify or reject). Admin only.
 */
export const updateLeadDocStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const documentId = String(req.params.documentId);
    const currentUser = req.user!;

    if (currentUser.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only admins can verify/reject documents' });
      return;
    }

    const { status, rejectionReason } = req.body as {
      status?: string;
      rejectionReason?: string;
    };

    if (!status || !['verified', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be 'verified' or 'rejected'",
      });
      return;
    }

    if (status === 'rejected' && !rejectionReason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a document',
      });
      return;
    }

    const docRecord = await prisma.leadDocument.findUnique({ where: { id: documentId } });
    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    const updatedDoc = await updateLeadDocumentStatus(
      documentId,
      status as 'verified' | 'rejected',
      rejectionReason,
    );

    res.status(200).json({
      success: true,
      message: `Document ${status} successfully`,
      data: {
        document: {
          id: updatedDoc.id,
          type: updatedDoc.type,
          status: updatedDoc.status,
          rejectionReason: updatedDoc.rejectionReason,
        },
      },
    });

    const docEvent = status === 'verified' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED';
    await logAuditEvent(docEvent, req, {
      userId: currentUser.id,
      entityId: documentId,
      entityType: 'document',
      metadata: {
        leadId: docRecord.leadId,
        docType: docRecord.type,
        previousStatus: docRecord.status,
        newStatus: status,
        ...(rejectionReason ? { rejectionReason } : {}),
      },
    });
  } catch (error) {
    console.error('Lead document status update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update document status' });
  }
};

/**
 * PATCH /api/documents/lead/bulk-status
 * Bulk update status of multiple lead documents. Admin only.
 */
export const bulkUpdateLeadDocStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;

    if (currentUser.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only admins can verify/reject documents' });
      return;
    }

    const { documentIds, status, rejectionReason } = req.body as {
      documentIds?: string[];
      status?: string;
      rejectionReason?: string;
    };

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({ success: false, message: 'documentIds array is required' });
      return;
    }

    if (!status || !['verified', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be 'verified' or 'rejected'",
      });
      return;
    }

    if (status === 'rejected' && !rejectionReason) {
      res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting documents',
      });
      return;
    }

    const result = await bulkUpdateLeadDocumentStatus(
      documentIds,
      status as 'verified' | 'rejected',
      rejectionReason,
    );

    res.status(200).json({
      success: true,
      message: `${result.count} document(s) ${status} successfully`,
      data: { count: result.count },
    });

    const bulkEvent = status === 'verified' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED';
    await logAuditEvent(bulkEvent, req, {
      userId: currentUser.id,
      entityType: 'document',
      metadata: {
        documentIds,
        count: result.count,
        status,
        ...(rejectionReason ? { rejectionReason } : {}),
      },
    });
  } catch (error) {
    console.error('Bulk document status update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update document statuses' });
  }
};

/**
 * GET /api/documents
 * List all documents for the authenticated user.
 */
export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const documents = await listUserDocuments(userId);

    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    console.error('Document list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list documents',
    });
  }
};

/**
 * GET /api/documents/download/:key(*)
 * Generate a temporary download URL for a document.
 */
export const download = async (req: Request, res: Response): Promise<void> => {
  try {
    const key = String(req.params.key ?? req.params[0] ?? '');
    const userId = req.user!.id;

    // Ensure the user can only access their own documents
    if (!key.startsWith(`users/${userId}/`)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const exists = await documentExists(key);
    if (!exists) {
      res.status(404).json({
        success: false,
        message: 'Document not found',
      });
      return;
    }

    const url = await getDownloadUrl(key);

    res.status(200).json({
      success: true,
      data: { url, expiresIn: 3600 },
    });
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate download URL',
    });
  }
};

/**
 * DELETE /api/documents/:key(*)
 * Delete a document belonging to the authenticated user.
 */
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const key = String(req.params.key ?? req.params[0] ?? '');
    const userId = req.user!.id;

    // Ensure the user can only delete their own documents
    if (!key.startsWith(`users/${userId}/`)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const exists = await documentExists(key);
    if (!exists) {
      res.status(404).json({
        success: false,
        message: 'Document not found',
      });
      return;
    }

    await deleteDocument(key);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
    });
  }
};

/**
 * POST /api/documents/lead/:documentId/upload-token
 * Generate a secure, time-limited upload token for a customer.
 * Admin only.
 */
export const generateUploadToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    if (currentUser.role !== 'admin' && currentUser.role !== 'partner') {
      res.status(403).json({ success: false, message: 'Only admins and partners can generate upload links' });
      return;
    }

    const documentId = String(req.params.documentId);

    // Look up the document and its parent lead
    const docRecord = await prisma.leadDocument.findUnique({
      where: { id: documentId },
      include: { lead: { select: { id: true, clientFullName: true, clientEmail: true } } },
    });

    if (!docRecord) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    // Create a token that expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const uploadToken = await prisma.documentUploadToken.create({
      data: {
        documentId,
        leadId: docRecord.leadId,
        expiresAt,
      },
    });

    // The frontend URL the customer will visit
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const uploadUrl = `${baseUrl}/upload/${uploadToken.token}`;

    res.status(201).json({
      success: true,
      message: 'Upload link generated',
      data: {
        uploadUrl,
        token: uploadToken.token,
        expiresAt: expiresAt.toISOString(),
        document: {
          id: docRecord.id,
          type: docRecord.type,
        },
        customer: {
          name: docRecord.lead.clientFullName,
          email: docRecord.lead.clientEmail,
        },
      },
    });
  } catch (error) {
    console.error('Generate upload token error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate upload link' });
  }
};

/**
 * GET /api/documents/upload-via-token/:token
 * Public (no auth). Validates a token and returns ALL pending/rejected
 * documents for the lead so the customer can upload everything from one page.
 */
export const validateUploadToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token);

    const tokenRecord = await prisma.documentUploadToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      res.status(404).json({ success: false, message: 'Invalid upload link' });
      return;
    }

    if (new Date() > tokenRecord.expiresAt) {
      res.status(410).json({ success: false, message: 'This upload link has expired', code: 'EXPIRED' });
      return;
    }

    // Get ALL documents for this lead + lead info
    const lead = await prisma.lead.findUnique({
      where: { id: tokenRecord.leadId },
      select: {
        clientFullName: true,
        loanType: true,
        documents: {
          select: {
            id: true,
            type: true,
            status: true,
            fileName: true,
          },
          orderBy: { type: 'asc' },
        },
      },
    });

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        customerName: lead.clientFullName,
        loanType: lead.loanType,
        expiresAt: tokenRecord.expiresAt.toISOString(),
        documents: lead.documents.map((d) => ({
          id: d.id,
          type: d.type,
          status: d.status,
          fileName: d.fileName || null,
        })),
      },
    });
  } catch (error) {
    console.error('Validate upload token error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/documents/upload-via-token/:token
 * Public (no auth required). Customer uploads a file for any document
 * belonging to the token's lead. The documentId is passed in the URL as a query param.
 */
export const uploadViaToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.params.token);
    const documentId = String(req.query.documentId || '');

    if (!documentId) {
      res.status(400).json({ success: false, message: 'documentId query parameter is required' });
      return;
    }

    // Find the token
    const tokenRecord = await prisma.documentUploadToken.findUnique({
      where: { token },
    });

    if (!tokenRecord) {
      res.status(404).json({ success: false, message: 'Invalid or expired upload link' });
      return;
    }

    if (new Date() > tokenRecord.expiresAt) {
      res.status(410).json({ success: false, message: 'This upload link has expired' });
      return;
    }

    // Verify the document belongs to the same lead as the token
    const docRecord = await prisma.leadDocument.findFirst({
      where: { id: documentId, leadId: tokenRecord.leadId },
    });

    if (!docRecord) {
      res.status(403).json({ success: false, message: 'Document does not belong to this upload link' });
      return;
    }

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    // Upload the file
    const updatedDoc = await uploadLeadDocument(
      tokenRecord.leadId,
      documentId,
      file.originalname,
      file.buffer,
      file.mimetype,
      'Customer (via link)',
    );

    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: {
          id: updatedDoc.id,
          type: updatedDoc.type,
          fileName: updatedDoc.fileName,
          status: updatedDoc.status,
        },
      },
    });

    // Log even for public upload - userId will be null (customer upload)
    await logAuditEvent('DOCUMENT_UPLOADED', req, {
      entityId: documentId,
      entityType: 'document',
      metadata: {
        leadId: tokenRecord.leadId,
        docType: docRecord.type,
        fileName: file.originalname,
        uploadMethod: 'customer_token',
      },
    });
  } catch (error) {
    console.error('Upload via token error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
};
