import crypto from 'crypto';

export type ConsentGrantLike = {
  id?: string;
  partnerDataId?: string | null;
  grantedAt?: Date | string | null;
  grantedTo?: string | null;
  revokedAt?: Date | string | null;
  expiresAt?: Date | string | null;
};

export type CustomerIdentityInput = {
  id: string;
  partnerId?: string | null;
  sourcePartnerDataId?: string | null;
  phone?: string | null;
  email?: string | null;
  panNumber?: string | null;
};

export type LeadMetadataInput = CustomerIdentityInput & {
  employmentType?: string | null;
  monthlyIncome?: unknown;
  companyName?: string | null;
  city?: string | null;
  pincode?: string | null;
  documentsCount?: number;
  consentGrants?: ConsentGrantLike[] | null;
};

export type ConsentSummary = {
  consented: boolean;
  totalGrantCount: number;
  activeGrantCount: number;
  latestGrantedAt?: string;
  latestGrantedTo?: string;
};

export type CustomerIdentity = {
  customerId: string;
  customerKey: string;
};

const normalizePiece = (value: string | null | undefined): string => {
  if (!value) return '';
  return value.trim().toLowerCase();
};

const toHash = (seed: string): string =>
  crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isConsentGrantActive = (grant: ConsentGrantLike, now: Date): boolean => {
  if (grant.revokedAt) return false;
  if (!grant.expiresAt) return true;
  const expiresAt = grant.expiresAt instanceof Date ? grant.expiresAt : new Date(grant.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
};

export const deriveCustomerIdentity = (input: CustomerIdentityInput): CustomerIdentity => {
  const customerId = input.sourcePartnerDataId?.trim() || input.id;
  const partnerId = normalizePiece(input.partnerId);
  const phone = normalizePiece(input.phone);
  const email = normalizePiece(input.email);
  const panNumber = normalizePiece(input.panNumber);
  const hasStableContact = phone || email || panNumber;
  const seed = hasStableContact
    ? [partnerId || 'partner:none', phone || 'phone:none', email || 'email:none', panNumber || 'pan:none'].join('|')
    : [partnerId || 'partner:none', input.sourcePartnerDataId?.trim() || '', input.id].join('|');

  return {
    customerId,
    customerKey: `customer:${toHash(seed)}`,
  };
};

export const deriveLeadSource = (sourcePartnerDataId?: string | null): 'manual' | 'stored_client' =>
  sourcePartnerDataId ? 'stored_client' : 'manual';

export const scoreBandForLeadScore = (score: number): 'low' | 'medium' | 'high' => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export const computeLeadScore = (input: LeadMetadataInput): number => {
  let score = 10;

  if (normalizePiece(input.phone)) score += 25;
  if (normalizePiece(input.email)) score += 10;
  if (normalizePiece(input.panNumber)) score += 15;
  if (normalizePiece(input.employmentType)) score += 10;
  if (normalizePiece(input.companyName)) score += 10;
  if (normalizePiece(input.city)) score += 5;
  if (normalizePiece(input.pincode)) score += 5;
  if (input.sourcePartnerDataId?.trim()) score += 5;

  const monthlyIncome = toNumber(input.monthlyIncome);
  if (monthlyIncome >= 100_000) score += 15;
  else if (monthlyIncome >= 50_000) score += 12;
  else if (monthlyIncome >= 25_000) score += 8;
  else if (monthlyIncome > 0) score += 4;

  if ((input.documentsCount ?? 0) > 0) score += 5;

  return Math.min(100, score);
};

export const summarizeConsentGrants = (grants?: ConsentGrantLike[] | null): ConsentSummary => {
  const normalized = (grants ?? []).filter(Boolean);
  const now = new Date();
  const activeGrants = normalized.filter((grant) => isConsentGrantActive(grant, now));
  const latestGrant = normalized
    .map((grant) => ({
      grant,
      grantedAt: grant.grantedAt instanceof Date
        ? grant.grantedAt
        : grant.grantedAt
          ? new Date(grant.grantedAt)
          : null,
    }))
    .filter(({ grantedAt }) => grantedAt && !Number.isNaN(grantedAt.getTime()))
    .sort((a, b) => (b.grantedAt!.getTime() - a.grantedAt!.getTime()))[0];

  return {
    consented: activeGrants.length > 0,
    totalGrantCount: normalized.length,
    activeGrantCount: activeGrants.length,
    latestGrantedAt: latestGrant?.grantedAt?.toISOString(),
    latestGrantedTo: latestGrant?.grant.grantedTo ?? undefined,
  };
};

export const matchesCustomerSearch = (
  input: CustomerIdentityInput & {
    fullName?: string | null;
  },
  rawSearch: string
): boolean => {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;

  const identity = deriveCustomerIdentity(input);
  return [
    input.id,
    identity.customerId,
    identity.customerKey,
    input.fullName ?? '',
    input.phone ?? '',
    input.email ?? '',
    input.panNumber ?? '',
  ].some((value) => normalizePiece(value).includes(search));
};

export const matchesCustomerIdentity = (
  candidate: CustomerIdentityInput & { fullName?: string | null },
  reference: CustomerIdentityInput & { fullName?: string | null }
): boolean => {
  if (candidate.sourcePartnerDataId && reference.id === candidate.sourcePartnerDataId) {
    return true;
  }

  if (reference.sourcePartnerDataId && candidate.id === reference.sourcePartnerDataId) {
    return true;
  }

  const candidateIdentity = deriveCustomerIdentity(candidate);
  const referenceIdentity = deriveCustomerIdentity(reference);
  if (candidateIdentity.customerKey === referenceIdentity.customerKey) {
    return true;
  }

  const candidatePhone = normalizePiece(candidate.phone);
  const referencePhone = normalizePiece(reference.phone);
  const candidateEmail = normalizePiece(candidate.email);
  const referenceEmail = normalizePiece(reference.email);
  const candidatePan = normalizePiece(candidate.panNumber);
  const referencePan = normalizePiece(reference.panNumber);

  return (
    !!candidatePhone && candidatePhone === referencePhone ||
    !!candidateEmail && candidateEmail === referenceEmail ||
    !!candidatePan && candidatePan === referencePan
  );
};
