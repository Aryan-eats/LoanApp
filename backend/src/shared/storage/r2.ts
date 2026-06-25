/**
 * Shared Cloudflare R2 client singleton.
 *
 * Uses the S3-compatible API provided by Cloudflare R2.
 * All document storage modules import from here to share a single client instance.
 */

import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

/**
 * Returns the shared R2 (S3-compatible) client instance.
 * Creates the client lazily on first call.
 */
export const getR2Client = (): S3Client => {
  if (client) return client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 configuration is incomplete. Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
        'and R2_SECRET_ACCESS_KEY are set in the environment.'
    );
  }

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  console.log('✅ Cloudflare R2 client initialised');
  return client;
};

/**
 * The R2 bucket name for document storage.
 */
export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'docs-storage';

/**
 * Destroy the R2 client (useful for graceful shutdown / tests).
 */
export const destroyR2Client = (): void => {
  if (client) {
    client.destroy();
    client = null;
    console.log('🛑 R2 client destroyed');
  }
};
