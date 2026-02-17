/**
 * Multer middleware for handling document uploads.
 *
 * - Accepts PDFs and common image types
 * - Max file size: 3 MB
 * - Stores files in memory (buffer) for direct upload to R2
 */

import multer from 'multer';
import { Request } from 'express';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Allowed types: PDF, JPEG, PNG, WebP, GIF`,
      ),
    );
  }
};

/**
 * Single-file upload middleware.
 * Field name expected: "document"
 */
export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('document');

/**
 * Multi-file upload middleware (up to 5 at once).
 * Field name expected: "documents"
 */
export const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).array('documents', 5);
