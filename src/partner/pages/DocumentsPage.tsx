import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  Info,
  Loader2,
  BookOpen,
  Building2,
  X,
  AlertCircle,
  Link2,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import { uploadLeadDocument, getDocumentDownloadUrl, getReqDocs, generateUploadToken } from '../../api/documentsApi';
import type { ReqDocLender } from '../../api/documentsApi';
import { getLeads } from '../../api/leadsApi';
import { getLoanTypeLabel } from '../../data/loanProductsData';
import type { Lead, LeadDocument, DocumentStatus } from '../types/partner-dashboard';

// ── Loan type options (loan codes seeded in the DB) ───────────────────────────
const LOAN_TYPE_OPTIONS: { code: string; label: string }[] = [
  { code: 'home_loan',           label: 'Home Loan' },
  { code: 'personal_loan',       label: 'Personal Loan' },
  { code: 'business_loan',       label: 'Business Loan' },
  { code: 'car_loan',            label: 'Car Loan' },
  { code: 'lap',                 label: 'Loan Against Property' },
  { code: 'education_loan',      label: 'Education Loan' },
  { code: 'gold_loan',           label: 'Gold Loan' },
  { code: 'two_wheeler_loan',    label: 'Two-Wheeler Loan' },
  { code: 'working_capital_loan',label: 'Working Capital Loan' },
  { code: 'used_car_loan',       label: 'Used Car Loan' },
  { code: 'home_renovation_loan',label: 'Home Renovation Loan' },
  { code: 'overdraft',           label: 'Overdraft' },
  { code: 'lrd',                 label: 'LRD (Lease Rental Discounting)' },
  { code: 'ev_loan',             label: 'EV Loan' },
  { code: 'mudra_kishor',        label: 'Mudra – Kishor' },
  { code: 'mudra_tarun',         label: 'Mudra – Tarun' },
  { code: 'kcc',                 label: 'Kisan Credit Card' },
];

// ── CheckReqDocsPanel ─────────────────────────────────────────────────────────

