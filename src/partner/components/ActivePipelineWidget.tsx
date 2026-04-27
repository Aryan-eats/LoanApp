import { useMemo } from 'react';
import type { Lead, LocalLead } from '../types/partner-dashboard';
import { Users, FileText, FolderOpen, Send, CheckCircle, IndianRupee } from 'lucide-react';
import { usePartnerTheme } from './PartnerThemeProvider';

interface ActivePipelineWidgetProps {
  leads: Lead[];
  localLeads: LocalLead[];
}

export default function ActivePipelineWidget({ leads, localLeads }: ActivePipelineWidgetProps) {
  const { isDark } = usePartnerTheme();
  const pipeline = useMemo(() => {
    // Stage counts
    const activeLocal = localLeads.filter(l => !['rejected', 'closed'].includes(l.localStatus));
    const leadReceived = activeLocal.length + leads.filter(l => l.status === 'draft').length;
    
    // docs_pending
    const docsPending = leads.filter(l => l.status === 'docs_pending').length;
    
    // file prep (docs uploaded, collected)
    const filePrep = leads.filter(l => ['docs_uploaded', 'docs_collected'].includes(l.status)).length;
    
    // submitted to bank
    const submitted = leads.filter(l => ['submitted', 'bank_processing', 'bank_logged'].includes(l.status)).length;
    
    // approved
    const approved = leads.filter(l => l.status === 'approved').length;
    
    // disbursed
    const disbursed = leads.filter(l => l.status === 'disbursed').length;

    // total active clients (excluding disbursed and rejected)
    const activeLeads = leads.filter(l => !['disbursed', 'rejected'].includes(l.status));
    const totalActive = activeLocal.length + activeLeads.length;

    return {
      totalActive,
      stages: [
        { label: 'Lead Received', count: leadReceived, icon: <Users size={18} />, color: 'bg-slate-800 text-slate-300 border-slate-700' },
        { label: 'Docs Pending', count: docsPending, icon: <FileText size={18} />, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
        { label: 'File Prep', count: filePrep, icon: <FolderOpen size={18} />, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
        { label: 'Submitted', count: submitted, icon: <Send size={18} />, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
        { label: 'Approved', count: approved, icon: <CheckCircle size={18} />, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        { label: 'Disbursed', count: disbursed, icon: <IndianRupee size={18} />, color: 'bg-green-500/10 text-green-400 border-green-500/20' }
      ]
    };
  }, [leads, localLeads]);

  return (
    <div
      className={`backdrop-blur-sm rounded-xl p-5 transition-colors ${
        isDark
          ? 'bg-slate-900/50 border border-white/10'
          : 'bg-white/90 border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Active Pipeline</h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Track cases across all stages</p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Active Clients</p>
          <p className="text-2xl font-bold text-indigo-400">{pipeline.totalActive}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {pipeline.stages.map((stage, idx) => (
          <div
            key={idx}
            className={`relative p-4 rounded-xl border ${stage.color} ${
              isDark ? 'bg-opacity-50 hover:bg-opacity-100' : 'bg-opacity-100'
            } transition-colors flex flex-col justify-between h-28`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-lg shadow-sm ${isDark ? 'bg-white/10' : 'bg-white/80'}`}>
                {stage.icon}
              </div>
              <span className={`text-2xl font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>{stage.count}</span>
            </div>
            <p className="mt-3 text-sm font-medium leading-tight">{stage.label}</p>
            
            {idx < pipeline.stages.length - 1 && (
              <div className={`hidden xl:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
