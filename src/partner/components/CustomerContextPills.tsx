import { Link } from 'react-router-dom';
import {
  formatLeadScore,
  formatLeadSource,
  formatScoreBand,
  getCustomerRoute,
  getLeadSourceBadgeClass,
  getScoreBandBadgeClass,
  getConsentCount,
} from '../utils/customerCrm';
import type { CustomerConsentSummary } from '../types/partner-dashboard';
import { usePartnerTheme } from './PartnerThemeProvider';

interface CustomerContextPillsProps {
  customerId?: string | null;
  customerKey?: string | null;
  leadSource?: string | null;
  leadScore?: number | null;
  scoreBand?: string | null;
  consentSummary?: CustomerConsentSummary | null;
  className?: string;
  compact?: boolean;
}

export default function CustomerContextPills({
  customerId,
  customerKey,
  leadSource,
  leadScore,
  scoreBand,
  consentSummary,
  className = '',
  compact = false,
}: CustomerContextPillsProps) {
  const { isDark, theme } = usePartnerTheme();
  const consentCount = getConsentCount(consentSummary);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {customerKey && (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${
            isDark
              ? 'bg-slate-100/10 text-slate-200 ring-white/10'
              : 'bg-white text-slate-700 ring-slate-200'
          }`}
        >
          {customerKey}
        </span>
      )}

      {leadSource && (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${getLeadSourceBadgeClass(leadSource, theme)}`}>
          Source: {formatLeadSource(leadSource)}
        </span>
      )}

      {leadScore !== undefined && leadScore !== null && (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${
            isDark
              ? 'bg-white/5 text-slate-100 ring-white/10'
              : 'bg-slate-100 text-slate-700 ring-slate-200'
          }`}
        >
          Score: {formatLeadScore(leadScore)}
        </span>
      )}

      {scoreBand && (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${getScoreBandBadgeClass(scoreBand, theme)}`}>
          {formatScoreBand(scoreBand)}
        </span>
      )}

      {consentSummary && (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${
            isDark
              ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20'
              : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          }`}
        >
          Consent: {consentCount ?? 'Captured'}
        </span>
      )}

      {customerId && (
        <Link
          to={getCustomerRoute(customerId)}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 transition-colors ${
            isDark
              ? 'bg-indigo-500/10 text-indigo-300 ring-indigo-400/20 hover:bg-indigo-500/20'
              : 'bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100'
          } ${compact ? 'whitespace-nowrap' : ''}`}
        >
          View customer
        </Link>
      )}
    </div>
  );
}
