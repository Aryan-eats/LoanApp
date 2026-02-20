/**
 * Document storage service – Cloudflare R2 + PostgreSQL metadata.
 *
 * Provides upload, download-URL generation, deletion, and listing
 * for user documents stored in R2, with metadata persisted in Postgres.
 *
 * Object key convention:
 *   - User documents: users/{userId}/documents/{filename}
 *   - Lead documents: leads/{leadId}/documents/{filename}
 */

import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, R2_BUCKET } from '../config/r2.js';
import prisma from '../config/prisma.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

export interface DocumentMeta {
  key: string;
  filename: string;
  size: number;
  lastModified: Date | undefined;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the S3 object key for a user document.
 */
export const buildObjectKey = (userId: string, filename: string): string =>
  `users/${userId}/documents/${filename}`;

/**
 * Build the S3 object key for a lead document.
 */
export const buildLeadObjectKey = (leadId: string, filename: string): string =>
  `leads/${leadId}/documents/${filename}`;

/**
 * Sanitise the original filename: replace unsafe characters, limit length.
 */
export const sanitiseFilename = (original: string): string => {
  const timestamp = Date.now();
  // Keep only alphanumerics, dots, hyphens, underscores
  const safe = original.replace(/[^a-zA-Z0-9.\-_]/g, '_').substring(0, 200);
  // Fallback when the sanitised name is empty or contains no meaningful chars
  const meaningful = safe.replace(/^_+$/, ''); // all-underscore → empty
  const name = meaningful.length > 0 ? safe : 'file';
  // Prefix with timestamp to avoid collisions
  return `${timestamp}-${name}`;
};

/* ------------------------------------------------------------------ */
/*  Core operations                                                    */
/* ------------------------------------------------------------------ */

/**
 * Upload a buffer to R2.
 */
export const uploadDocument = async (
  userId: string,
  originalFilename: string,
  buffer: Buffer,
  contentType: string,
): Promise<UploadResult> => {
  const client = getR2Client();
  const filename = sanitiseFilename(originalFilename);
  const key = buildObjectKey(userId, filename);

  const params: PutObjectCommandInput = {
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentLength: buffer.length,
    Metadata: {
      userId,
      originalFilename,
      uploadedAt: new Date().toISOString(),
    },
  };

  await client.send(new PutObjectCommand(params));

  return {
    key,
    bucket: R2_BUCKET,
    size: buffer.length,
    contentType,
  };
};

/**
 * Upload a lead document to R2 and persist metadata in Postgres.
 *
 * @param leadId       – the lead this document belongs to
 * @param documentId   – the existing LeadDocument row to update
 * @param originalFilename – the user's original filename
 * @param buffer       – file contents
 * @param mimeType     – MIME type (e.g. application/pdf)
 * @param uploadedBy   – who uploaded (e.g. "Admin", user name)
 */
export const uploadLeadDocument = async (
  leadId: string,
  documentId: string,
  originalFilename: string,
  buffer: Buffer,
  mimeType: string,
  uploadedBy: string,
) => {
  const client = getR2Client();
  const filename = sanitiseFilename(originalFilename);
  const key = buildLeadObjectKey(leadId, filename);

  // 1. Upload to R2
  const params: PutObjectCommandInput = {
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ContentLength: buffer.length,
    Metadata: {
      leadId,
      documentId,
      originalFilename,
      uploadedAt: new Date().toISOString(),
    },
  };

  await client.send(new PutObjectCommand(params));

  // 2. Update the row in Postgres (no ephemeral URL stored – generate on demand)
  const updatedDoc = await prisma.leadDocument.update({
    where: { id: documentId },
    data: {
      fileName: originalFilename,
      fileSize: `${(buffer.length / 1024).toFixed(1)} KB`,
      r2ObjectKey: key,
      mimeType,
      uploadedBy,
      uploadedAt: new Date(),
      status: 'uploaded',
    },
  });

  return updatedDoc;
};

/**
 * Get a fresh pre-signed download URL for a lead document by its ID.
 */
export const getLeadDocumentDownloadUrl = async (
  documentId: string,
): Promise<{ url: string; document: { id: string; fileName: string; mimeType: string | null } }> => {
  const doc = await prisma.leadDocument.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    throw new Error('Document not found');
  }

  if (!doc.r2ObjectKey) {
    throw new Error('Document has not been uploaded yet');
  }

  const url = await getDownloadUrl(doc.r2ObjectKey);

  return {
    url,
    document: {
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
    },
  };
};

/**
 * Update the status of a lead document (verify / reject).
 *
 * @param documentId     – the LeadDocument row ID
 * @param status         – new status: 'verified' or 'rejected'
 * @param rejectionReason – required when rejecting
 */
export const updateLeadDocumentStatus = async (
  documentId: string,
  status: 'verified' | 'rejected',
  rejectionReason?: string,
) => {
  const data: { status: 'verified' | 'rejected'; rejectionReason?: string | null } = { status };
  if (status === 'rejected') {
    data.rejectionReason = rejectionReason || 'Rejected by admin';
  } else {
    // Clear any prior rejection reason when verifying
    data.rejectionReason = null;
  }

  const updatedDoc = await prisma.leadDocument.update({
    where: { id: documentId },
    data,
  });

  return updatedDoc;
};

/**
 * Bulk-update the status of multiple lead documents.
 */
export const bulkUpdateLeadDocumentStatus = async (
  documentIds: string[],
  status: 'verified' | 'rejected',
  rejectionReason?: string,
) => {
  const data: { status: 'verified' | 'rejected'; rejectionReason?: string | null } = { status };
  if (status === 'rejected') {
    data.rejectionReason = rejectionReason || 'Rejected by admin';
  } else {
    data.rejectionReason = null;
  }

  const result = await prisma.leadDocument.updateMany({
    where: { id: { in: documentIds } },
    data,
  });

  return result;
};

/**
 * Generate a temporary (pre-signed) download URL.
 * @param key  – full object key
 * @param expiresInSeconds – default 3600 (1 hour)
 */
export const getDownloadUrl = async (
  key: string,
  expiresInSeconds = 3600,
): Promise<string> => {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
};

/**
 * Delete a single document from R2.
 */
export const deleteDocument = async (key: string): Promise<void> => {
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  );
};

/**
 * Check whether a document exists.
 */
export const documentExists = async (key: string): Promise<boolean> => {
  const client = getR2Client();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch (err: unknown) {
    // Only treat NotFound / 404 as "does not exist"
    const name = (err as { name?: string })?.name;
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (name === 'NotFound' || name === 'NoSuchKey' || status === 404) {
      return false;
    }
    // Propagate all other errors (permissions, network, throttling, etc.)
    throw err;
  }
};

/**
 * List all documents for a given user.
 */
export const listUserDocuments = async (
  userId: string,
): Promise<DocumentMeta[]> => {
  const client = getR2Client();
  const prefix = `users/${userId}/documents/`;

  const allContents: { Key?: string; Size?: number; LastModified?: Date }[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    if (response.Contents) {
      allContents.push(...response.Contents);
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return allContents.map((obj) => ({
    key: obj.Key!,
    filename: obj.Key!.replace(prefix, ''),
    size: obj.Size ?? 0,
    lastModified: obj.LastModified,
  }));
};
