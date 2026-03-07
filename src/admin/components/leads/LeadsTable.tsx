import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Lead, LeadStatus } from '../../types/admin';
import StatusBadge from '../../../components/shared/StatusBadge';
import { buildLoanTypeLabels } from '../../../data/loanProductsData';

const loanTypeLabels = buildLoanTypeLabels(true);
const ROW_HEIGHT = 76;
const OVERSCAN_ROWS = 6;
const GRID_TEMPLATE = 'minmax(180px,1.3fr) minmax(220px,1.6fr) minmax(140px,1.1fr) minmax(130px,.9fr) minmax(160px,1.2fr) minmax(170px,1.2fr) minmax(170px,1.2fr) minmax(140px,.9fr) 84px';

// Helper to format currency
const formatCurrency = (amount: number): string => {
  if (amount == null || typeof amount !== 'number' || !Number.isFinite(amount)) {
    console.warn('formatCurrency received invalid value:', amount);
    return '₹—';
  }
  try {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  } catch (e) {
    console.warn('Currency formatting failed for value:', amount, e);
    return '₹—';
  }
};

const getLoanTypeLabel = (loanType: string): string => {
  if (loanTypeLabels[loanType]) {
    return loanTypeLabels[loanType];
  }
  return loanType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Status flow logic specific to the table actions
const getNextStatuses = (currentStatus: LeadStatus, lead?: { bankAssigned?: string }): LeadStatus[] => {
  const statusFlow: Record<LeadStatus, LeadStatus[]> = {
    draft: ['submitted', 'rejected'],
    submitted: ['docs_pending', 'rejected'],
    docs_pending: ['docs_uploaded', 'rejected'],
    docs_uploaded: ['docs_collected', 'rejected'],
    docs_collected: ['bank_processing', 'rejected'],
    bank_processing: ['bank_logged', 'rejected'],
    bank_logged: ['approved', 'rejected'],
    approved: ['disbursed', 'rejected'],
    disbursed: [],
    rejected: ['submitted'], // Allow reactivation
  };
  const next = statusFlow[currentStatus] || [];
  // Block docs_pending unless a bank has been assigned
  if (!lead?.bankAssigned) {
    return next.filter((s) => s !== 'docs_pending');
  }
  return next;
};

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusUpdate: (leadId: string, status: LeadStatus) => void;
}

const LeadsTable: React.FC<LeadsTableProps> = ({ leads, onLeadClick, onStatusUpdate }) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);

  useEffect(() => {
    if (!showStatusDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showStatusDropdown]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    setViewportHeight(scroller.clientHeight);

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewportHeight(entry.contentRect.height);
    });
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (showStatusDropdown && !leads.some((lead) => lead.id === showStatusDropdown)) {
      setShowStatusDropdown(null);
    }
  }, [leads, showStatusDropdown]);

  const totalHeight = leads.length * ROW_HEIGHT;
  const visibleRows = Math.max(1, Math.ceil(viewportHeight / ROW_HEIGHT));
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const endIndex = Math.min(leads.length, startIndex + visibleRows + OVERSCAN_ROWS * 2);
  const visibleLeads = leads.slice(startIndex, endIndex);

  const renderStatusCell = (lead: Lead) => (
    <div className="relative" ref={showStatusDropdown === lead.id ? statusDropdownRef : undefined}>
      <button
        onClick={() => setShowStatusDropdown(showStatusDropdown === lead.id ? null : lead.id)}
        className="flex items-center gap-1 group"
      >
        <StatusBadge status={lead.status} size="sm" variant="admin" />
        {getNextStatuses(lead.status, lead).length > 0 && (
          <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        )}
      </button>
      {showStatusDropdown === lead.id && getNextStatuses(lead.status, lead).length > 0 && (
        <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">Update Status</p>
          {lead.status === 'submitted' && !lead.bankAssigned && (
            <p className="px-3 py-1.5 text-xs text-amber-600 bg-amber-50 border-b border-amber-100">
              Assign a bank to enable Docs Pending
            </p>
          )}
          {getNextStatuses(lead.status, lead).map((status) => (
            <button
              key={status}
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(lead.id, status);
                setShowStatusDropdown(null);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${status === 'rejected' ? 'text-red-600' : 'text-gray-700'}`}
            >
              {status === 'rejected' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1450px]">
          <div
            className="grid bg-gray-50 border-b border-gray-200"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead ID</div>
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</div>
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Loan Type</div>
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</div>
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner</div>
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bank</div>
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</div>
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</div>
            <div className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</div>
          </div>

          <div
            ref={scrollerRef}
            className="relative max-h-[65vh] overflow-y-auto"
            onScroll={(e) => {
              setScrollTop(e.currentTarget.scrollTop);
              if (showStatusDropdown) setShowStatusDropdown(null);
            }}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              {visibleLeads.map((lead, index) => {
                const rowIndex = startIndex + index;
                return (
                  <div
                    key={lead.id}
                    className="absolute left-0 right-0 grid border-b border-gray-100 hover:bg-gray-50 transition-colors bg-white"
                    style={{
                      gridTemplateColumns: GRID_TEMPLATE,
                      height: ROW_HEIGHT,
                      transform: `translateY(${rowIndex * ROW_HEIGHT}px)`,
                    }}
                  >
                    <div className="px-4 py-3 text-sm font-medium text-gray-900 truncate">{lead.id}</div>
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.customerName}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.customerPhone}</p>
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-600 truncate">{getLoanTypeLabel(lead.loanType)}</div>
                    <div className="px-4 py-3 text-sm font-medium text-gray-900 truncate">{formatCurrency(lead.loanAmount)}</div>
                    <div className="px-4 py-3 text-sm text-gray-600 truncate">{lead.partnerName}</div>
                    <div className="px-4 py-3 text-sm text-gray-600 truncate">
                      {lead.bankAssigned || lead.preferredBank || '-'}
                      {lead.preferredBank && !lead.bankAssigned && (
                        <span className="ml-1 text-xs text-blue-600 font-medium">(Pref)</span>
                      )}
                      {lead.preferredBank && lead.bankAssigned && lead.preferredBank !== lead.bankAssigned && (
                        <div className="text-xs text-gray-400 truncate">Pref: {lead.preferredBank}</div>
                      )}
                    </div>
                    <div className="px-4 py-3">{renderStatusCell(lead)}</div>
                    <div className="px-4 py-3 text-sm text-gray-500 truncate">{lead.createdAt}</div>
                    <div className="px-4 py-3">
                      <button
                        onClick={() => onLeadClick(lead)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {leads.length === 0 && (
        <div className="p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No leads found</p>
        </div>
      )}
    </div>
  );
};

export default LeadsTable;
