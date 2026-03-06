import React, { useState, useMemo, useCallback, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getBanks } from '../../api/banksApi';
import type { BankFromApi } from '../../api/banksApi';
import {
  getDocRequirements,
  createDocRequirement,
  updateDocRequirement,
  deleteDocRequirement,
} from '../../api/reqDocApi';
import type { LenderDocRequirement } from '../../api/reqDocApi';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  CheckCircle,
  AlertCircle,
  Building2,
  Edit3,
  Save,
  Trash2,
  Loader2,
} from 'lucide-react';

// --- Types --------------------------------------------------------------------

interface BankLoanDocMap {
  /** bankCode → loanCode → list of docs */
  [bankCode: string]: {
    [loanCode: string]: LenderDocRequirement[];
  };
}

// --- Add Doc Form -------------------------------------------------------------

interface AddDocFormProps {
  onAdd: (payload: {
    docName: string; description?: string; mandatory: boolean;
    acceptedFormats: string[]; maxSizeMB: number;
  }) => Promise<void>;
  onCancel: () => void;
}

const AddDocForm: React.FC<AddDocFormProps> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mandatory, setMandatory] = useState(true);
  const [formats, setFormats] = useState('pdf,jpg,png');
  const [maxSize, setMaxSize] = useState(5);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Document name is required'); return; }
    setSaving(true);
    try {
      await onAdd({
        docName: name.trim(),
        description: description.trim() || undefined,
        mandatory,
        acceptedFormats: formats.split(',').map((f) => f.trim()).filter(Boolean),
        maxSizeMB: maxSize,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Add New Document</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Document Name *</label>
          <input
            type="text" value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="e.g. Salary Slip"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Description</label>
          <input
            type="text" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Accepted Formats (comma-separated)</label>
          <input
            type="text" value={formats}
            onChange={(e) => setFormats(e.target.value)}
            placeholder="pdf,jpg,png"
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Max Size (MB)</label>
          <input
            type="number" value={maxSize} min={1} max={100}
            onChange={(e) => setMaxSize(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
        <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="w-4 h-4 accent-blue-600" />
        <span className="text-sm text-gray-700">Mandatory document</span>
      </label>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit" disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Document
        </button>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
};

// --- Main Component -----------------------------------------------------------

const ReqDocPage: React.FC = () => {
  const [docMap, setDocMap] = useState<BankLoanDocMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banksList, setBanksList] = useState<BankFromApi[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('');
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showMandatoryOnly, setShowMandatoryOnly] = useState(false);
  const [addingDocFor, setAddingDocFor] = useState<{ loanCode: string } | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [mutating, setMutating] = useState<Record<string, boolean>>({});

  // -- Load banks from API on mount -------------------------------------------
  useEffect(() => {
    getBanks()
      .then((res) => {
        if (res.success && res.data?.banks) {
          setBanksList(res.data.banks);
          if (res.data.banks.length > 0 && !selectedBankCode) {
            setSelectedBankCode(res.data.banks[0].code);
          }
        }
      })
      .catch(() => {/* keep empty */});
  }, []);

  // -- Load all docs from API on mount ----------------------------------------
  useEffect(() => {
    setIsLoading(true);
    getDocRequirements()
      .then(({ data }) => {
        if (!data) return;
        const map: BankLoanDocMap = {};
        const rows = Array.isArray(data) ? data : [];
        for (const row of rows) {
          map[row.lenderCode] ??= {};
          map[row.lenderCode][row.loanCode] ??= [];
          map[row.lenderCode][row.loanCode].push(row);
        }
        setDocMap(map);
      })
      .catch(() => setError('Failed to load document requirements'))
      .finally(() => setIsLoading(false));
  }, []);

  const selectedBank = useMemo(
    () => banksList.find((b) => b.code === selectedBankCode),
    [banksList, selectedBankCode]
  );

  const bankLoanDocs = useMemo(
    () => docMap[selectedBankCode] ?? {},
    [docMap, selectedBankCode]
  );

  const filteredLoanCodes = useMemo(() => {
    const loanCodes = Object.keys(bankLoanDocs);
    if (!searchQuery) return loanCodes;
    const q = searchQuery.toLowerCase();
    return loanCodes.filter((code) => {
      const nameMatch = code.replace(/_/g, ' ').includes(q);
      const docMatch = bankLoanDocs[code].some((d) => d.docName.toLowerCase().includes(q));
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

  // -- Mutations ---------------------------------------------------------------

  const handleRemoveDoc = useCallback(async (loanCode: string, docId: string) => {
    setMutating((m) => ({ ...m, [docId]: true }));
    try {
      await deleteDocRequirement(docId);
      setDocMap((prev) => {
        const bankMap = { ...prev[selectedBankCode] };
        bankMap[loanCode] = bankMap[loanCode].filter((d) => d.id !== docId);
        return { ...prev, [selectedBankCode]: bankMap };
      });
    } catch {
      alert('Failed to remove document');
    } finally {
      setMutating((m) => { const n = { ...m }; delete n[docId]; return n; });
    }
  }, [selectedBankCode]);

  const handleToggleMandatory = useCallback(async (loanCode: string, doc: LenderDocRequirement) => {
    const next = !doc.mandatory;
    setMutating((m) => ({ ...m, [doc.id]: true }));
    // Optimistic update
    setDocMap((prev) => {
      const bankMap = { ...prev[selectedBankCode] };
      bankMap[loanCode] = bankMap[loanCode].map((d) => d.id === doc.id ? { ...d, mandatory: next } : d);
      return { ...prev, [selectedBankCode]: bankMap };
    });
    try {
      await updateDocRequirement(doc.id, { mandatory: next });
    } catch {
      // Roll back
      setDocMap((prev) => {
        const bankMap = { ...prev[selectedBankCode] };
        bankMap[loanCode] = bankMap[loanCode].map((d) => d.id === doc.id ? { ...d, mandatory: !next } : d);
        return { ...prev, [selectedBankCode]: bankMap };
      });
      alert('Failed to update document');
    } finally {
      setMutating((m) => { const n = { ...m }; delete n[doc.id]; return n; });
    }
  }, [selectedBankCode]);

  const handleAddDoc = useCallback(async (
    loanCode: string,
    payload: { docName: string; description?: string; mandatory: boolean; acceptedFormats: string[]; maxSizeMB: number }
  ) => {
    const bank = selectedBank;
    if (!bank) return;
    const { data } = await createDocRequirement({
      lenderCode: bank.code,
      lenderName: bank.name,
      loanCode,
      ...payload,
    });
    if (data) {
      setDocMap((prev) => {
        const bankMap = { ...prev[selectedBankCode] };
        bankMap[loanCode] = [...(bankMap[loanCode] ?? []), data];
        return { ...prev, [selectedBankCode]: bankMap };
      });
    }
    setAddingDocFor(null);
  }, [selectedBank, selectedBankCode]);

  const handleStartRename = (docId: string, currentName: string) => {
    setEditingDocId(docId === editingDocId ? null : docId);
    setEditName(currentName);
  };

  const handleSaveRename = useCallback(async (loanCode: string, doc: LenderDocRequirement) => {
    if (!editName.trim() || editName.trim() === doc.docName) { setEditingDocId(null); return; }
    setMutating((m) => ({ ...m, [doc.id]: true }));
    const newName = editName.trim();
    // Optimistic
    setDocMap((prev) => {
      const bankMap = { ...prev[selectedBankCode] };
      bankMap[loanCode] = bankMap[loanCode].map((d) => d.id === doc.id ? { ...d, docName: newName } : d);
      return { ...prev, [selectedBankCode]: bankMap };
    });
    setEditingDocId(null);
    try {
      await updateDocRequirement(doc.id, { docName: newName });
    } catch {
      // Roll back
      setDocMap((prev) => {
        const bankMap = { ...prev[selectedBankCode] };
        bankMap[loanCode] = bankMap[loanCode].map((d) => d.id === doc.id ? { ...d, docName: doc.docName } : d);
        return { ...prev, [selectedBankCode]: bankMap };
      });
      alert('Failed to rename document');
    } finally {
      setMutating((m) => { const n = { ...m }; delete n[doc.id]; return n; });
    }
  }, [selectedBankCode, editName]);

  const totalDocsForBank = useMemo(
    () => Object.values(bankLoanDocs).reduce((acc, docs) => acc + docs.length, 0),
    [bankLoanDocs]
  );
  const mandatoryCount = useMemo(
    () => Object.values(bankLoanDocs).reduce((acc, docs) => acc + docs.filter((d) => d.mandatory).length, 0),
    [bankLoanDocs]
  );

  // -- Render ------------------------------------------------------------------

  return (
    <AdminLayout>
      {/* Page Header */}
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
        {selectedBank && !isLoading && (
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
              <span className="text-sm font-medium text-green-700">{totalDocsForBank - mandatoryCount} optional</span>
            </div>
          </div>
        )}
      </div>

      {/* Bank / NBFC Tab Strip */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 pb-1 min-w-max">
          {banksList.map((bank) => {
            const isActive = bank.code === selectedBankCode;
            const loanCount = Object.keys(docMap[bank.code] ?? {}).length;
            return (
              <button
                key={bank.id}
                onClick={() => {
                  setSelectedBankCode(bank.code);
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
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {isLoading ? '…' : loanCount}
                </span>
                {bank.status === 'inactive' && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Inactive</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Loading document requirements…</span>
        </div>
      )}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-xs text-red-500 underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter */}
      {!isLoading && !error && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search loan types or document names…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={showMandatoryOnly} onChange={(e) => setShowMandatoryOnly(e.target.checked)} className="w-4 h-4 accent-gray-900" />
              <span className="text-sm text-gray-700 whitespace-nowrap">Mandatory only</span>
            </label>
            <button onClick={() => setExpandedLoans(new Set(filteredLoanCodes))} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Expand all</button>
            <button onClick={() => setExpandedLoans(new Set())} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Collapse all</button>
          </div>

          {/* Loan Accordion List */}
          {filteredLoanCodes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {Object.keys(bankLoanDocs).length === 0
                  ? 'No data seeded for this bank yet'
                  : 'No loan types match your search'}
              </p>
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
                  <div key={loanCode} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Accordion header */}
                    <button
                      onClick={() => toggleLoan(loanCode)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-400">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </span>
                      <span className="flex-1 font-medium text-gray-900">{loanLabel}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-red-50 text-red-600 font-medium rounded-full">{mandatoryDocsCount} mandatory</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 font-medium rounded-full">{rawDocs.length} total</span>
                      </div>
                    </button>

                    {/* Accordion body */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                        {docs.length === 0 ? (
                          <p className="text-sm text-gray-400 italic py-2">No documents match the current filter.</p>
                        ) : (
                          <div className="space-y-2">
                            {docs.map((doc) => (
                              <div
                                key={doc.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                  doc.mandatory ? 'bg-red-50/40 border-red-100' : 'bg-gray-50 border-gray-100'
                                } ${mutating[doc.id] ? 'opacity-60 pointer-events-none' : ''}`}
                              >
                                <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${doc.mandatory ? 'text-red-400' : 'text-gray-300'}`} />
                                <div className="flex-1 min-w-0">
                                  {editingDocId === doc.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        autoFocus value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveRename(loanCode, doc);
                                          if (e.key === 'Escape') setEditingDocId(null);
                                        }}
                                        className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                      <button onClick={() => handleSaveRename(loanCode, doc)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Save</button>
                                      <button onClick={() => setEditingDocId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium text-gray-800 truncate">{doc.docName}</p>
                                      {doc.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.description}</p>}
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {doc.acceptedFormats.join(', ').toUpperCase()} · max {doc.maxSizeMB} MB
                                      </p>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleToggleMandatory(loanCode, doc)}
                                    title={doc.mandatory ? 'Click to make optional' : 'Click to make mandatory'}
                                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                      doc.mandatory
                                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {doc.mandatory ? 'Mandatory' : 'Optional'}
                                  </button>
                                  <button
                                    onClick={() => handleStartRename(doc.id, doc.docName)}
                                    title="Rename document"
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveDoc(loanCode, doc.id)}
                                    title="Remove document"
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  >
                                    {mutating[doc.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {addingDocFor?.loanCode === loanCode ? (
                          <AddDocForm
                            onAdd={(payload) => handleAddDoc(loanCode, payload)}
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
        </>
      )}
    </AdminLayout>
  );
};

export default ReqDocPage;
