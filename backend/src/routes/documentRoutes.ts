/**
 * Document routes – upload, list, download, and delete user documents.
 *
 * All routes are protected (require authentication).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { upload, list, download, remove, uploadLeadDoc, getLeadDocUrl, deleteLeadDoc, updateLeadDocStatus, bulkUpdateLeadDocStatus } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle, MAX_FILE_SIZE } from '../middleware/upload.js';

/** Human-readable max upload size derived from the shared constant. */
const MAX_UPLOAD_DISPLAY = `${Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB`;

const router = Router();

// All document routes require authentication
router.use(protect);

/**
 * Multer error handling wrapper.
 * Catches file-size / file-type errors and returns a clean JSON response.
 */
const handleMulterErrors = (req: Request, res: Response, next: NextFunction) => {
  uploadSingle(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof Error ? err.message : 'File upload error';

      // Multer file size error
      if ((err as NodeJS.ErrnoException).code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          success: false,
          message: `File too large. Maximum size is ${MAX_UPLOAD_DISPLAY}`,
        });
        return;
      }

      res.status(400).json({ success: false, message });
      return;
    }
    next();
  });
};

// POST   /api/documents/upload   – upload a document (user-scoped)
router.post('/upload', handleMulterErrors, upload);

// POST   /api/documents/lead/:leadId/doc/:documentId/upload – upload a lead document
router.post('/lead/:leadId/doc/:documentId/upload', handleMulterErrors, uploadLeadDoc);

// GET    /api/documents/lead/:documentId/download – get download URL for a lead document
router.get('/lead/:documentId/download', getLeadDocUrl);

// PATCH  /api/documents/lead/bulk-status – bulk verify/reject lead documents (admin)
router.patch('/lead/bulk-status', bulkUpdateLeadDocStatus);

// PATCH  /api/documents/lead/:documentId/status – verify or reject a lead document (admin)
router.patch('/lead/:documentId/status', updateLeadDocStatus);

// DELETE /api/documents/lead/:documentId – delete (clear) a lead document slot
router.delete('/lead/:documentId', deleteLeadDoc);

// GET    /api/documents          – list user documents
router.get('/', list);

// GET    /api/documents/download/* – get a temporary download URL
router.get('/download/*key', download);

// DELETE /api/documents/*        – delete a document
router.delete('/*key', remove);

export default router;
