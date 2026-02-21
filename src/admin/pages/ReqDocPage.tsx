import React, { useState, useMemo, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import { consolidatedBanks } from '../../data/mockBanks';
import { getRequiredDocsForLoanCode } from '../../data/DocsReq';
import type { DocumentRequirement } from '../../data/DocsReq';
import { getProductsByCategory } from '../../data/loanProductsData';
import type { LoanCategory } from '../../data/loanProductsData';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Building2,
  Edit3,
  Save,
  Trash2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditableDocReq extends DocumentRequirement {
  /** true = newly added, not yet saved */
  isNew?: boolean;
}

interface BankLoanDocMap {
  /** bankId → loanCode → list of editable docs */
  [bankId: string]: {
    [loanCode: string]: EditableDocReq[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_LOAN_CATEGORIES: LoanCategory[] = [
  'personal', 'business', 'home', 'property', 'vehicle',
  'gold_securities', 'education', 'agriculture', 'government',
  'corporate', 'consumer', 'short_term', 'real_estate', 'specialized',
];

/** Build initial doc map from existing DocsReq data */
function buildInitialDocMap(): BankLoanDocMap {
  const map: BankLoanDocMap = {};
  for (const bank of consolidatedBanks) {
    map[bank.id] = {};
    for (const loanCode of bank.supportedLoanTypes) {
      const docs = getRequiredDocsForLoanCode(loanCode as string);
      // Deep clone so we don't mutate the imported constant
      map[bank.id][loanCode as string] = docs.map((d) => ({ ...d }));
    }
  }
  return map;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface AddDocFormProps {
  onAdd: (doc: DocumentRequirement) => void;
  onCancel: () => void;
}

const AddDocForm: React.FC<AddDocFormProps> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mandatory, setMandatory] = useState(true);
  const [formats, setFormats] = useState('pdf,jpg,png');
  const [maxSize, setMaxSize] = useState(5);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Document name is required'); return; }
    const id = `custom_${Date.now()}`;
    onAdd({
      id,
      name: name.trim(),
      description: description.trim() || undefined,
      mandatory,
      acceptedFormats: formats.split(',').map((f) => f.trim()).filter(Boolean),
      maxSizeMB: maxSize,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Add New Document</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Document Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="e.g. Salary Slip"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Accepted Formats (comma-separated)</label>
          <input
            type="text"
            value={formats}
            onChange={(e) => setFormats(e.target.value)}
            placeholder="pdf,jpg,png"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Max Size (MB)</label>
          <input
            type="number"
            value={maxSize}
            min={1}
            max={100}
            onChange={(e) => setMaxSize(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
        <input
          type="checkbox"
          checked={mandatory}
          onChange={(e) => setMandatory(e.target.checked)}
          className="w-4 h-4 accent-blue-600"
        />
        <span className="text-sm text-gray-700">Mandatory document</span>
      </label>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save Document
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

const ReqDocPage: React.FC = () => {
  const [docMap, setDocMap] = useState<BankLoanDocMap>(buildInitialDocMap);
  const [selectedBankId, setSelectedBankId] = useState<string>(consolidatedBanks[0]?.id ?? '');
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showMandatoryOnly, setShowMandatoryOnly] = useState(false);
  const [addingDocFor, setAddingDocFor] = useState<{ loanCode: string } | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const selectedBank = useMemo(
    () => consolidatedBanks.find((b) => b.id === selectedBankId),
    [selectedBankId]
  );

  const bankLoanDocs = useMemo(
    () => docMap[selectedBankId] ?? {},
    [docMap, selectedBankId]
  );

  /** Loan codes for this bank, optionally filtered by search */
  const filteredLoanCodes = useMemo(() => {
    const loanCodes = Object.keys(bankLoanDocs);
    if (!searchQuery) return loanCodes;
    const q = searchQuery.toLowerCase();
    return loanCodes.filter((code) => {
      const nameMatch = code.replace(/_/g, ' ').includes(q);
      const docMatch = bankLoanDocs[code].some((d) => d.name.toLowerCase().includes(q));
      return nameMatch || docMatch;
    });
  }, [bankLoanDocs, searchQuery]);

  const toggleLoan = useCallback((loanCode: string) => {
    setExpandedLoans((prev) => {
      const next = new Set(prev);
      next.has(loanCode) ? next.delete(loanCode) : next.add(loanCode);
      return next;
    });
  }, []);

  const handleRemoveDoc = useCallback(
    (loanCode: string, docId: string) => {
      setDocMap((prev) => {
        const bankMap = { ...prev[selectedBankId] };
        bankMap[loanCode] = bankMap[loanCode].filter((d) => d.id !== docId);
        return { ...prev, [selectedBankId]: bankMap };
      });
    },
    [selectedBankId]
  );

  const handleToggleMandatory = useCallback(
    (loanCode: string, docId: string) => {
      setDocMap((prev) => {
        const bankMap = { ...prev[selectedBankId] };
        bankMap[loanCode] = bankMap[loanCode].map((d) =>
          d.id === docId ? { ...d, mandatory: !d.mandatory } : d
        );
        return { ...prev, [selectedBankId]: bankMap };
      });
    },
    [selectedBankId]
  );

  const handleAddDoc = useCallback(
    (loanCode: string, doc: DocumentRequirement) => {
      setDocMap((prev) => {
        const bankMap = { ...prev[selectedBankId] };
        bankMap[loanCode] = [...(bankMap[loanCode] ?? []), { ...doc, isNew: true }];
        return { ...prev, [selectedBankId]: bankMap };
      });
      setAddingDocFor(null);
    },
    [selectedBankId]
  );

  const handleStartRename = (docId: string, currentName: string) => {
    setEditingDocId(docId === editingDocId ? null : docId);
    setEditName(currentName);
  };

  const handleSaveRename = useCallback(
    (loanCode: string, docId: string) => {
      if (!editName.trim()) return;
      setDocMap((prev) => {
        const bankMap = { ...prev[selectedBankId] };
        bankMap[loanCode] = bankMap[loanCode].map((d) =>
          d.id === docId ? { ...d, name: editName.trim() } : d
        );
        return { ...prev, [selectedBankId]: bankMap };
      });
      setEditingDocId(null);
    },
    [selectedBankId, editName]
  );

  const totalDocsForBank = useMemo(
    () => Object.values(bankLoanDocs).reduce((acc, docs) => acc + docs.length, 0),
    [bankLoanDocs]
  );

  const mandatoryCount = useMemo(
    () =>
      Object.values(bankLoanDocs).reduce(
        (acc, docs) => acc + docs.filter((d) => d.mandatory).length,
        0
      ),
    [bankLoanDocs]
  );

  return (
    <AdminLayout>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
            <span>Documents</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 font-medium">Required Documents</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Document Requirements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage required documents per loan type for each lending partner
          </p>
        </div>

        {/* Summary pills */}
        {selectedBank && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{totalDocsForBank} docs</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">{mandatoryCount} mandatory</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-700">
                {totalDocsForBank - mandatoryCount} optional
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bank / NBFC Tab Strip ───────────────────────────────────────── */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 pb-1 min-w-max">
          {consolidatedBanks.map((bank) => {
            const isActive = bank.id === selectedBankId;
            return (
              <button
                key={bank.id}
                onClick={() => {
                  setSelectedBankId(bank.id);
                  setExpandedLoans(new Set());
                  setAddingDocFor(null);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 border ${
                  isActive
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{bank.name}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {bank.supportedLoanTypes.length}
                </span>
                {bank.status === 'inactive' && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                    Inactive
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search & Filter Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search loan types or document names…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={showMandatoryOnly}
            onChange={(e) => setShowMandatoryOnly(e.target.checked)}
            className="w-4 h-4 accent-gray-900"
          />
          <span className="text-sm text-gray-700 whitespace-nowrap">Mandatory only</span>
        </label>
        <button
          onClick={() => setExpandedLoans(new Set(filteredLoanCodes))}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Expand all
        </button>
        <button
          onClick={() => setExpandedLoans(new Set())}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Collapse all
        </button>
      </div>

      {/* ── Loan Type Accordion List ────────────────────────────────────── */}
      {filteredLoanCodes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No loan types match your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLoanCodes.map((loanCode) => {
            const rawDocs = bankLoanDocs[loanCode] ?? [];
            const docs = showMandatoryOnly ? rawDocs.filter((d) => d.mandatory) : rawDocs;
            const mandatoryDocsCount = rawDocs.filter((d) => d.mandatory).length;
            const isExpanded = expandedLoans.has(loanCode);
            const loanLabel = loanCode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <div
                key={loanCode}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Accordion header */}
                <button
                  onClick={() => toggleLoan(loanCode)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-400">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </span>
                  <span className="flex-1 font-medium text-gray-900">{loanLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-red-50 text-red-600 font-medium rounded-full">
                      {mandatoryDocsCount} mandatory
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 font-medium rounded-full">
                      {rawDocs.length} total
                    </span>
                  </div>
                </button>

                {/* Accordion body */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                    {docs.length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-2">
                        No documents match the current filter.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              doc.mandatory
                                ? 'bg-red-50/40 border-red-100'
                                : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            {/* File icon */}
                            <FileText
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                doc.mandatory ? 'text-red-400' : 'text-gray-300'
                              }`}
                            />

                            {/* Name / inline edit */}
                            <div className="flex-1 min-w-0">
                              {editingDocId === doc.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(loanCode, doc.id);
                                      if (e.key === 'Escape') setEditingDocId(null);
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => handleSaveRename(loanCode, doc.id)}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingDocId(null)}
                                    className="text-gray-400 hover:text-gray-600 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                                  {doc.description && (
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.description}</p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {doc.acceptedFormats.join(', ').toUpperCase()} · max {doc.maxSizeMB} MB
                                  </p>
                                </>
                              )}
                            </div>

                            {/* Badges & actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Mandatory toggle */}
                              <button
                                onClick={() => handleToggleMandatory(loanCode, doc.id)}
                                title={doc.mandatory ? 'Click to make optional' : 'Click to make mandatory'}
                                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                  doc.mandatory
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {doc.mandatory ? 'Mandatory' : 'Optional'}
                              </button>

                              {/* Rename */}
                              <button
                                onClick={() => handleStartRename(doc.id, doc.name)}
                                title="Rename document"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Remove */}
                              <button
                                onClick={() => handleRemoveDoc(loanCode, doc.id)}
                                title="Remove document"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add document inline form */}
                    {addingDocFor?.loanCode === loanCode ? (
                      <AddDocForm
                        onAdd={(doc) => handleAddDoc(loanCode, doc)}
                        onCancel={() => setAddingDocFor(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setAddingDocFor({ loanCode })}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-dashed border-gray-300 hover:border-gray-400"
                      >
                        <Plus className="w-4 h-4" />
                        Add document
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default ReqDocPage;
