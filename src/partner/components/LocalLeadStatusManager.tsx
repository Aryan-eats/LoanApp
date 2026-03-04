import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { LocalLeadStatus } from '../types/partner-dashboard';

export const localStatusConfig: Record<
  LocalLeadStatus,
  { label: string; color: string; dot: string }
> = {
  new:           { label: 'New',            color: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-400' },
  contacted:     { label: 'Contacted',      color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  docs_pending:   { label: 'Docs Pending',   color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  docs_collected:{ label: 'Docs Collected', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  processing:    { label: 'Processing',     color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  approved:      { label: 'Approved',       color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  rejected:      { label: 'Rejected',       color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  closed:        { label: 'Closed',         color: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-300' },
};

const statusOrder: LocalLeadStatus[] = [
  'new', 'contacted', 'docs_pending', 'docs_collected', 'processing', 'approved', 'rejected', 'closed',
];

interface Props {
  leadId: string;
  currentStatus: LocalLeadStatus;
  onStatusChange: (leadId: string, status: LocalLeadStatus) => void;
}

export default function LocalLeadStatusManager({ leadId, currentStatus, onStatusChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = localStatusConfig[currentStatus];

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full text-xs font-medium transition-colors ${current.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        {current.label}
        <ChevronDown size={11} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[170px] py-1 overflow-hidden">
          <p className="px-3 py-1.5 text-xs text-slate-400 font-medium uppercase tracking-wider border-b border-slate-100 mb-1">
            Update Status
          </p>
          {statusOrder.map((status) => {
            const cfg = localStatusConfig[status];
            const isActive = status === currentStatus;
            return (
              <button
                key={status}
                onClick={() => {
                  onStatusChange(leadId, status);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                <span className={isActive ? 'font-semibold' : ''}>{cfg.label}</span>
                {isActive && <Check size={13} className="ml-auto text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
