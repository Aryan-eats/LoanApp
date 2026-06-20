import AdminLayout from '../components/AdminLayout';
import {
  DocumentStatsCards,
  DocumentFilters,
  DocumentLeadCard,
  DocumentPreviewModal,
} from '../components/documents';
import {
  FileText,
  X,
  Plus,
  Loader2,
  Link2,
  Copy,
  Check,
  Clock,
  CreditCard,
  BriefcaseBusiness,
  Home,
  Landmark,
  Car,
  Stars,
  GraduationCap,
  Sprout,
  Flag,
  ShoppingCart,
  Zap,
  Construction,
} from 'lucide-react';
import {
  getProductsByCategory,
} from '../../data/loanProductsData';
import { useDocumentsPage } from '../hooks/useDocumentsPage';
import type { LoanCategory } from '../../data/loanProductsData';

const loanCategories: { value: LoanCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'personal', label: 'Personal', icon: <CreditCard size={16} /> },
  { value: 'business', label: 'Business', icon: <BriefcaseBusiness size={16} /> },
  { value: 'home', label: 'Home', icon: <Home size={16} /> },
  { value: 'property', label: 'Property', icon: <Landmark size={16} /> },
  { value: 'vehicle', label: 'Vehicle', icon: <Car size={16} /> },
  { value: 'gold_securities', label: 'Gold & Securities', icon: <Stars size={16} /> },
  { value: 'education', label: 'Education', icon: <GraduationCap size={16} /> },
  { value: 'agriculture', label: 'Agriculture', icon: <Sprout size={16} /> },
  { value: 'government', label: 'Govt. Schemes', icon: <Flag size={16} /> },
  { value: 'corporate', label: 'Corporate', icon: <Landmark size={16} /> },
  { value: 'consumer', label: 'Consumer', icon: <ShoppingCart size={16} /> },
  { value: 'short_term', label: 'Short-Term', icon: <Zap size={16} /> },
  { value: 'real_estate', label: 'Real Estate', icon: <Construction size={16} /> },
  { value: 'specialized', label: 'Specialized', icon: <Zap size={16} /> },
];

const DocumentsPage: React.FC = () => {
  const {
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
  } = useDocumentsPage();

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

      {/* Upload Link Modal */}
      {uploadLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-purple-600" />
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
                        : 'bg-purple-600 text-white hover:bg-purple-700'
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
                  {' '}and can only be used once.
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
                    {docsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-gray-400 py-4">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading document requirements...
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 mb-2">
                          {previewDocs.length} document(s) will be
                          created as pending for this client:
                        </p>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {previewDocs.map((req, index) => (
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
                    )}
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
