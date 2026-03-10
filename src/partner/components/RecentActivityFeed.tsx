import { useMemo } from 'react';
import type { Lead, LeadTimelineEvent } from '../types/partner-dashboard';
import { Activity, ArrowRight, UploadCloud, CheckCircle2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecentActivityFeedProps {
  leads: Lead[];
}

export default function RecentActivityFeed({ leads }: RecentActivityFeedProps) {
  const activities = useMemo(() => {
    const allEvents: { leadId: string, clientName: string, event: LeadTimelineEvent }[] = [];
    
    leads.forEach(l => {
      l.timeline.forEach(event => {
        allEvents.push({
          leadId: l.id,
          clientName: l.client.fullName,
          event
        });
      });
    });

    return allEvents
      .sort((a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime())
      .slice(0, 6); // Top 6 recent events
  }, [leads]);

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

  const getEventFormat = (status: string, clientName: string) => {
    switch (status) {
      case 'submitted': return <span><span className="font-semibold text-slate-800">{clientName}'s</span> case moved to submission</span>;
      case 'docs_uploaded': return <span>Documents uploaded for <span className="font-semibold text-slate-800">{clientName}</span></span>;
      case 'approved': return <span>Loan approved for <span className="font-semibold text-slate-800">{clientName}</span></span>;
      case 'disbursed': return <span><span className="font-semibold text-slate-800">{clientName}'s</span> loan was disbursed</span>;
      case 'rejected': return <span><span className="font-semibold text-slate-800">{clientName}'s</span> application was rejected</span>;
      case 'bank_processing': return <span><span className="font-semibold text-slate-800">{clientName}'s</span> file is with the bank</span>;
      default: return <span>Status updated for <span className="font-semibold text-slate-800">{clientName}</span></span>;
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

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-5 flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Activity size={18} />
          </div>
          <h3 className="text-lg font-semibold text-slate-100">Recent Activity</h3>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activities.length > 0 ? (
          <div className="absolute inset-0 overflow-y-auto pr-2">
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {activities.map((item, idx) => (
                <div key={`${item.leadId}-${idx}`} className="relative flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-800 shadow-sm flex items-center justify-center shrink-0 z-10">
                    {getEventIcon(item.event.status)}
                  </div>
                  <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5 mt-0.5 hover:bg-white/10 transition-colors">
                    <p className="text-sm text-slate-300 leading-snug">
                      {getEventFormat(item.event.status, item.clientName)}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-slate-500">
                        {formatTimeAgo(item.event.timestamp)}
                      </span>
                      <Link to={`/partner/leads/${item.leadId}`} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 min-h-[48px] px-2 -mr-2 hover:bg-white/5 rounded-lg transition-colors">
                        View <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-8">
            <Activity size={32} className="mb-2 text-slate-600" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
