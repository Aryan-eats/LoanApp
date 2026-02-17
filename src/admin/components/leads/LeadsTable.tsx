import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Lead, LeadStatus } from '../../types/admin';
import StatusBadge from '../StatusBadge';
import { buildLoanTypeLabels } from '../../../data/loanProductsData';

const loanTypeLabels = buildLoanTypeLabels(true);

// Helper to format currency
const formatCurrency = (amount: number): string => {
  try {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  } catch (e) {
    console.warn("Currency formatting failed for value:", amount);
    return "₹0.00";
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
const getNextStatuses = (currentStatus: LeadStatus): LeadStatus[] => {
  const statusFlow: Record<LeadStatus, LeadStatus[]> = {
    draft: ['submitted', 'rejected'],
    submitted: ['docs_pending', 'rejected'],
    docs_pending: ['docs_uploaded', 'rejected'],
    docs_uploaded: ['bank_processing', 'rejected'],
    bank_processing: ['approved', 'rejected'],
    approved: ['disbursed', 'rejected'],
    disbursed: [],
    rejected: ['submitted'], // Allow reactivation
  };
  return statusFlow[currentStatus] || [];
};

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusUpdate: (leadId: string, status: LeadStatus) => void;
}

const LeadsTable: React.FC<LeadsTableProps> = ({ leads, onLeadClick, onStatusUpdate }) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Loan Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bank</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.id}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.customerName}</p>
                    <p className="text-xs text-gray-500">{lead.customerPhone}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{getLoanTypeLabel(lead.loanType)}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(lead.loanAmount)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{lead.partnerName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div>
                    {lead.bankAssigned || lead.preferredBank || '-'}
                    {lead.preferredBank && !lead.bankAssigned && (
                      <span className="ml-1 text-xs text-blue-600 font-medium">(Pref)</span>
                    )}
                    {lead.preferredBank && lead.bankAssigned && lead.preferredBank !== lead.bankAssigned && (
                      <div className="text-xs text-gray-400">Pref: {lead.preferredBank}</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusDropdown(showStatusDropdown === lead.id ? null : lead.id)}
                      className="flex items-center gap-1 group"
                    >
                      <StatusBadge status={lead.status} size="sm" />
                      {getNextStatuses(lead.status).length > 0 && (
                        <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                    {showStatusDropdown === lead.id && getNextStatuses(lead.status).length > 0 && (
                      <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">Update Status</p>
                        {getNextStatuses(lead.status).map((status) => (
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
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{lead.createdAt}</td>
                <td className="px-4 py-3">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
