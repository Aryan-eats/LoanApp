import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import {
  DocumentStatsCards,
  DocumentFilters,
  DocumentLeadCard,
  DocumentPreviewModal,
} from '../components/documents';
import type { Lead, LeadDocument, DocumentStatus, LeadStatus } from '../types/admin';
import { FileText, X, Plus, Loader2 } from 'lucide-react';
import {
  getProductsByCategory,
  type LoanCategory,
} from '../../data/loanProductsData';
import {
  CreditCard,
  Business,
  Home,
  AccountBalance,
  DriveEta,
  Stars,
  School,
  Grass,
  Flag,
  ShoppingCart,
  FlashOn,
  Construction,
} from '@mui/icons-material';
import { uploadLeadDocument, getDocumentDownloadUrl, deleteLeadDocument, updateDocumentStatus, bulkUpdateDocumentStatus } from '../../api/documentsApi';
import { getLeads } from '../../api/leadsApi';
import { getRequiredDocsForLoanCode } from '../../data/DocsReq';

const loanCategories: { value: LoanCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'personal', label: 'Personal', icon: <CreditCard fontSize="small" /> },
  { value: 'business', label: 'Business', icon: <Business fontSize="small" /> },
  { value: 'home', label: 'Home', icon: <Home fontSize="small" /> },
  { value: 'property', label: 'Property', icon: <AccountBalance fontSize="small" /> },
  { value: 'vehicle', label: 'Vehicle', icon: <DriveEta fontSize="small" /> },
  { value: 'gold_securities', label: 'Gold & Securities', icon: <Stars fontSize="small" /> },
  { value: 'education', label: 'Education', icon: <School fontSize="small" /> },
  { value: 'agriculture', label: 'Agriculture', icon: <Grass fontSize="small" /> },
  { value: 'government', label: 'Govt. Schemes', icon: <Flag fontSize="small" /> },
  { value: 'corporate', label: 'Corporate', icon: <AccountBalance fontSize="small" /> },
  { value: 'consumer', label: 'Consumer', icon: <ShoppingCart fontSize="small" /> },
  { value: 'short_term', label: 'Short-Term', icon: <FlashOn fontSize="small" /> },
  { value: 'real_estate', label: 'Real Estate', icon: <Construction fontSize="small" /> },
  { value: 'specialized', label: 'Specialized', icon: <FlashOn fontSize="small" /> },
];

/** Map an API lead response to the admin Lead type */
const mapApiLead = (apiLead: any): Lead => ({
  id: apiLead.id,
  customerId: apiLead.client?.id || apiLead.customerId || '',
  customerName: apiLead.client?.fullName || apiLead.customerName || 'Unknown',
  customerPhone: apiLead.client?.phone || apiLead.customerPhone || '',
  customerEmail: apiLead.client?.email || apiLead.customerEmail || '',
  loanType: apiLead.loanType,
  loanAmount: Number(apiLead.loanAmount),
  partnerId: apiLead.partnerId || 'DIRECT',
  partnerName: apiLead.partnerName || 'Direct (Website)',
  status: apiLead.status as LeadStatus,
  bankAssigned: apiLead.bankAssigned,
  preferredBank: apiLead.preferredBank,
  createdAt: apiLead.createdAt,
  updatedAt: apiLead.updatedAt,
  timeline: (apiLead.timeline || []).map((e: any) => ({
    id: e.id,
    status: e.status,
    timestamp: e.timestamp,
    updatedBy: e.updatedBy,
    note: e.note,
  })),
  documents: (apiLead.documents || []).map((d: any) => ({
    id: d.id,
    type: d.type,
    fileName: d.fileName || '',
    fileSize: d.fileSize,
    fileUrl: d.fileUrl,
    mimeType: d.mimeType,
    r2ObjectKey: d.r2ObjectKey,
    uploadedBy: d.uploadedBy || 'Partner',
    uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '',
    status: d.status as DocumentStatus,
    url: d.fileUrl,
  })),
});

