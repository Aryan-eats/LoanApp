import type { CustomerActivityItem, CustomerConsentSummary } from '../types/partner-dashboard';
import type { PartnerTheme } from '../components/PartnerThemeProvider';

type CustomerCrmLikeRecord = {
  customerId?: string;
  customerKey?: string;
  leadSource?: string | null;
  leadScore?: number | null;
  scoreBand?: string | null;
  consentSummary?: CustomerConsentSummary | null;
  client?: {
    id?: string;
    customerId?: string;
    customerKey?: string;
    leadSource?: string | null;
    leadScore?: number | null;
    scoreBand?: string | null;
    consentSummary?: CustomerConsentSummary | null;
  };
};

const leadSourceLabels: Record<string, string> = {
  partner: 'Partner',
  stored_client: 'Stored Client',
  website: 'Website',
  referral: 'Referral',
  manual: 'Manual',
  import: 'Imported',
  admin: 'Admin',
  system: 'System',
};

const scoreBandLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  unknown: 'Unknown',
};

const sourceBadgeClasses: Record<string, string> = {
  partner: 'bg-indigo-500/10 text-indigo-300 ring-indigo-400/20',
  stored_client: 'bg-cyan-500/10 text-cyan-300 ring-cyan-400/20',
  website: 'bg-blue-500/10 text-blue-300 ring-blue-400/20',
  referral: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
  manual: 'bg-slate-500/10 text-slate-300 ring-slate-400/20',
  import: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
  admin: 'bg-violet-500/10 text-violet-300 ring-violet-400/20',
  system: 'bg-slate-500/10 text-slate-300 ring-slate-400/20',
};

const scoreBandClasses: Record<string, string> = {
  low: 'bg-slate-500/10 text-slate-300 ring-slate-400/20',
  medium: 'bg-amber-500/10 text-amber-300 ring-amber-400/20',
  high: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
  unknown: 'bg-slate-500/10 text-slate-300 ring-slate-400/20',
};

const lightSourceBadgeClasses: Record<string, string> = {
  partner: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  stored_client: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  website: 'bg-blue-50 text-blue-700 ring-blue-200',
  referral: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  manual: 'bg-slate-100 text-slate-700 ring-slate-200',
  import: 'bg-amber-50 text-amber-700 ring-amber-200',
  admin: 'bg-violet-50 text-violet-700 ring-violet-200',
  system: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const lightScoreBandClasses: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 ring-slate-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  high: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  unknown: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export const getCustomerRoute = (customerId: string) => `/partner/customers/${customerId}`;

export const formatLeadSource = (source?: string | null) => {
  if (!source) return 'Unknown';
  return leadSourceLabels[source] ?? source.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatScoreBand = (scoreBand?: string | null) => {
  if (!scoreBand) return 'Unknown';
  return scoreBandLabels[scoreBand] ?? scoreBand.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getLeadSourceBadgeClass = (source?: string | null, theme: PartnerTheme = 'dark') => {
  if (theme === 'light') {
    return source
      ? lightSourceBadgeClasses[source] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
      : 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  return source
    ? sourceBadgeClasses[source] ?? 'bg-slate-500/10 text-slate-300 ring-slate-400/20'
    : 'bg-slate-500/10 text-slate-300 ring-slate-400/20';
};

export const getScoreBandBadgeClass = (scoreBand?: string | null, theme: PartnerTheme = 'dark') => {
  if (theme === 'light') {
    return scoreBand
      ? lightScoreBandClasses[scoreBand] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
      : 'bg-slate-100 text-slate-700 ring-slate-200';
  }

  return scoreBand
    ? scoreBandClasses[scoreBand] ?? 'bg-slate-500/10 text-slate-300 ring-slate-400/20'
    : 'bg-slate-500/10 text-slate-300 ring-slate-400/20';
};

export const formatLeadScore = (leadScore?: number | null) => {
  if (leadScore === undefined || leadScore === null || Number.isNaN(leadScore)) {
    return 'N/A';
  }
  return `${leadScore}/100`;
};

export const resolveCustomerId = (
  record?: CustomerCrmLikeRecord | null
) => record?.customerId ?? record?.client?.customerId ?? record?.client?.id ?? null;

export const resolveCustomerKey = (
  record?: CustomerCrmLikeRecord | null
) => record?.customerKey ?? record?.client?.customerKey ?? null;

export const resolveLeadSource = (
  record?: CustomerCrmLikeRecord | null
) => record?.leadSource ?? record?.client?.leadSource ?? null;

export const resolveLeadScore = (
  record?: CustomerCrmLikeRecord | null
) => record?.leadScore ?? record?.client?.leadScore ?? null;

export const resolveScoreBand = (
  record?: CustomerCrmLikeRecord | null
) => record?.scoreBand ?? record?.client?.scoreBand ?? null;

export const resolveConsentSummary = (
  record?: CustomerCrmLikeRecord | null
) => record?.consentSummary ?? record?.client?.consentSummary ?? null;

export const getConsentCount = (consent?: CustomerConsentSummary | null) => {
  if (!consent) return null;
  const fields = [consent.dataShare, consent.contact, consent.terms, consent.privacyPolicy];
  return fields.filter(Boolean).length;
};

export const normalizeActivityItem = (
  item: CustomerActivityItem,
  fallbackName?: string
) => ({
  id: item.id,
  leadId: item.leadId,
  customerId: item.customerId,
  customerKey: item.customerKey,
  status: item.type,
  title: item.title ?? item.type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
  description: item.description,
  timestamp: item.timestamp,
  actorName: item.actorName ?? fallbackName,
  source: item.source,
});
