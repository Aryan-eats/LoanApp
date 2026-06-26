import { Router, Request, Response, NextFunction } from 'express';
import { listFlatDocRequirements, listPublicDocRequirements } from '../doc-requirements/docRequirements.controller.js';
import { protect } from '../../shared/middleware/auth.js';
import { cacheControl } from '../../shared/middleware/cacheControl.js';
import { uploadSingle, MAX_FILE_SIZE, validateMagicBytes } from '../../shared/middleware/upload.js';
import { validateUUID, validateUUIDParam } from '../../shared/middleware/validateUUID.js';
import {
  bulkUpdateLeadDocStatus,
  deleteLeadDoc,
  download,
  generateUploadToken,
  getLeadDocUrl,
  list,
  remove,
  updateLeadDocStatus,
  upload,
  uploadLeadDoc,
  uploadViaToken,
  validateUploadToken,
} from './document.controller.js';

const MAX_UPLOAD_DISPLAY = `${Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB`;

const router = Router();

router.param('leadId', validateUUIDParam);
router.param('documentId', validateUUIDParam);

const handleMulterErrors = (req: Request, res: Response, next: NextFunction) => {
  uploadSingle(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'File upload error';

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

router.get('/upload-via-token', validateUploadToken);
router.post('/upload-via-token', handleMulterErrors, validateMagicBytes, uploadViaToken);
router.get('/upload-via-token/:token', validateUploadToken);
router.post('/upload-via-token/:token', handleMulterErrors, validateMagicBytes, uploadViaToken);

router.use(protect);
router.use(validateUUID);

router.get('/req-docs', cacheControl(30), listPublicDocRequirements);
router.get('/req-docs/flat', listFlatDocRequirements);

router.post('/upload', handleMulterErrors, validateMagicBytes, upload);
router.post('/lead/:leadId/doc/:documentId/upload', handleMulterErrors, validateMagicBytes, uploadLeadDoc);
router.get('/lead/:documentId/download', getLeadDocUrl);
router.patch('/lead/bulk-status', bulkUpdateLeadDocStatus);
router.patch('/lead/:documentId/status', updateLeadDocStatus);
router.delete('/lead/:documentId', deleteLeadDoc);
router.post('/lead/:documentId/upload-token', generateUploadToken);
router.get('/', list);
router.get('/download/*key', download);
router.delete('/*key', remove);

export default router;
