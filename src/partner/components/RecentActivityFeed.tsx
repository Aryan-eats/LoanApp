import { useMemo } from 'react';
import { Activity, ArrowRight, UploadCloud, CheckCircle2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CustomerActivityItem, Lead, LocalLead } from '../types/partner-dashboard';
import {
  getCustomerRoute,
  normalizeActivityItem,
  resolveCustomerId,
  resolveCustomerKey,
} from '../utils/customerCrm';
import { usePartnerTheme } from './PartnerThemeProvider';

interface RecentActivityFeedProps {
  title?: string;
  leads?: Lead[];
  localLeads?: LocalLead[];
  activityItems?: CustomerActivityItem[];
  limit?: number;
  emptyMessage?: string;
}

type NormalizedActivity = {
  id: string;
  status: string;
  title: string;
  description?: string;
  timestamp: string;
  leadId?: string;
  customerId?: string;
  customerKey?: string;
};

const getEventIcon = (status: string) => {
  switch (status) {
    case 'docs_uploaded':
    case 'docs_collected':
      return <UploadCloud size={14} className="text-cyan-600" />;
    case 'approved':
    case 'disbursed':
      return <CheckCircle2 size={14} className="text-emerald-600" />;
    case 'rejected':
      return <RotateCcw size={14} className="text-red-600" />;
    default:
      return <Activity size={14} className="text-blue-600" />;
  }
};

const formatTimeAgo = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatStatusTitle = (status: string, name: string) => {
  switch (status) {
    case 'submitted':
      return `${name}'s case moved to submission`;
    case 'docs_uploaded':
      return `Documents uploaded for ${name}`;
    case 'approved':
      return `Loan approved for ${name}`;
    case 'disbursed':
      return `${name}'s loan was disbursed`;
    case 'rejected':
      return `${name}'s application was rejected`;
    case 'bank_processing':
      return `${name}'s file is with the bank`;
    default:
      return `Status updated for ${name}`;
  }
};

export default function RecentActivityFeed({
  title = 'Recent Activity',
  leads = [],
  localLeads = [],
  activityItems,
  limit = 6,
  emptyMessage = 'No recent activity',
}: RecentActivityFeedProps) {
  const { isDark } = usePartnerTheme();
  const activities = useMemo(() => {
    if (activityItems && activityItems.length > 0) {
      return activityItems
        .map<NormalizedActivity>((item) => normalizeActivityItem(item))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    }

    const allEvents: NormalizedActivity[] = [];

    leads.forEach((lead) => {
      const customerId = resolveCustomerId(lead) ?? undefined;
      const customerKey = resolveCustomerKey(lead) ?? undefined;
      const clientName = lead.client.fullName;

      if (lead.activityItems && lead.activityItems.length > 0) {
        lead.activityItems.forEach((item) => {
          const normalized = normalizeActivityItem(item, clientName);
          allEvents.push({
            id: normalized.id,
            status: normalized.status,
            title: normalized.title,
            description: normalized.description,
            timestamp: normalized.timestamp,
            leadId: normalized.leadId ?? lead.id,
            customerId: normalized.customerId ?? customerId,
            customerKey: normalized.customerKey ?? customerKey,
          });
        });
        return;
      }

      lead.timeline.forEach((event) => {
        allEvents.push({
          id: event.id,
          status: event.status,
          title: formatStatusTitle(event.status, clientName),
          description: event.note,
          timestamp: event.timestamp,
          leadId: lead.id,
          customerId,
          customerKey,
        });
      });
    });

    localLeads.forEach((lead) => {
      const customerId = resolveCustomerId(lead) ?? undefined;
      const customerKey = resolveCustomerKey(lead) ?? undefined;

      if (lead.activityItems && lead.activityItems.length > 0) {
        lead.activityItems.forEach((item) => {
          const normalized = normalizeActivityItem(item, lead.fullName);
          allEvents.push({
            id: normalized.id,
            status: normalized.status,
            title: normalized.title,
            description: normalized.description,
            timestamp: normalized.timestamp,
            leadId: normalized.leadId,
            customerId: normalized.customerId ?? customerId,
            customerKey: normalized.customerKey ?? customerKey,
          });
        });
        return;
      }

      allEvents.push({
        id: lead.id,
        status: lead.localStatus,
        title: `Stored client updated for ${lead.fullName}`,
        description: lead.notes,
        timestamp: lead.updatedAt,
        customerId,
        customerKey,
      });
    });

    return allEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [activityItems, leads, localLeads, limit]);

  return (
    <div
      className={`backdrop-blur-sm rounded-xl p-5 flex flex-col min-h-[300px] transition-colors ${
        isDark
          ? 'bg-slate-900/50 border border-white/10'
          : 'bg-white/90 border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Activity size={18} />
          </div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h3>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activities.length > 0 ? (
          <div className="absolute inset-0 overflow-y-auto pr-2">
            <div className={`space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:from-transparent before:to-transparent ${isDark ? 'before:via-white/10' : 'before:via-slate-200'}`}>
              {activities.map((item, idx) => {
                const linkTarget = item.customerId
                  ? getCustomerRoute(item.customerId)
                  : item.leadId
                    ? `/partner/leads/${item.leadId}`
                    : null;
                return (
                  <div key={`${item.id}-${idx}`} className="relative flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full border-2 shadow-sm flex items-center justify-center shrink-0 z-10 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      {getEventIcon(item.status)}
                    </div>
                    <div
                      className={`flex-1 rounded-xl p-3 border mt-0.5 transition-colors ${
                        isDark
                          ? 'bg-white/5 border-white/5 hover:bg-white/10'
                          : 'bg-slate-50 border-slate-100 hover:bg-white'
                      }`}
                    >
                      <p className={`text-sm leading-snug ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.title}</p>
                      {item.description && <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{item.description}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {formatTimeAgo(item.timestamp)}
                        </span>
                        {linkTarget && (
                          <Link
                            to={linkTarget}
                            className={`text-sm font-semibold flex items-center justify-center gap-1 min-h-[48px] px-2 -mr-2 rounded-lg transition-colors ${
                              isDark
                                ? 'text-indigo-400 hover:text-indigo-300 hover:bg-white/5'
                                : 'text-indigo-600 hover:text-indigo-500 hover:bg-indigo-50'
                            }`}
                          >
                            {item.customerId ? 'View customer' : 'View lead'} <ArrowRight size={16} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center h-full text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            <Activity size={32} className={`mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
