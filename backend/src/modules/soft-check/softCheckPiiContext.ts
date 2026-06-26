import { decryptAsGPSIndia, decryptField } from '../../shared/security/encryption.js';

type StoredClientSoftCheckFields = {
  fullName?: string | null;
  phone?: string | null;
};

type LeadSoftCheckFields = {
  clientFullName?: string | null;
  clientPhone?: string | null;
};

const decryptOptional = async (
  value: string | null | undefined,
  decrypt: (value: string) => Promise<string>
): Promise<string | null | undefined> =>
  typeof value === 'string' ? decrypt(value) : value;

export const decryptStoredClientSoftCheckPii = async <T extends StoredClientSoftCheckFields>(
  partnerOrgId: string,
  storedClient: T | null
): Promise<T | null> => {
  if (!storedClient) return null;

  return {
    ...storedClient,
    fullName: await decryptOptional(storedClient.fullName, (value) => decryptField(partnerOrgId, value)),
    phone: await decryptOptional(storedClient.phone, (value) => decryptField(partnerOrgId, value)),
  };
};

export const decryptLeadSoftCheckPii = async <T extends LeadSoftCheckFields>(
  lead: T | null
): Promise<T | null> => {
  if (!lead) return null;

  return {
    ...lead,
    clientFullName: await decryptOptional(lead.clientFullName, decryptAsGPSIndia),
    clientPhone: await decryptOptional(lead.clientPhone, decryptAsGPSIndia),
  };
};
