import { useMemo } from 'react';
import type { Lead, LocalLead } from '../types/partner-dashboard';
import { Bell, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePartnerTheme } from './PartnerThemeProvider';

interface FollowUpRemindersProps {
  leads: Lead[];
  localLeads: LocalLead[];
}

export default function FollowUpReminders({ leads, localLeads }: FollowUpRemindersProps) {
  const { isDark } = usePartnerTheme();
  const reminders = useMemo(() => {
    const list: { id: string, name: string, reason: string, daysHovering: number, urgengy: 'high' | 'medium' | 'low', link: string }[] = [];
    const now = new Date();

    // 1. Local Leads stuck in 'contacted' or 'new' for > 2 days
    localLeads.forEach(ll => {
      if (['new', 'contacted', 'docs_pending'].includes(ll.localStatus)) {
        const days = Math.floor((now.getTime() - new Date(ll.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 2) {
          list.push({
            id: ll.id,
            name: ll.fullName,
            reason: ll.localStatus === 'docs_pending' ? 'Pending initial documents' : 'Needs follow-up call',
            daysHovering: days,
            urgengy: days > 5 ? 'high' : 'medium',
            link: '/partner/leads'
          });
        }
      }
    });

    // 2. Admin Leads stuck in 'docs_pending' 
    leads.forEach(l => {
      if (l.status === 'docs_pending') {
        const days = Math.floor((now.getTime() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 1) {
          list.push({
            id: l.id,
            name: l.client.fullName,
            reason: 'Missing admin-requested docs',
            daysHovering: days,
            urgengy: days > 3 ? 'high' : 'medium',
            link: `/partner/documents/${l.id}`
          });
        }
      }
    });

    return list.sort((a, b) => b.daysHovering - a.daysHovering).slice(0, 5); // top 5
  }, [leads, localLeads]);

  return (
    <div
      className={`backdrop-blur-sm rounded-xl p-5 flex flex-col min-h-[300px] transition-colors ${
        isDark
          ? 'bg-slate-900/50 border border-white/10'
          : 'bg-white/90 border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
            <Bell size={18} />
          </div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Follow-up Reminders</h3>
        </div>
        {reminders.length > 0 && (
          <span className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full border border-red-500/20">
            {reminders.length} Action Needed
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3">
        {reminders.length > 0 ? (
          reminders.map((r, i) => (
            <div
              key={`${r.id}-${i}`}
              className={`group p-3 border rounded-xl hover:border-red-500/30 hover:bg-red-500/10 transition-all flex items-start gap-3 ${
                isDark ? 'border-white/5' : 'border-slate-200'
              }`}
            >
              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${r.urgengy === 'high' ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{r.name}</p>
                <p className={`text-xs flex items-center gap-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                   {r.reason}
                </p>
                <p className={`text-[10px] font-medium mt-1 flex items-center gap-1 uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Clock size={10} /> Pending for {r.daysHovering} {r.daysHovering === 1 ? 'day' : 'days'}
                </p>
              </div>
              <Link
                to={r.link}
                className={`flex items-center justify-center p-2 border rounded-lg transition-colors shrink-0 min-h-[48px] min-w-[48px] ${
                  isDark
                    ? 'border-white/10 text-slate-400 hover:border-indigo-500/30 hover:text-indigo-400 hover:bg-indigo-500/10'
                    : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-500 hover:bg-indigo-50'
                }`}
              >
                <ArrowRight size={20} />
              </Link>
            </div>
          ))
        ) : (
          <div className={`flex flex-col items-center justify-center h-full text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            <CheckCircle size={32} className={`mb-2 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
            <p className="text-sm">You are all caught up!</p>
            <p className="text-xs">No pending follow-ups</p>
          </div>
        )}
      </div>
    </div>
  );
}
