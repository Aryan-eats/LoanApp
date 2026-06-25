/**
 * Shared Multer middleware for handling document uploads.
 *
 * - Accepts PDFs and common image types
 * - Max file size: 3 MB
 * - Stores files in memory (buffer) for direct upload to R2
 * - Validates file magic bytes to prevent MIME spoofing
 */

import multer from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

const MIME_TYPE_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/* ------------------------------------------------------------------ */
/*  Magic-byte signatures for each allowed MIME type.                  */
/*  A file must start with at least ONE of the listed byte sequences  */
/*  to be accepted.                                                   */
/* ------------------------------------------------------------------ */
interface MagicSignature {
  mime: string;
  /** Byte offset where the signature starts (usually 0). */
  offset: number;
  /** Expected bytes at that offset. */
  bytes: number[];
}

const MAGIC_SIGNATURES: MagicSignature[] = [
  // PDF  – "%PDF"
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },

  // JPEG – SOI marker 0xFF 0xD8 0xFF
  { mime: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },

  // PNG  – 8-byte header
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },

  // WebP – "RIFF" + 4 bytes size + "WEBP"
  { mime: 'image/webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },          // "RIFF"
  // Also verify bytes 8-11 == "WEBP" (checked separately below)

  // GIF87a
  { mime: 'image/gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
  // GIF89a
  { mime: 'image/gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
];

/**
 * Check whether `buf` starts (at `offset`) with the given byte sequence.
 */
function bufferStartsWith(buf: Buffer, offset: number, expected: number[]): boolean {
  if (buf.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (buf[offset + i] !== expected[i]) return false;
  }
  return true;
}

/**
 * Normalizes equivalent MIME aliases so downstream checks compare canonical values.
 */
function normalizeMimeType(mime: string): string {
  return MIME_TYPE_ALIASES[mime] ?? mime;
}

/**
 * Detects the actual file type from the file signature rather than trusting
 * the client-supplied Content-Type header.
 */
export function detectFileMimeType(buf: Buffer): string | null {
  if (bufferStartsWith(buf, 0, [0x52, 0x49, 0x46, 0x46]) && bufferStartsWith(buf, 8, [0x57, 0x45, 0x42, 0x50])) {
    return 'image/webp';
  }

  for (const signature of MAGIC_SIGNATURES) {
    if (signature.mime === 'image/webp') {
      continue;
    }

    if (bufferStartsWith(buf, signature.offset, signature.bytes)) {
      return signature.mime;
    }
  }

  return null;
}

/**
 * Returns `true` when the buffer's magic bytes match the declared MIME type.
 */
function magicBytesMatchMime(buf: Buffer, mime: string): boolean {
  const normalizedMime = normalizeMimeType(mime);
  return detectFileMimeType(buf) === normalizedMime;
}

function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(normalizeMimeType(mime));
}

/* ------------------------------------------------------------------ */
/*  Multer file filter (header-level, first gate)                      */
/* ------------------------------------------------------------------ */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (isAllowedMimeType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Allowed types: PDF, JPEG, PNG, WebP, GIF`,
      ),
    );
  }
};

/* ------------------------------------------------------------------ */
/*  Post-multer magic-byte validation middleware                       */
/*  Place AFTER uploadSingle / uploadMultiple in route chain.          */
/* ------------------------------------------------------------------ */

/**
 * Validates that the uploaded file's actual content (magic bytes) matches
 * its declared MIME type. Prevents MIME spoofing attacks where an attacker
 * sends a malicious file with a forged Content-Type header.
 */
export const validateMagicBytes = (req: Request, res: Response, next: NextFunction): void => {
  const singleFile = (req as Request & { file?: Express.Multer.File }).file;
  const multiFiles = (req as Request & { files?: Express.Multer.File[] }).files;

  const files: Express.Multer.File[] = [];
  if (singleFile) files.push(singleFile);
  if (Array.isArray(multiFiles)) files.push(...multiFiles);

  for (const file of files) {
    if (!file.buffer || file.buffer.length === 0) continue;

    const detectedMimeType = detectFileMimeType(file.buffer);
    if (!detectedMimeType) {
      res.status(422).json({
        success: false,
        message: `File "${file.originalname}" failed content validation. Only genuine PDF, JPEG, PNG, WebP, or GIF files are allowed.`,
      });
      return;
    }

    if (!magicBytesMatchMime(file.buffer, file.mimetype)) {
      res.status(422).json({
        success: false,
        message: `File "${file.originalname}" failed content validation – the file content does not match its declared type (${file.mimetype}). Please upload a genuine file.`,
      });
      return;
    }

    file.mimetype = detectedMimeType;
  }

  next();
};

/* ------------------------------------------------------------------ */
/*  Multer instances                                                   */
/* ------------------------------------------------------------------ */

/**
 * Single-file upload middleware.
 * Field name expected: "document"
 */
const singleUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('document');
export const uploadSingle: RequestHandler = (req, res, next) => {
  singleUploadMiddleware(req, res, next);
};

/**
 * Multi-file upload middleware (up to 5 at once).
 * Field name expected: "documents"
 */
const multipleUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).array('documents', 5);
export const uploadMultiple: RequestHandler = (req, res, next) => {
  multipleUploadMiddleware(req, res, next);
};
