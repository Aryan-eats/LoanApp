import { useState, useCallback, useMemo } from 'react';
import AdminLayout from '../components/AdminLayout';
import {
  DocumentStatsCards,
  DocumentFilters,
  DocumentLeadCard,
  DocumentPreviewModal,
} from '../components/documents';
import { leads } from '../data/placeholderData';
import type { Lead, LeadDocument, DocumentStatus } from '../types/admin';
import { FileText, X, Plus } from 'lucide-react';
import {
  getProductsByCategory,
  type LoanCategory,
} from '../../data/loanProducts';
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

// Get leads that have documents
const leadsWithDocs = leads.filter((lead) => lead.documents && lead.documents.length > 0);

// Loan categories for the form
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

// Standard documents required for loans
const standardDocuments = [
  'PAN Card',
  'Aadhaar Card',
  'Bank Statement (6 months)',
  'Salary Slip / ITR',
  'Address Proof',
  'Photo',
];

const DocumentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [expandedLeads, setExpandedLeads] = useState<string[]>([leadsWithDocs[0]?.id || '']);
  const [selectedDoc, setSelectedDoc] = useState<{ doc: LeadDocument; lead: Lead } | null>(null);
  
  // Add Client Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addedClients, setAddedClients] = useState<Lead[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<LoanCategory | ''>('');
  const [formData, setFormData] = useState({
    customerName: '',
    loanType: '',
    loanAmount: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Memoized document stats
  const documentStats = useMemo(() => {
    const allLeads = [...leads, ...addedClients];
    const allDocuments = allLeads.flatMap((lead) => lead.documents);
    return {
      total: allDocuments.length,
      pending: allDocuments.filter((d) => d.status === 'pending').length,
      verified: allDocuments.filter((d) => d.status === 'verified').length,
      rejected: allDocuments.filter((d) => d.status === 'rejected').length,
    };
  }, [addedClients]);

  // Combine placeholder leads with added clients
  const allLeadsWithDocs = useMemo(() => {
    const addedWithDocs = addedClients.filter((lead) => lead.documents && lead.documents.length > 0);
    return [...addedWithDocs, ...leadsWithDocs];
  }, [addedClients]);

  // Memoized filtered leads
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
  }, [searchQuery, statusFilter]);

  // Handlers with useCallback
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

  const handleApprove = useCallback((docId: string, leadId: string) => {
    // Placeholder: Would call API to approve document
    console.log('Approving document:', docId, 'for lead:', leadId);
    setSelectedDoc(null);
  }, []);

  const handleReject = useCallback((docId: string, leadId: string) => {
    // Placeholder: Would call API to reject document
    console.log('Rejecting document:', docId, 'for lead:', leadId);
    setSelectedDoc(null);
  }, []);

  const handleNotifyPartner = useCallback((lead: Lead, doc: LeadDocument) => {
    // Placeholder: Would call API to send notification to partner
    console.log('Notifying partner for lead:', lead.id, 'document:', doc.type);
    alert(
      `Notification sent to partner "${lead.partnerName}" requesting ${doc.type} for ${lead.customerName}`
    );
  }, []);

  const handleSendUploadLink = useCallback((lead: Lead, doc: LeadDocument) => {
    // Placeholder: Would call API to send upload link to customer
    console.log('Sending upload link to customer:', lead.customerEmail, 'for document:', doc.type);
    alert(`Upload link sent to ${lead.customerEmail} for uploading ${doc.type}`);
  }, []);

  const handleViewDocument = useCallback((doc: LeadDocument, lead: Lead) => {
    setSelectedDoc({ doc, lead });
  }, []);

  // Add Client handlers
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
    
    // Create documents checklist for the new client
    const newDocuments: LeadDocument[] = standardDocuments.map((docType, index) => ({
      id: `${newClientId}-D${index + 1}`,
      type: docType,
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
      status: 'submitted',
      createdAt: today,
      updatedAt: today,
      timeline: [
        {
          id: 'T1',
          status: 'submitted',
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
    <AdminLayout onAddLead={handleOpenAddModal} addButtonLabel="Add Client">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Review and verify customer documents</p>
      </div>

      {/* Stats Cards */}
      <DocumentStatsCards stats={documentStats} />

      {/* Filters */}
      <DocumentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        expandedCount={expandedLeads.length}
        totalCount={filteredLeads.length}
        onToggleExpandAll={handleToggleExpandAll}
      />

      {/* Documents by Customer */}
      {filteredLeads.length > 0 ? (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <DocumentLeadCard
              key={lead.id}
              lead={lead}
              isExpanded={expandedLeads.includes(lead.id)}
              onToggleExpand={() => toggleExpand(lead.id)}
              onViewDocument={(doc) => handleViewDocument(doc, lead)}
              onApprove={(docId) => handleApprove(docId, lead.id)}
              onReject={(docId) => handleReject(docId, lead.id)}
              onNotifyPartner={(doc) => handleNotifyPartner(lead, doc)}
              onSendUploadLink={(doc) => handleSendUploadLink(lead, doc)}
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

      {/* Document Preview Modal */}
      {selectedDoc && (
        <DocumentPreviewModal
          selectedDoc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onApprove={() => handleApprove(selectedDoc.doc.id, selectedDoc.lead.id)}
          onReject={() => handleReject(selectedDoc.doc.id, selectedDoc.lead.id)}
          onNotifyPartner={() => handleNotifyPartner(selectedDoc.lead, selectedDoc.doc)}
          onSendUploadLink={() => handleSendUploadLink(selectedDoc.lead, selectedDoc.doc)}
        />
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Client Name */}
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

              {/* Loan Category */}
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

              {/* Loan Type (Sub-type) */}
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

              {/* Loan Amount */}
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

              {/* Documents Preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Documents Checklist</p>
                <p className="text-xs text-gray-500 mb-2">
                  The following documents will be created as pending for this client:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {standardDocuments.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-xs text-gray-600 bg-white px-2 py-1.5 rounded border border-gray-200"
                    >
                      <FileText className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
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
    </AdminLayout>
  );
};

export default DocumentsPage;
