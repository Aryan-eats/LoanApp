import crypto from 'crypto';

const LEAD_TOKEN_SECRET = process.env.LEAD_TOKEN_SECRET || 'change-me-lead-token-secret';

export const getSystemPartnerId = (): string | null => {
  const id = process.env.SYSTEM_PARTNER_ID;
  return id && id.trim().length > 0 ? id : null;
};

export const generateLeadToken = (leadId: string): string =>
  crypto.createHmac('sha256', LEAD_TOKEN_SECRET).update(leadId).digest('hex');

export const verifyLeadToken = (leadId: string, token: string): boolean => {
  const expected = generateLeadToken(leadId);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
};