function CheckReqDocsPanel({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'loan' | 'banks' | 'docs'>('loan');
  const [selectedLoan, setSelectedLoan] = useState('');
  const [lenders, setLenders] = useState<ReqDocLender[]>([]);
  const [selectedLender, setSelectedLender] = useState<ReqDocLender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLenders = async (loanCode: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await getReqDocs(loanCode);
      if (res.success && res.data) {
        setLenders(res.data.filter(l => l.docs.some(d => d.loanCode === loanCode)));
        setStep('banks');
      } else {
        setError('Failed to load banks. Please try again.');
      }
    } catch {
      setError('Failed to load banks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoanSelect = (code: string) => {
    setSelectedLoan(code);
    fetchLenders(code);
  };

  const handleLenderSelect = (lender: ReqDocLender) => {
    setSelectedLender(lender);
    setStep('docs');
  };

  const docsForLoan = useMemo(() => {
    if (!selectedLender || !selectedLoan) return [];
    return selectedLender.docs
      .filter(d => d.loanCode === selectedLoan)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [selectedLender, selectedLoan]);

  const mandatory = docsForLoan.filter(d => d.mandatory);
  const optional  = docsForLoan.filter(d => !d.mandatory);
  const loanLabel = LOAN_TYPE_OPTIONS.find(l => l.code === selectedLoan)?.label ?? selectedLoan;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-blue-600" />
          <span className="font-semibold text-slate-800">Required Documents Checker</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <button onClick={() => setStep('loan')} className={`hover:text-slate-700 ${step === 'loan' ? 'text-slate-700 font-medium' : ''}`}>Loan Type</button>
            <ChevronRight size={12} />
            <button onClick={() => step !== 'loan' && setStep('banks')} className={`hover:text-slate-700 ${step === 'banks' ? 'text-slate-700 font-medium' : ''} ${step === 'loan' ? 'opacity-40 pointer-events-none' : ''}`}>Banks</button>
            <ChevronRight size={12} />
            <span className={step === 'docs' ? 'text-slate-700 font-medium' : 'opacity-40'}>Documents</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Step 1 – Pick a loan type */}
        {step === 'loan' && (
          <div>
            <p className="text-sm text-slate-500 mb-4">Select a loan type to see which banks are available and what documents they require.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LOAN_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.code}
                  onClick={() => handleLoanSelect(opt.code)}
                  disabled={loading}
                  className="text-left px-3 py-2.5 text-sm border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {loading && (
              <div className="flex items-center gap-2 mt-4 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            )}
          </div>
        )}

        {/* Step 2 – Pick a bank */}
        {step === 'banks' && (
          <div>
            <p className="text-sm text-slate-500 mb-1">
              <span className="font-medium text-slate-700">{lenders.length}</span> banks/NBFCs offer <span className="font-medium text-blue-600">{loanLabel}</span>. Select one to view required documents.
            </p>
            {error && <p className="text-sm text-red-500 mb-3 flex items-center gap-1"><AlertCircle size={13} />{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {lenders.map(lender => {
                const docsCount = lender.docs.filter(d => d.loanCode === selectedLoan).length;
                const mandCount = lender.docs.filter(d => d.loanCode === selectedLoan && d.mandatory).length;
                return (
                  <button
                    key={lender.lenderCode}
                    onClick={() => handleLenderSelect(lender)}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Building2 size={15} className="text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{lender.lenderName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">{mandCount} req</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">{docsCount} total</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3 – Show documents */}
        {step === 'docs' && selectedLender && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{loanLabel}</p>
                <p className="font-semibold text-slate-800">{selectedLender.lenderName}</p>
              </div>
              <button
                onClick={() => setStep('banks')}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <ChevronRight size={12} className="rotate-180" /> Back to banks
              </button>
            </div>

            {mandatory.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={11} className="text-red-400" /> Mandatory ({mandatory.length})
                </p>
                <div className="space-y-1.5">
                  {mandatory.map(doc => (
                    <div key={doc.id} className="flex items-start gap-2.5 p-2.5 bg-red-50/60 border border-red-100 rounded-lg">
                      <FileText size={14} className="text-red-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">{doc.docName}</p>
                        {doc.description && <p className="text-xs text-slate-400 mt-0.5">{doc.description}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{doc.acceptedFormats.join(', ').toUpperCase()} · max {doc.maxSizeMB} MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {optional.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle size={11} className="text-green-500" /> Optional ({optional.length})
                </p>
                <div className="space-y-1.5">
                  {optional.map(doc => (
                    <div key={doc.id} className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                      <FileText size={14} className="text-slate-300 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">{doc.docName}</p>
                        {doc.description && <p className="text-xs text-slate-400 mt-0.5">{doc.description}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{doc.acceptedFormats.join(', ').toUpperCase()} · max {doc.maxSizeMB} MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docsForLoan.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No documents found for this selection.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status / doc helpers ──────────────────────────────────────────────────────

const documentStatusConfig: Record<DocumentStatus, { icon: React.ReactNode; color: string; bg: string }> = {
  pending:  { icon: <Clock size={14} />,       color: 'text-slate-500',  bg: 'bg-slate-100' },
  uploaded: { icon: <FileText size={14} />,    color: 'text-blue-600',   bg: 'bg-blue-100' },
  verified: { icon: <CheckCircle size={14} />, color: 'text-green-600',  bg: 'bg-green-100' },
  rejected: { icon: <XCircle size={14} />,     color: 'text-red-600',    bg: 'bg-red-100' },
};

const getDocTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    pan_card: 'PAN Card', aadhaar_front: 'Aadhaar (Front)', aadhaar_back: 'Aadhaar (Back)',
    photo: 'Passport Photo', salary_slip_1: 'Salary Slip (Latest)', salary_slip_2: 'Salary Slip (2nd Month)',
    salary_slip_3: 'Salary Slip (3rd Month)', bank_statement: 'Bank Statement (6 months)',
    itr_1: 'ITR (Latest Year)', itr_2: 'ITR (Previous Year)', form_16: 'Form 16',
    address_proof: 'Address Proof', property_documents: 'Property Documents',
    business_proof: 'Business Proof', gst_certificate: 'GST Certificate',
  };
  return labels[type] || type;
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLeads, setExpandedLeads] = useState<string[]>([]);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [showReqChecker, setShowReqChecker] = useState(false);
  const hasAutoExpanded = useRef(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadLinkModal, setUploadLinkModal] = useState<{
    url: string;
    docType: string;
    customerName: string;
    customerEmail: string;
    expiresAt: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getLeads({}, false);
      if (response.success && response.data) {
        const leadsWithDocs = response.data.leads.filter(lead => lead.documents && lead.documents.length > 0);
        setLeads(leadsWithDocs);
        if (!hasAutoExpanded.current && leadsWithDocs.length > 0) {
          setExpandedLeads([leadsWithDocs[0].id]);
          hasAutoExpanded.current = true;
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filteredLeads = useMemo(() =>
    leads.filter(lead =>
      lead.client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.id.toLowerCase().includes(searchQuery.toLowerCase())
    ), [leads, searchQuery]);

  const toggleExpand = useCallback((leadId: string) => {
    setExpandedLeads(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]);
  }, []);

  const calculateCompletionRate = (documents: LeadDocument[]) => {
    if (documents.length === 0) return 0;
    return Math.round((documents.filter(d => d.status === 'verified' || d.status === 'uploaded').length / documents.length) * 100);
  };

  const handleFileUpload = useCallback(async (leadId: string, docId: string, file: File) => {
    setUploadingDocId(docId);
    try {
      const response = await uploadLeadDocument(leadId, docId, file);
      if (response.success && response.data?.document) {
        const updatedDoc = response.data.document;
        setLeads(prev => prev.map(lead =>
          lead.id !== leadId ? lead : {
            ...lead,
            documents: lead.documents.map(d =>
              d.id !== docId ? d : {
                ...d,
                fileName: updatedDoc.fileName,
                fileSize: updatedDoc.fileSize || d.fileSize,
                uploadedAt: updatedDoc.uploadedAt ? new Date(updatedDoc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
                status: (updatedDoc.status as DocumentStatus) || 'uploaded',
              }
            ),
          }
        ));
      } else {
        alert(`Upload failed: ${response.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploadingDocId(null);
    }
  }, []);

  const handleDownload = useCallback(async (docId: string) => {
    try {
      const response = await getDocumentDownloadUrl(docId);
      if (response.success && response.data?.url) window.open(response.data.url, '_blank');
      else alert(response.message || 'Could not generate download link');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Download failed');
    }
  }, []);

  const handleView = useCallback(async (docId: string) => {
    try {
      const response = await getDocumentDownloadUrl(docId);
      if (response.success && response.data?.url) window.open(response.data.url, '_blank');
      else alert(response.message || 'Could not load document preview');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to load document');
    }
  }, []);

  const handleFileSelect = useCallback((leadId: string, docId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(leadId, docId, file);
    event.target.value = '';
  }, [handleFileUpload]);

  const triggerFileInput = (docId: string) => { fileInputRefs.current[docId]?.click(); };

  const handleSendUploadLink = useCallback(async (docId: string) => {
    try {
      const response = await generateUploadToken(docId);
      if (response.success && response.data) {
        setUploadLinkModal({
          url: response.data.uploadUrl,
          docType: response.data.document.type,
          customerName: response.data.customer.name,
          customerEmail: response.data.customer.email,
          expiresAt: response.data.expiresAt,
        });
        setLinkCopied(false);
      } else {
        alert(`Failed to generate link: ${response.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate upload link';
      alert(`Error: ${message}`);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-500 mt-1">Manage and upload documents for your leads</p>
        </div>
        <button
          onClick={() => setShowReqChecker(v => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all shadow-sm ${
            showReqChecker
              ? 'bg-blue-700 text-white border-blue-700'
              : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
          }`}
        >
          <BookOpen size={16} />
          Check Required Documents
        </button>
      </div>

      {/* Inline Required Docs Checker */}
      {showReqChecker && <CheckReqDocsPanel onClose={() => setShowReqChecker(false)} />}

      {/* Guidelines banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
        <div>
          <p className="text-sm font-medium text-amber-800">Document Guidelines</p>
          <p className="text-sm text-amber-700 mt-1">
            Upload clear, legible copies. Accepted formats: PDF, JPG, PNG. Maximum file size: 5MB per document.
            Documents with unclear information may be rejected by the bank.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name or lead ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Lead list */}
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="space-y-4">
          {filteredLeads.map((lead) => {
            const isExpanded = expandedLeads.includes(lead.id);
            const completionRate = calculateCompletionRate(lead.documents);
            const pendingCount = lead.documents.filter(d => d.status === 'pending').length;
            const rejectedCount = lead.documents.filter(d => d.status === 'rejected').length;

            return (
              <div key={lead.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleExpand(lead.id)}>
                  <div className="flex items-center gap-4">
                    <button className="p-1">
                      {isExpanded ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{lead.client.fullName}</h3>
                        <span className="text-xs text-slate-400 font-mono">{lead.id}</span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {getLoanTypeLabel(lead.loanType)} • {lead.status === 'docs_pending' ? 'Documents Required' : 'Documents Submitted'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-4">
                      {pendingCount > 0 && <span className="flex items-center gap-1.5 text-sm text-amber-600"><Clock size={14} />{pendingCount} pending</span>}
                      {rejectedCount > 0 && <span className="flex items-center gap-1.5 text-sm text-red-600"><XCircle size={14} />{rejectedCount} rejected</span>}
                    </div>
                    <div className="w-32">
                      <ProgressBar value={completionRate} showPercentage={false} size="sm" variant={completionRate === 100 ? 'success' : completionRate >= 50 ? 'default' : 'warning'} />
                      <p className="text-xs text-slate-500 text-center mt-1">{completionRate}% complete</p>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <div className="p-4 bg-slate-50">
                      <div className="grid grid-cols-1 gap-3">
                        {lead.documents.map((doc) => {
                          const statusConfig = documentStatusConfig[doc.status];
                          const isUploading = uploadingDocId === doc.id;
                          const canUpload = doc.status === 'pending' || doc.status === 'rejected';
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                                  <FileText size={20} className={statusConfig.color} />
                                </div>
                                <div>
                                  <h4 className="font-medium text-slate-800">{getDocTypeLabel(doc.type)}</h4>
                                  {doc.fileName ? (
                                    <p className="text-xs text-slate-500">{doc.fileName} • {doc.fileSize}{doc.uploadedAt && ` • Uploaded ${doc.uploadedAt}`}</p>
                                  ) : (
                                    <p className="text-xs text-slate-400">Not uploaded</p>
                                  )}
                                  {doc.rejectionReason && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><Info size={12} />{doc.rejectionReason}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg}`}>
                                  {statusConfig.icon}
                                  <span className={`text-xs font-medium capitalize ${statusConfig.color}`}>{doc.status}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {canUpload ? (
                                    <>
                                      <input
                                        type="file"
                                        ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                                        onChange={(e) => handleFileSelect(lead.id, doc.id, e)}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                      />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); triggerFileInput(doc.id); }}
                                        disabled={isUploading}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                      >
                                        {isUploading ? <><Loader2 size={14} className="animate-spin" />Uploading...</> : <><Upload size={14} />Upload</>}
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSendUploadLink(doc.id); }}
                                        className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                                        title="Send Upload Link to Customer"
                                      >
                                        <Share2 size={15} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); handleView(doc.id); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View document"><Eye size={16} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDownload(doc.id); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Download"><Download size={16} /></button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {lead.documents.some(d => d.status === 'pending') && (
                        <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <Info size={16} className="text-blue-600" />
                            <span className="text-sm text-blue-800">{lead.documents.filter(d => d.status === 'pending').length} document(s) pending upload</span>
                          </div>
                          <button
                            onClick={() => {
                              const firstPending = lead.documents.find(d => d.status === 'pending');
                              if (firstPending) handleSendUploadLink(firstPending.id);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
                          >
                            <Share2 size={15} />
                            Send Upload Link
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<FileText size={32} />}
            title="No documents found"
            description={searchQuery ? "No leads match your search. Try a different search term." : "You don't have any leads with pending documents."}
            action={{ label: 'Add New Lead', onClick: () => {} }}
          />
        </div>
      )}

      {/* Upload Link Modal */}
      {uploadLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Upload Link Generated</h2>
                  <p className="text-sm text-gray-500">{uploadLinkModal.docType}</p>
                </div>
              </div>
              <button
                onClick={() => setUploadLinkModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <p className="text-sm text-gray-900">{uploadLinkModal.customerName}</p>
                {uploadLinkModal.customerEmail && (
                  <p className="text-xs text-gray-500">{uploadLinkModal.customerEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={uploadLinkModal.url}
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-mono truncate"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(uploadLinkModal.url);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      linkCopied
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                    }`}
                  >
                    {linkCopied ? (
                      <><Check className="w-4 h-4" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy</>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <Clock className="w-3.5 h-3.5 inline -mt-0.5" /> This link expires on{' '}
                  <strong>{new Date(uploadLinkModal.expiresAt).toLocaleString()}</strong>
                  {' '}and allows the customer to upload all pending documents.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setUploadLinkModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}