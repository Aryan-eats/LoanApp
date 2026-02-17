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
} from '../services/documentService.js';
import prisma from '../config/prisma.js';

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

    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
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

    const result = await getLeadDocumentDownloadUrl(documentId);

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
        document: result.document,
        expiresIn: 3600,
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
