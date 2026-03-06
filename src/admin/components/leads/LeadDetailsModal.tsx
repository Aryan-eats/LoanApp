import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Lead, LeadStatus } from '../../types/admin';
import StatusBadge from '../StatusBadge';
import { banks } from '../../data/placeholderData';
import { getBanks } from '../../../api/banksApi';
import type { BankFromApi } from '../../../api/banksApi';
import { buildLoanTypeLabels } from '../../../data/loanProductsData';

const loanTypeLabels = buildLoanTypeLabels(true);

const formatCurrency = (amount: number): string => {
  try {
    if (amount == null || !Number.isFinite(amount)) {
      return "₹0.00";
    }
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  } catch (e) {
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
    rejected: ['submitted'],
  };
  const next = statusFlow[currentStatus] || [];
  // Block docs_pending unless a bank has been assigned
  if (!lead?.bankAssigned) {
    return next.filter((s) => s !== 'docs_pending');
  }
  return next;
};

interface LeadDetailsModalProps {
  lead: Lead;
  onClose: () => void;
  onStatusUpdate: (leadId: string, status: LeadStatus, note?: string) => void;
  onBankAssign: (leadId: string, bankName: string, bankCode?: string) => void;
}

const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ lead, onClose, onStatusUpdate, onBankAssign }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'bank' | 'timeline'>('overview');
  const [statusNote, setStatusNote] = useState('');
  const [apiBanks, setApiBanks] = useState<BankFromApi[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = `lead-modal-title-${lead.id}`;

  useEffect(() => {
    getBanks()
      .then((res) => { if (res.success && res.data?.banks) setApiBanks(res.data.banks); })
      .catch(() => {/* keep empty */});
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleKeyDown);
    // Move focus into the modal
    const timer = requestAnimationFrame(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    });
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(timer);
      previousFocusRef.current?.focus();
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">Lead {lead.id}</h2>
            <p className="text-sm text-gray-500">{lead.customerName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-6">
            {['overview', 'documents', 'bank', 'timeline'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'overview' | 'documents' | 'bank' | 'timeline')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Loan Type</p>
                  <p className="text-lg font-semibold text-gray-900">{getLoanTypeLabel(lead.loanType)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Loan Amount</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(lead.loanAmount)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="text-sm font-medium text-gray-900">{lead.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Phone</span>
                    <span className="text-sm text-gray-900">{lead.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm text-gray-900">{lead.customerEmail}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Partner Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Partner</span>
                    <span className="text-sm font-medium text-gray-900">{lead.partnerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Partner ID</span>
                    <span className="text-sm text-gray-900">{lead.partnerId}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Status</h3>
                <div className="flex items-center gap-3 mb-4">
                  <StatusBadge status={lead.status} />
                </div>

                {getNextStatuses(lead.status, lead).length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Update Status</h4>
                    
                    {/* Hint when docs_pending is blocked */}
                    {lead.status === 'submitted' && !lead.bankAssigned && (
                      <p className="mb-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        Assign a bank first to enable "Docs Pending" status
                      </p>
                    )}

                    <div className="mb-3">
                      <input
                        type="text"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="Add a note (optional)"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {getNextStatuses(lead.status, lead).map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            onStatusUpdate(lead.id, status, statusNote);
                            setStatusNote('');
                          }}
                          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                            status === 'rejected'
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                        >
                          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Other tabs like documents, bank, etc. can be expanded here. 
              For brevity I'm keeping 'overview' as the main refactored piece, 
              simulating the others or adding them if needed. 
              Ideally, these would also be sub-components if they grow large.
          */}
           {activeTab === 'bank' && (
             <div className="space-y-6">
               {lead.bankAssigned && (
                 <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-green-800">Currently Assigned: {lead.bankAssigned}</p>
                       <p className="text-xs text-green-600">Last updated: {lead.updatedAt}</p>
                     </div>
                   </div>
                 </div>
               )}

               <div className="space-y-3">
                 <h4 className="text-sm font-semibold text-gray-900">
                   {lead.bankAssigned ? 'Change Bank' : 'Select a Bank to Assign'}
                 </h4>
                 <div className="grid gap-3">
                   {banks
                     .filter((bank) => bank.status === 'active')
                     .map((bank) => {
                       const isCurrentBank = lead.bankAssigned === bank.name;
                       return (
                         <button
                           type="button"
                           key={bank.id}
                           onClick={() => !isCurrentBank && onBankAssign(lead.id, bank.name, bank.code)}
                           onKeyDown={(e) => {
                             if ((e.key === 'Enter' || e.key === ' ') && !isCurrentBank) {
                               e.preventDefault();
                               onBankAssign(lead.id, bank.name, bank.code);
                             }
                           }}
                           tabIndex={isCurrentBank ? -1 : 0}
                           disabled={isCurrentBank}
                           className={`w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer ${
                             isCurrentBank
                               ? 'border-green-500 bg-green-50'
                               : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                           }`}
                         >
                           <div className="flex justify-between items-start mb-2">
                              <div className="font-medium text-gray-900">{bank.name}</div>
                              {isCurrentBank && (
                                <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                  Assigned
                                </span>
                              )}
                            </div>
                            {/* Bank details: interest rate, principal, offers */}
                            {(() => {
                              const fullBank = apiBanks.find(b => b.name === bank.name);
                              if (!fullBank) return null;
                              const loanRate = fullBank.commissionRates?.find(r => r.loanType === lead.loanType);
                              return (
                                <div className="mt-2 space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Interest Rate</span>
                                    <span className="font-medium text-gray-800">
                                      {loanRate?.interestRate || `${fullBank.interestRateMin}% – ${fullBank.interestRateMax}%`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Principal Amount</span>
                                    <span className="font-medium text-gray-800">{formatCurrency(lead.loanAmount)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Processing Fee</span>
                                    <span className="font-medium text-gray-800">{fullBank.processingFee}</span>
                                  </div>
                                  {loanRate?.maxAmount && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Max Eligible</span>
                                      <span className="font-medium text-gray-800">{formatCurrency(Number(loanRate.maxAmount))}</span>
                                    </div>
                                  )}
                                  {fullBank.features && fullBank.features.length > 0 && (
                                    <div className="pt-2 border-t border-gray-100">
                                      <p className="text-xs font-medium text-gray-500 mb-1">Offers & Features</p>
                                      <div className="flex flex-wrap gap-1">
                                        {fullBank.features.map((feat, idx) => (
                                          <span key={idx} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
                                            {feat}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

           {activeTab === 'timeline' && (
              <div className="space-y-4">
                {lead.timeline && lead.timeline.length > 0 ? (
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-6">
                      {[...lead.timeline].reverse().map((event) => {
                        const statusColors: Record<string, string> = {
                          submitted: 'bg-blue-500',
                          docs_pending: 'bg-yellow-500',
                          docs_uploaded: 'bg-indigo-500',
                          bank_processing: 'bg-orange-500',
                          approved: 'bg-green-500',
                          disbursed: 'bg-emerald-600',
                          rejected: 'bg-red-500',
                          draft: 'bg-gray-400',
                        };
                        const dotColor = statusColors[event.status] || 'bg-gray-400';
                        return (
                          <div key={event.id} className="relative flex items-start gap-4 pl-2">
                            <div className={`relative z-10 mt-1 w-5 h-5 rounded-full ${dotColor} border-2 border-white shadow-sm flex-shrink-0`} />
                            <div className="flex-1 bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-900">
                                  {event.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="text-xs text-gray-400">{event.timestamp}</span>
                              </div>
                              <p className="text-xs text-gray-500">by {event.updatedBy}</p>
                              {event.note && (
                                <p className="mt-1 text-sm text-gray-700 italic">"{event.note}"</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No timeline events</div>
                )}
              </div>
            )}

           {activeTab === 'documents' && (
              <div className="space-y-4">
                 {lead.documents && lead.documents.length > 0 ? (
                    lead.documents.map((doc) => (
                      <div key={doc.id} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">{doc.type}</p>
                        <p className="text-xs text-gray-500">{doc.fileName}</p>
                      </div>
                    ))
                 ) : (
                    <div className="text-center py-8 text-gray-500">No documents uploaded</div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetailsModal;
