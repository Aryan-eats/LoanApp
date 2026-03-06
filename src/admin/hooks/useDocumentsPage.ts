import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lead, LeadDocument, DocumentStatus } from '../types/admin';
import type { LoanCategory } from '../../data/loanProductsData';
import {
  uploadLeadDocument,
  getDocumentDownloadUrl,
  deleteLeadDocument,
  updateDocumentStatus,
  bulkUpdateDocumentStatus,
  generateUploadToken,
} from '../../api/documentsApi';
import { getLeads } from '../../api/leadsApi';
import { useDocRequirements } from './useDocRequirements';
import { mapApiLead, DOC_RELEVANT_STATUSES } from '../utils/documentsHelpers';

export function useDocumentsPage() {
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
  const [uploadLinkModal, setUploadLinkModal] = useState<{
    url: string;
    docType: string;
    customerName: string;
    customerEmail: string;
    expiresAt: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // -- Doc requirements (API-backed, with static fallback) -------------------
  const {
    docs: previewDocs,
    isLoading: docsLoading,
    getDocsForLoanCode,
  } = useDocRequirements(formData.loanType);

  // -- API fetch -------------------------------------------------------------
  const fetchDocLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getLeads({}, true); // isAdmin = true
      if (response.success && response.data) {
    
        const mapped: Lead[] = (response.data.leads as Parameters<typeof mapApiLead>[0][])
          .map(mapApiLead)
          .filter(
            (l: Lead) =>
              DOC_RELEVANT_STATUSES.includes(l.status) || l.documents.length > 0
          );
        setApiLeads(mapped);
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

  const handleSendUploadLink = useCallback(async (_lead: Lead, doc: LeadDocument) => {
    try {
      const response = await generateUploadToken(doc.id);
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

        setAddedClients((prev) => prev.map(patchLead));
        setApiLeads((prev) => prev.map(patchLead));

        alert(`"${file.name}" uploaded successfully for ${updatedDoc.type || 'document'}`);
      } else {
        alert(`Error: ${response.message || 'Upload failed'}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed. Please try again.';
      alert(`Error: ${message}`);
    } finally {
      setUploadingDocId(null);
    }
  }, []);

  const handleDownloadFile = useCallback(async (docId: string) => {
    try {
      const response = await getDocumentDownloadUrl(docId);
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        alert(response.message || 'Could not generate download link');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Download failed';
      alert(`Error: ${message}`);
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
        alert('Document deleted successfully');
      } else {
        alert(`Error: ${response.message || 'Delete failed'}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      alert(`Error: ${message}`);
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

  const handleAddClient = useCallback(async () => {
    if (!validateForm()) return;

    const newClientId = `NEW-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    const requiredDocs = await getDocsForLoanCode(formData.loanType);
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
  }, [formData, validateForm, handleCloseAddModal, getDocsForLoanCode]);

  return {
    navigate,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    expandedLeads,
    selectedDoc,
    setSelectedDoc,
    showAddModal,
    selectedCategory,
    formData,
    setFormData,
    formErrors,
    uploadingDocId,
    rejectModal,
    setRejectModal,
    rejectionReason,
    setRejectionReason,
    isProcessing,
    uploadLinkModal,
    setUploadLinkModal,
    linkCopied,
    setLinkCopied,
    documentStats,
    filteredLeads,
    toggleExpand,
    handleToggleExpandAll,
    handleApprove,
    handleRejectRequest,
    handleRejectConfirm,
    handleBulkVerify,
    handleBulkRejectRequest,
    handleNotifyPartner,
    handleSendUploadLink,
    handleViewDocument,
    handleUploadFile,
    handleDownloadFile,
    handleDeleteDocument,
    handleOpenAddModal,
    handleCloseAddModal,
    handleCategoryChange,
    handleAddClient,
    previewDocs,
    docsLoading,
  };
}
