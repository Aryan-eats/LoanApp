import { NextFunction, Request, Response } from 'express';
import { encryptField, encryptForGPSIndia, isVaultCiphertext } from '../services/vault.js';

type MutableBody = Record<string, unknown>;

const PARTNER_DATA_PII_FIELDS = [
  'fullName',
  'phone',
  'email',
  'dateOfBirth',
  'panNumber',
] as const;

const LEAD_PII_FIELDS = [
  'dateOfBirth',
  'panNumber',
  'aadhaarNumber',
  'clientDateOfBirth',
  'clientPanNumber',
  'clientAadhaar',
] as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const maybeEncryptWith = async (
  value: unknown,
  encryptor: (plaintext: string) => Promise<string>
): Promise<unknown> => {
  if (!isNonEmptyString(value)) return value;
  if (isVaultCiphertext(value)) return value;
  return encryptor(value);
};

const getBody = (req: Request): MutableBody => {
  if (!req.body || typeof req.body !== 'object') {
    req.body = {};
  }
  return req.body as MutableBody;
};

const applyPartnerEncryption = async (
  body: MutableBody,
  partnerOrgId: string
): Promise<void> => {
  for (const field of PARTNER_DATA_PII_FIELDS) {
    body[field] = await maybeEncryptWith(body[field], (plaintext) =>
      encryptField(partnerOrgId, plaintext)
    );
  }

  body.encryptionVersion = 1;
};

export const encryptPartnerDataPII = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }

    const body = getBody(req);
    if (Array.isArray(body.clients)) {
      for (const entry of body.clients) {
        if (entry && typeof entry === 'object') {
          await applyPartnerEncryption(entry as MutableBody, partnerOrgId);
        }
      }
    } else {
      await applyPartnerEncryption(body, partnerOrgId);
    }

    next();
  } catch (error) {
    console.error('encryptPartnerDataPII middleware error:', error);
    res.status(500).json({ success: false, message: 'Failed to encrypt partner data fields' });
  }
};

export const encryptLeadPII = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = getBody(req);

    for (const field of LEAD_PII_FIELDS) {
      body[field] = await maybeEncryptWith(body[field], encryptForGPSIndia);
    }

    body.encryptionVersion = 1;
    next();
  } catch (error) {
    console.error('encryptLeadPII middleware error:', error);
    res.status(500).json({ success: false, message: 'Failed to encrypt lead fields' });
  }
};
