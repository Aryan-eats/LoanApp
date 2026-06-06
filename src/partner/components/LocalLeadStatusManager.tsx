/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import type { LocalLeadStatus } from '../types/partner-dashboard';

export const localStatusConfig: Record<
  LocalLeadStatus,
  { label: string; color: string; dot: string }
> = {
  new:           { label: 'New',            color: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',   dot: 'bg-slate-400' },
  contacted:     { label: 'Contacted',      color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',     dot: 'bg-blue-400' },
  docs_pending:   { label: 'Docs Pending',   color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', dot: 'bg-yellow-400' },
  docs_collected:{ label: 'Docs Collected', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', dot: 'bg-purple-400' },
  processing:    { label: 'Processing',     color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',   dot: 'bg-amber-400' },
  approved:      { label: 'Approved',       color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',   dot: 'bg-emerald-400' },
  rejected:      { label: 'Rejected',       color: 'bg-red-500/10 text-red-400 border border-red-500/20',       dot: 'bg-red-400' },
  closed:        { label: 'Closed',         color: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',   dot: 'bg-slate-500' },
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  const current = localStatusConfig[currentStatus];

  // Update position when opening or scrolling
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Handle scroll/resize to keep dropdown attached or just close it
  useEffect(() => {
    if (isOpen) {
      const handleClose = () => setIsOpen(false);
      window.addEventListener('scroll', handleClose, true);
      window.addEventListener('resize', handleClose);
      return () => {
        window.removeEventListener('scroll', handleClose, true);
        window.removeEventListener('resize', handleClose);
      };
    }
  }, [isOpen]);

  const dropdown = (
    <div 
      ref={dropdownRef}
      style={{ 
        position: 'fixed', 
        top: coords.top - window.scrollY + 4, 
        left: coords.left - window.scrollX,
        minWidth: '180px',
      }}
      className="bg-slate-900 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-[9999] py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      <p className="px-3 py-1.5 text-xs text-slate-500 font-medium uppercase tracking-wider border-b border-white/5 mb-1">
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
            className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2.5 transition-colors ${
              isActive ? 'text-slate-200 bg-white/5' : 'text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <span className={isActive ? 'font-semibold' : ''}>{cfg.label}</span>
            {isActive && <Check size={13} className="ml-auto text-indigo-400" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full text-xs font-medium transition-colors ${current.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        {current.label}
        <ChevronDown size={11} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(dropdown, document.body)}
    </div>
  );
}