/** Leads relevant to the documents page: docs_pending / docs_uploaded / any with documents */
const DOC_RELEVANT_STATUSES: LeadStatus[] = ['docs_pending', 'docs_uploaded', 'bank_processing'];

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [apiLeads, setApiLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [expandedLeads, setExpandedLeads] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<{ doc: LeadDocument; lead: Lead } | null>(null);
  const hasAutoExpanded = useRef(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addedClients, setAddedClients] = useState<Lead[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<LoanCategory | ''>('');
  const [formData, setFormData] = useState({
    customerName: '',
    loanType: '',
    loanAmount: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    docId: string;
    leadId: string;
    docType: string;
    bulk?: boolean;
    docIds?: string[];
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── API fetch ─────────────────────────────────────────────────────────────
  const fetchDocLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getLeads({}, true); // isAdmin = true
      if (response.success && response.data) {
        const mapped: Lead[] = response.data.leads
          .map(mapApiLead)
          // Show leads that are docs_pending/docs_uploaded/bank_processing,
          // or any lead that already has at least one document slot created.
          .filter(
            (l: Lead) =>
              DOC_RELEVANT_STATUSES.includes(l.status) || l.documents.length > 0
          );
        setApiLeads(mapped);
        // Auto-expand the first lead on first load only
        if (!hasAutoExpanded.current && mapped.length > 0) {
          setExpandedLeads([mapped[0].id]);
          hasAutoExpanded.current = true;
        }
      }
    } catch (err) {
      console.error('Failed to fetch document leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocLeads();
  }, [fetchDocLeads]);

  const documentStats = useMemo(() => {
    const allLeads = [...apiLeads, ...addedClients];
    const allDocuments = allLeads.flatMap((lead) => lead.documents);
    return {
      total: allDocuments.length,
      pending: allDocuments.filter((d) => d.status === 'pending').length,
      verified: allDocuments.filter((d) => d.status === 'verified').length,
      rejected: allDocuments.filter((d) => d.status === 'rejected').length,
    };
  }, [apiLeads, addedClients]);

  const allLeadsWithDocs = useMemo(() => {
    // addedClients that have already had documents generated
    const addedWithDocs = addedClients.filter(
      (lead) => DOC_RELEVANT_STATUSES.includes(lead.status) || lead.documents.length > 0
    );
    return [...addedWithDocs, ...apiLeads];
  }, [apiLeads, addedClients]);

  const filteredLeads = useMemo(() => {
    return allLeadsWithDocs.filter((lead) => {
      const matchesSearch =
        lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.customerPhone.includes(searchQuery) ||
        lead.partnerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.documents.some((d) => d.type.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = !statusFilter || lead.documents.some((d) => d.status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [allLeadsWithDocs, searchQuery, statusFilter]);

  const toggleExpand = useCallback((leadId: string) => {
    setExpandedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  }, []);

  const handleToggleExpandAll = useCallback(() => {
    if (expandedLeads.length === filteredLeads.length) {
      setExpandedLeads([]);
    } else {
      setExpandedLeads(filteredLeads.map((l) => l.id));
    }
  }, [expandedLeads.length, filteredLeads]);

  const handleApprove = useCallback(async (docId: string, leadId: string) => {
    setIsProcessing(true);
    try {
      const response = await updateDocumentStatus(docId, 'verified');
      if (response.success) {
        const patchDoc = (d: LeadDocument) =>
          d.id !== docId ? d : { ...d, status: 'verified' as DocumentStatus };
        const patchLead = (lead: Lead) =>
          lead.id !== leadId ? lead : { ...lead, documents: lead.documents.map(patchDoc) };

        setApiLeads((prev) => prev.map(patchLead));
        setAddedClients((prev) => prev.map(patchLead));
        setSelectedDoc(null);
      } else {
        alert(`Failed to verify: ${response.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      alert(message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleRejectRequest = useCallback((docId: string, leadId: string, docType?: string) => {
    setRejectModal({ docId, leadId, docType: docType || 'document' });
    setRejectionReason('');
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectModal || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      if (rejectModal.bulk && rejectModal.docIds) {
        // Bulk reject
        const response = await bulkUpdateDocumentStatus(
          rejectModal.docIds,
          'rejected',
          rejectionReason.trim(),
        );
        if (response.success) {
          const idsSet = new Set(rejectModal.docIds);
          const patchDoc = (d: LeadDocument) =>
            !idsSet.has(d.id) ? d : { ...d, status: 'rejected' as DocumentStatus };
          const patchLead = (lead: Lead) =>
            lead.id !== rejectModal.leadId ? lead : { ...lead, documents: lead.documents.map(patchDoc) };

          setApiLeads((prev) => prev.map(patchLead));
          setAddedClients((prev) => prev.map(patchLead));
        } else {
          alert(`Failed to reject: ${response.message || 'Unknown error'}`);
        }
      } else {
        // Single reject
        const response = await updateDocumentStatus(
          rejectModal.docId,
          'rejected',
          rejectionReason.trim(),
        );
        if (response.success) {
          const patchDoc = (d: LeadDocument) =>
            d.id !== rejectModal.docId ? d : { ...d, status: 'rejected' as DocumentStatus };
          const patchLead = (lead: Lead) =>
            lead.id !== rejectModal.leadId ? lead : { ...lead, documents: lead.documents.map(patchDoc) };

          setApiLeads((prev) => prev.map(patchLead));
          setAddedClients((prev) => prev.map(patchLead));
          setSelectedDoc(null);
        } else {
          alert(`Failed to reject: ${response.message || 'Unknown error'}`);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Rejection failed';
      alert(message);
    } finally {
      setIsProcessing(false);
      setRejectModal(null);
      setRejectionReason('');
    }
  }, [rejectModal, rejectionReason]);

  const handleBulkVerify = useCallback(async (leadId: string, docIds: string[]) => {
    if (docIds.length === 0) return;
    setIsProcessing(true);
    try {
      const response = await bulkUpdateDocumentStatus(docIds, 'verified');
      if (response.success) {
        const idsSet = new Set(docIds);
        const patchDoc = (d: LeadDocument) =>
          !idsSet.has(d.id) ? d : { ...d, status: 'verified' as DocumentStatus };
        const patchLead = (lead: Lead) =>
          lead.id !== leadId ? lead : { ...lead, documents: lead.documents.map(patchDoc) };

        setApiLeads((prev) => prev.map(patchLead));
        setAddedClients((prev) => prev.map(patchLead));
      } else {
        alert(`Failed to verify: ${response.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Bulk verify failed';
      alert(message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleBulkRejectRequest = useCallback((leadId: string, docIds: string[]) => {
    if (docIds.length === 0) return;
    setRejectModal({ docId: '', leadId, docType: `${docIds.length} document(s)`, bulk: true, docIds });
    setRejectionReason('');
  }, []);

  const handleNotifyPartner = useCallback((lead: Lead, doc: LeadDocument) => {
    console.log('Notifying partner for lead:', lead.id, 'document:', doc.type);
    alert(
      `Notification sent to partner "${lead.partnerName}" requesting ${doc.type} for ${lead.customerName}`
    );
  }, []);

  const handleSendUploadLink = useCallback((lead: Lead, doc: LeadDocument) => {
    console.log('Sending upload link to customer:', lead.customerEmail, 'for document:', doc.type);
    alert(`Upload link sent to ${lead.customerEmail} for uploading ${doc.type}`);
  }, []);

  const handleViewDocument = useCallback((doc: LeadDocument, lead: Lead) => {
    setSelectedDoc({ doc, lead });
  }, []);

  const handleUploadFile = useCallback(async (leadId: string, docId: string, file: File) => {
    setUploadingDocId(docId);
    try {
      const response = await uploadLeadDocument(leadId, docId, file);
      if (response.success && response.data?.document) {
        const updatedDoc = response.data.document;

        const patchDoc = (d: LeadDocument) =>
          d.id !== docId
            ? d
            : {
                ...d,
                fileName: updatedDoc.fileName,
                uploadedBy: updatedDoc.uploadedBy || 'Admin',
                uploadedAt: updatedDoc.uploadedAt
                  ? new Date(updatedDoc.uploadedAt).toLocaleDateString()
                  : new Date().toLocaleDateString(),
                status: (updatedDoc.status as DocumentStatus) || 'uploaded',
                url: updatedDoc.fileUrl || undefined,
              };

        const patchLead = (lead: Lead) =>
          lead.id !== leadId ? lead : { ...lead, documents: lead.documents.map(patchDoc) };

        // Update in both addedClients and apiLeads
        setAddedClients((prev) => prev.map(patchLead));
        setApiLeads((prev) => prev.map(patchLead));

        alert(`✅ "${file.name}" uploaded successfully for ${updatedDoc.type || 'document'}`);
      } else {
        alert(`❌ Upload failed: ${response.message || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      alert(`❌ ${message}`);
    } finally {
      setUploadingDocId(null);
    }
  }, []);

  const handleDownloadFile = useCallback(async (docId: string) => {
    try {
      const response = await getDocumentDownloadUrl(docId);
      if (response.success && response.data?.url) {
        // Open the pre-signed URL in a new tab to download
        window.open(response.data.url, '_blank');
      } else {
        alert(response.message || 'Could not generate download link');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Download failed';
      alert(`❌ ${message}`);
    }
  }, []);

  const handleDeleteDocument = useCallback(async (leadId: string, docId: string) => {
    try {
      const response = await deleteLeadDocument(docId);
      if (response.success) {
        const patchDoc = (d: LeadDocument) =>
          d.id !== docId
            ? d
            : { ...d, fileName: '', uploadedBy: '', uploadedAt: '', status: 'pending' as DocumentStatus, url: undefined };

        const patchLead = (lead: Lead) =>
          lead.id !== leadId ? lead : { ...lead, documents: lead.documents.map(patchDoc) };

        setApiLeads((prev) => prev.map(patchLead));
        setAddedClients((prev) => prev.map(patchLead));
        setSelectedDoc(null);
        alert('✅ Document deleted successfully');
      } else {
        alert(`❌ ${response.message || 'Delete failed'}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      alert(`❌ ${message}`);
    }
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setShowAddModal(true);
    setFormData({ customerName: '', loanType: '', loanAmount: '' });
    setSelectedCategory('');
    setFormErrors({});
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setFormData({ customerName: '', loanType: '', loanAmount: '' });
    setSelectedCategory('');
    setFormErrors({});
  }, []);

  const handleCategoryChange = useCallback((category: LoanCategory) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, loanType: '' }));
  }, []);

  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!formData.customerName.trim()) errors.customerName = 'Client name is required';
    if (!selectedCategory) errors.loanCategory = 'Please select a loan category';
    if (!formData.loanType) errors.loanType = 'Please select a loan type';
    if (!formData.loanAmount) errors.loanAmount = 'Loan amount is required';
    else if (Number(formData.loanAmount) < 50000) errors.loanAmount = 'Minimum amount is ₹50,000';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, selectedCategory]);

  const handleAddClient = useCallback(() => {
    if (!validateForm()) return;

    const newClientId = `NEW-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    // Derive required docs from the chosen loan type using DocsReq data
    const requiredDocs = getRequiredDocsForLoanCode(formData.loanType);
    const newDocuments: LeadDocument[] = requiredDocs.map((req, index) => ({
      id: `${newClientId}-D${index + 1}`,
      type: req.name,
      fileName: '',
      uploadedBy: '',
      uploadedAt: '',
      status: 'pending' as DocumentStatus,
    }));

    const newClient: Lead = {
      id: newClientId,
      customerId: `C-${Date.now()}`,
      customerName: formData.customerName.trim(),
      customerPhone: '',
      customerEmail: '',
      loanType: formData.loanType,
      loanAmount: Number(formData.loanAmount),
      partnerId: 'ADMIN',
      partnerName: 'Direct Entry',
      status: 'docs_pending',
      createdAt: today,
      updatedAt: today,
      timeline: [
        {
          id: 'T1',
          status: 'docs_pending',
          timestamp: new Date().toLocaleString(),
          updatedBy: 'Admin',
        },
      ],
      documents: newDocuments,
    };

    setAddedClients(prev => [newClient, ...prev]);
    setExpandedLeads(prev => [newClientId, ...prev]);
    handleCloseAddModal();
  }, [formData, validateForm, handleCloseAddModal]);

  return (
    <AdminLayout onAddLead={() => navigate('/admin/docs/reqdoc')} addButtonLabel="Documents">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Review and verify customer documents</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      <DocumentStatsCards stats={documentStats} />

      <DocumentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        expandedCount={expandedLeads.length}
        totalCount={filteredLeads.length}
        onToggleExpandAll={handleToggleExpandAll}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <DocumentLeadCard
              key={lead.id}
              lead={lead}
              isExpanded={expandedLeads.includes(lead.id)}
              onToggleExpand={() => toggleExpand(lead.id)}
              onViewDocument={(doc) => handleViewDocument(doc, lead)}
              onApprove={(docId) => handleApprove(docId, lead.id)}
              onReject={(docId) => {
                const doc = lead.documents.find((d) => d.id === docId);
                handleRejectRequest(docId, lead.id, doc?.type);
              }}
              onNotifyPartner={(doc) => handleNotifyPartner(lead, doc)}
              onSendUploadLink={(doc) => handleSendUploadLink(lead, doc)}
              onUploadFile={handleUploadFile}
              onDownloadFile={handleDownloadFile}
              uploadingDocId={uploadingDocId}
              onBulkVerify={(docIds) => handleBulkVerify(lead.id, docIds)}
              onBulkReject={(docIds) => handleBulkRejectRequest(lead.id, docIds)}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">No documents found</p>
          <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
        </div>
      )}

      {selectedDoc && (
        <DocumentPreviewModal
          selectedDoc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onApprove={() => handleApprove(selectedDoc.doc.id, selectedDoc.lead.id)}
          onReject={() => handleRejectRequest(selectedDoc.doc.id, selectedDoc.lead.id, selectedDoc.doc.type)}
          onNotifyPartner={() => handleNotifyPartner(selectedDoc.lead, selectedDoc.doc)}
          onSendUploadLink={() => handleSendUploadLink(selectedDoc.lead, selectedDoc.doc)}
          onDownload={() => handleDownloadFile(selectedDoc.doc.id)}
          onDelete={() => handleDeleteDocument(selectedDoc.lead.id, selectedDoc.doc.id)}
          isProcessing={isProcessing}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Client</h2>
                  <p className="text-sm text-gray-500">Create a new client with document checklist</p>
                </div>
              </div>
              <button
                onClick={handleCloseAddModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter client's full name"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                    formErrors.customerName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {formErrors.customerName && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {loanCategories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleCategoryChange(cat.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                        selectedCategory === cat.value
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={selectedCategory === cat.value ? 'text-white' : 'text-gray-500'}>
                        {cat.icon}
                      </span>
                      <span className="truncate w-full text-center">{cat.label}</span>
                    </button>
                  ))}
                </div>
                {formErrors.loanCategory && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.loanCategory}</p>
                )}
              </div>

              {selectedCategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.loanType}
                    onChange={(e) => setFormData(prev => ({ ...prev, loanType: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                      formErrors.loanType ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select loan type</option>
                    {getProductsByCategory(selectedCategory).map((product) => (
                      <option key={product.code} value={product.code}>
                        {product.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.loanType && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.loanType}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={formData.loanAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, loanAmount: e.target.value }))}
                    placeholder="500000"
                    min="50000"
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                      formErrors.loanAmount ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {formErrors.loanAmount && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.loanAmount}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Minimum: ₹50,000</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Documents Checklist</p>
                {formData.loanType ? (
                  <>
                    <p className="text-xs text-gray-500 mb-2">
                      {getRequiredDocsForLoanCode(formData.loanType).length} document(s) will be
                      created as pending for this client:
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {getRequiredDocsForLoanCode(formData.loanType).map((req, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border ${
                            req.mandatory
                              ? 'text-gray-700 bg-white border-gray-200'
                              : 'text-gray-400 bg-gray-50 border-dashed border-gray-200'
                          }`}
                        >
                          <FileText className={`w-3 h-3 shrink-0 ${req.mandatory ? 'text-gray-400' : 'text-gray-300'}`} />
                          <span className="truncate">{req.name}</span>
                          {!req.mandatory && (
                            <span className="ml-auto text-gray-300 font-light italic">opt</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Select a loan type above to preview the required documents.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={handleCloseAddModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Reject Document</h2>
              <p className="text-sm text-gray-500 mt-1">
                Provide a reason for rejecting {rejectModal.docType}
              </p>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Document is blurry, information doesn't match, expired document..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setRejectModal(null); setRejectionReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim() || isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                Reject{rejectModal.bulk ? ' All' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default DocumentsPage;
