import type { LeadStatus, DocumentStatus, CommissionStatus, KYCStatus, TicketStatus } from '../types/partner-dashboard';

interface StatusBadgeProps {
  status: LeadStatus | DocumentStatus | CommissionStatus | KYCStatus | TicketStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // Lead Status
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  docs_pending: { label: 'Docs Pending', className: 'bg-amber-100 text-amber-700' },
  docs_uploaded: { label: 'Docs Uploaded', className: 'bg-cyan-100 text-cyan-700' },
  bank_processing: { label: 'Bank Processing', className: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  disbursed: { label: 'Disbursed', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },

  // Document Status
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  uploaded: { label: 'Uploaded', className: 'bg-blue-100 text-blue-700' },
  verified: { label: 'Verified', className: 'bg-green-100 text-green-700' },

  // Commission Status
  processing: { label: 'Processing', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },

  // Ticket Status
  open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-600' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${config.className} ${sizeClasses}`}>
      {config.label}
    </span>
  );
}
