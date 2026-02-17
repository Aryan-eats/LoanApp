/**
 * Cloudflare R2 integration tests.
 *
 * These tests exercise the R2 document storage service against the live
 * R2 bucket. Environment variables R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME must be set.
 *
 * Test flow:
 *   1. Verify R2 client initialisation & bucket connectivity
 *   2. Upload a small test file
 *   3. Verify the file exists (HEAD)
 *   4. Generate a pre-signed download URL
 *   5. List documents for the test user
 *   6. Delete the test file
 *   7. Confirm deletion
 */

import { describe, it, expect, afterAll } from 'vitest';
import dotenv from 'dotenv';
dotenv.config();

import {
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getR2Client, R2_BUCKET, destroyR2Client } from '../config/r2.js';
import {
  uploadDocument,
  getDownloadUrl,
  deleteDocument,
  documentExists,
  listUserDocuments,
  buildObjectKey,
  sanitiseFilename,
} from '../services/documentService.js';

// ─── constants ─────────────────────────────────────────────

const TEST_USER_ID = '__test_user_r2__';
const TEST_FILENAME = 'test-document.pdf';
const TEST_CONTENT_TYPE = 'application/pdf';

// A tiny valid-ish PDF buffer (header only, enough for upload testing)
const TEST_BUFFER = Buffer.from('%PDF-1.4 test content for R2 integration', 'utf-8');

let uploadedKey: string | null = null;

// ─── teardown ──────────────────────────────────────────────

afterAll(async () => {
  // Clean up: delete the test file if it still exists
  if (uploadedKey) {
    try {
      await deleteDocument(uploadedKey);
    } catch {
      // ignore – may already have been deleted by tests
    }
  }
  destroyR2Client();
});

// ─── helper tests ──────────────────────────────────────────

describe('R2 helpers', () => {
  it('buildObjectKey returns correct path', () => {
    const key = buildObjectKey('user-123', 'myfile.pdf');
    expect(key).toBe('users/user-123/documents/myfile.pdf');
  });

  it('sanitiseFilename removes unsafe characters and prepends timestamp', () => {
    const safe = sanitiseFilename('my file (1).pdf');
    // dots, hyphens, underscores are kept; spaces and parens become underscores
    expect(safe).toMatch(/^\d+-my_file__1_.pdf$/);
  });

  it('sanitiseFilename truncates long names', () => {
    const longName = 'a'.repeat(300) + '.pdf';
    const safe = sanitiseFilename(longName);
    // timestamp-<200chars>
    const parts = safe.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts.slice(1).join('-').length).toBeLessThanOrEqual(200);
  });
});

// ─── R2 connection tests ───────────────────────────────────

describe('R2 connection', () => {
  it('creates an R2 client without throwing', () => {
    expect(() => getR2Client()).not.toThrow();
  });

  it('can reach the R2 endpoint (HeadBucket)', async () => {
    // Note: ListBuckets often fails with bucket-scoped API keys.
    // HeadBucket is the reliable connectivity check for R2.
    const client = getR2Client();
    const response = await client.send(
      new HeadBucketCommand({ Bucket: R2_BUCKET }),
    );
    expect(response.$metadata.httpStatusCode).toBe(200);
    console.log('  R2 connectivity OK – bucket:', R2_BUCKET);
  });

  it('can access the configured bucket (HeadBucket)', async () => {
    const client = getR2Client();
    const response = await client.send(
      new HeadBucketCommand({ Bucket: R2_BUCKET }),
    );
    expect(response.$metadata.httpStatusCode).toBe(200);
  });
});

// ─── Document CRUD tests ──────────────────────────────────

describe('R2 document operations', () => {
  it('uploads a document', async () => {
    const result = await uploadDocument(
      TEST_USER_ID,
      TEST_FILENAME,
      TEST_BUFFER,
      TEST_CONTENT_TYPE,
    );

    expect(result.bucket).toBe(R2_BUCKET);
    expect(result.key).toContain(`users/${TEST_USER_ID}/documents/`);
    expect(result.size).toBe(TEST_BUFFER.length);
    expect(result.contentType).toBe(TEST_CONTENT_TYPE);

    // Save key for subsequent tests
    uploadedKey = result.key;
    console.log('  Uploaded key:', uploadedKey);
  });

  it('confirms the uploaded document exists', async () => {
    expect(uploadedKey).toBeTruthy();
    const exists = await documentExists(uploadedKey!);
    expect(exists).toBe(true);
  });

  it('returns false for a non-existent document', async () => {
    const exists = await documentExists(
      'users/__nonexistent__/documents/nope.pdf',
    );
    expect(exists).toBe(false);
  });

  it('generates a pre-signed download URL', async () => {
    expect(uploadedKey).toBeTruthy();
    const url = await getDownloadUrl(uploadedKey!);
    expect(url).toMatch(/^https:\/\//);
    // URL should contain the bucket or account endpoint
    expect(url).toContain(R2_BUCKET);
    console.log('  Pre-signed URL (truncated):', url.substring(0, 120) + '…');
  });

  it('lists documents for the test user', async () => {
    const docs = await listUserDocuments(TEST_USER_ID);
    expect(docs.length).toBeGreaterThanOrEqual(1);

    const found = docs.find((d) => d.key === uploadedKey);
    expect(found).toBeDefined();
    expect(found!.size).toBe(TEST_BUFFER.length);
  });

  it('deletes the document', async () => {
    expect(uploadedKey).toBeTruthy();
    await deleteDocument(uploadedKey!);

    // Confirm it's gone
    const exists = await documentExists(uploadedKey!);
    expect(exists).toBe(false);

    // Clear so afterAll doesn't try again
    uploadedKey = null;
  });

  it('lists zero documents after deletion', async () => {
    const docs = await listUserDocuments(TEST_USER_ID);
    expect(docs.length).toBe(0);
  });
});
