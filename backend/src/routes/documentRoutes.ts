/**
 * Document routes – upload, list, download, and delete user documents.
 *
 * All routes are protected (require authentication).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { upload, list, download, remove, uploadLeadDoc, getLeadDocUrl } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

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
          message: 'File too large. Maximum size is 3 MB',
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

// GET    /api/documents          – list user documents
router.get('/', list);

// GET    /api/documents/download/* – get a temporary download URL
router.get('/download/*key', download);

// DELETE /api/documents/*        – delete a document
router.delete('/*key', remove);

export default router;
