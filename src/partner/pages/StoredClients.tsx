import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks';
import {
  Search,
  Send,
  Trash2,
  Loader2,
  FolderOpen,
  StickyNote,
} from 'lucide-react';
import LocalLeadStatusManager from '../components/LocalLeadStatusManager';
import EmptyState from '../components/EmptyState';
import { useLocalLeadsStore } from '../../stores/localLeadsStore';
import { useLeadsStore } from '../../stores/leadsStore';
import type { LocalLead } from '../types/partner-dashboard';
import { buildLoanTypeLabels } from '../../data/loanProducts';

const loanTypeLabels = buildLoanTypeLabels(true);

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

interface LocalClientsTabProps {
  onSubmitSuccess: () => void;
}

export default function StoredClients({ onSubmitSuccess }: LocalClientsTabProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [submittingLeadId, setSubmittingLeadId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  const {
    leads: localLeads,
    fetchLeads: fetchStoredClients,
    updateStatus: updateLocalStatus,
    updateNotes: updateLocalNotes,
    deleteLead: deleteLocalLead,
    submitToAdmin,
  } = useLocalLeadsStore();

  const { fetchLeads } = useLeadsStore();

  // Fetch stored clients from DB on mount
  useEffect(() => {
    fetchStoredClients();
  }, [fetchStoredClients]);

  const handleSubmitLocalToAdmin = async (lead: LocalLead) => {
    setSubmittingLeadId(lead.id);
    const result = await submitToAdmin(lead.id);
    setSubmittingLeadId(null);
    if (result) {
      fetchLeads(undefined, false, true);
      onSubmitSuccess();
    }
  };

  const handleSaveNotes = (leadId: string) => {
    updateLocalNotes(leadId, notesValue);
    setEditingNotesId(null);
    setNotesValue('');
  };

  const filteredLeads = localLeads.filter((l) => {
    const q = debouncedSearchQuery.toLowerCase();
    return !q || l.fullName.toLowerCase().includes(q) || l.phone.includes(q);
  });

  return (
    <>
      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name or phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredLeads.length > 0 || localLeads.length > 0 ? (
        localLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState
              icon={<FolderOpen size={32} />}
              title="No local clients yet"
              description="Save client details locally to manage them yourself. Submit to admin when you're ready to process the loan."
              action={{ label: 'Add Client', onClick: () => navigate('/partner/add-client') }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Loan</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">My Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Added</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{lead.fullName}</p>
                        <p className="text-xs text-slate-500">{lead.phone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">{loanTypeLabels[lead.loanType] ?? lead.loanType}</p>
                        <p className="text-sm font-medium text-slate-800">{formatCurrency(lead.loanAmount)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <LocalLeadStatusManager
                          leadId={lead.id}
                          currentStatus={lead.localStatus}
                          onStatusChange={updateLocalStatus}
                        />
                      </td>
                      <td className="px-5 py-4 max-w-[180px]">
                        {editingNotesId === lead.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              onBlur={() => handleSaveNotes(lead.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNotes(lead.id);
                                if (e.key === 'Escape') setEditingNotesId(null);
                              }}
                              className="w-full text-xs px-2 py-1 border border-blue-400 rounded focus:outline-none"
                              placeholder="Add notes..."
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingNotesId(lead.id); setNotesValue(lead.notes ?? ''); }}
                            className="flex items-start gap-1 text-xs text-slate-500 hover:text-blue-600 text-left transition-colors"
                            title="Click to edit notes"
                          >
                            <StickyNote size={12} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{lead.notes || <em>Add notes…</em>}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">
                          {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSubmitLocalToAdmin(lead)}
                            disabled={submittingLeadId === lead.id}
                            title="Submit to admin"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {submittingLeadId === lead.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Send size={15} />
                            )}
                          </button>
                          <button
                            onClick={() => deleteLocalLead(lead.id)}
                            title="Delete lead"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<FolderOpen size={32} />}
            title="No local clients yet"
            description="Save client details locally to manage them yourself. Submit to admin when you're ready to process the loan."
            action={{ label: 'Add Client', onClick: () => navigate('/partner/add-client') }}
          />
        </div>
      )}
    </>
  );
}
