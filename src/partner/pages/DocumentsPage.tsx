import { useState } from 'react';
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
} from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import { recentLeads } from '../data/placeholderData';
import type { DocumentStatus, LoanType } from '../types/partner-dashboard';

const loanTypeLabels: Record<LoanType, string> = {
  home_loan: 'Home Loan',
  personal_loan: 'Personal Loan',
  business_loan: 'Business Loan',
  car_loan: 'Car Loan',
  lap: 'Loan Against Property',
  education_loan: 'Education Loan',
};

const documentStatusConfig: Record<DocumentStatus, { icon: React.ReactNode; color: string; bg: string }> = {
  pending: { icon: <Clock size={14} />, color: 'text-slate-500', bg: 'bg-slate-100' },
  uploaded: { icon: <FileText size={14} />, color: 'text-blue-600', bg: 'bg-blue-100' },
  verified: { icon: <CheckCircle size={14} />, color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { icon: <XCircle size={14} />, color: 'text-red-600', bg: 'bg-red-100' },
};

// Get leads that have documents
const leadsWithDocs = recentLeads.filter((lead) => lead.documents && lead.documents.length > 0);

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLeads, setExpandedLeads] = useState<string[]>([leadsWithDocs[0]?.id || '']);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const filteredLeads = leadsWithDocs.filter(
    (lead) =>
      lead.client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (leadId: string) => {
    setExpandedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const calculateCompletionRate = (documents: typeof recentLeads[0]['documents']) => {
    const completed = documents.filter((d) => d.status === 'verified' || d.status === 'uploaded').length;
    return Math.round((completed / documents.length) * 100);
  };

  const handleFileUpload = async (docId: string) => {
    if (!selectedFile) return;
    
    setUploadingDoc(docId);
    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setUploadingDoc(null);
    setSelectedFile(null);
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pan_card: 'PAN Card',
      aadhaar_front: 'Aadhaar (Front)',
      aadhaar_back: 'Aadhaar (Back)',
      photo: 'Passport Photo',
      salary_slip_1: 'Salary Slip (Latest)',
      salary_slip_2: 'Salary Slip (2nd Month)',
      salary_slip_3: 'Salary Slip (3rd Month)',
      bank_statement: 'Bank Statement (6 months)',
      itr_1: 'ITR (Latest Year)',
      itr_2: 'ITR (Previous Year)',
      form_16: 'Form 16',
      address_proof: 'Address Proof',
      property_documents: 'Property Documents',
      business_proof: 'Business Proof',
      gst_certificate: 'GST Certificate',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-500 mt-1">Manage and upload documents for your leads</p>
        </div>
      </div>

      {/* Info Banner */}
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

      {/* Document Lists by Lead */}
      {filteredLeads.length > 0 ? (
        <div className="space-y-4">
          {filteredLeads.map((lead) => {
            const isExpanded = expandedLeads.includes(lead.id);
            const completionRate = calculateCompletionRate(lead.documents);
            const pendingCount = lead.documents.filter((d) => d.status === 'pending').length;
            const rejectedCount = lead.documents.filter((d) => d.status === 'rejected').length;

            return (
              <div
                key={lead.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                {/* Lead Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(lead.id)}
                >
                  <div className="flex items-center gap-4">
                    <button className="p-1">
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={20} className="text-slate-400" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{lead.client.fullName}</h3>
                        <span className="text-xs text-slate-400 font-mono">{lead.id}</span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {loanTypeLabels[lead.loanType]} • {lead.status === 'docs_pending' ? 'Documents Required' : 'Documents Submitted'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Status Indicators */}
                    <div className="hidden md:flex items-center gap-4">
                      {pendingCount > 0 && (
                        <span className="flex items-center gap-1.5 text-sm text-amber-600">
                          <Clock size={14} />
                          {pendingCount} pending
                        </span>
                      )}
                      {rejectedCount > 0 && (
                        <span className="flex items-center gap-1.5 text-sm text-red-600">
                          <XCircle size={14} />
                          {rejectedCount} rejected
                        </span>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="w-32">
                      <ProgressBar
                        value={completionRate}
                        showPercentage={false}
                        size="sm"
                        variant={completionRate === 100 ? 'success' : completionRate >= 50 ? 'default' : 'warning'}
                      />
                      <p className="text-xs text-slate-500 text-center mt-1">{completionRate}% complete</p>
                    </div>
                  </div>
                </div>

                {/* Documents List */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <div className="p-4 bg-slate-50">
                      <div className="grid grid-cols-1 gap-3">
                        {lead.documents.map((doc) => {
                          const statusConfig = documentStatusConfig[doc.status];

                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                                  <FileText size={20} className={statusConfig.color} />
                                </div>
                                <div>
                                  <h4 className="font-medium text-slate-800">
                                    {getDocTypeLabel(doc.type)}
                                  </h4>
                                  {doc.fileName ? (
                                    <p className="text-xs text-slate-500">
                                      {doc.fileName} • {doc.fileSize}
                                      {doc.uploadedAt && ` • Uploaded ${doc.uploadedAt}`}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-400">Not uploaded</p>
                                  )}
                                  {doc.rejectionReason && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                      <Info size={12} />
                                      {doc.rejectionReason}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Status Badge */}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg}`}>
                                  {statusConfig.icon}
                                  <span className={`text-xs font-medium capitalize ${statusConfig.color}`}>
                                    {doc.status}
                                  </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                  {doc.status === 'pending' || doc.status === 'rejected' ? (
                                    <label className="relative">
                                      <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setSelectedFile(file);
                                            handleFileUpload(doc.id);
                                          }
                                        }}
                                        className="hidden"
                                      />
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                                        {uploadingDoc === doc.id ? (
                                          <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Uploading...
                                          </>
                                        ) : (
                                          <>
                                            <Upload size={14} />
                                            Upload
                                          </>
                                        )}
                                      </span>
                                    </label>
                                  ) : (
                                    <>
                                      <button
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View document"
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Download"
                                      >
                                        <Download size={16} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Actions */}
                      {lead.documents.some((d) => d.status === 'pending') && (
                        <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <Info size={16} className="text-blue-600" />
                            <span className="text-sm text-blue-800">
                              {lead.documents.filter((d) => d.status === 'pending').length} document(s) pending upload
                            </span>
                          </div>
                          <label className="relative">
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                            />
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                              <Upload size={16} />
                              Upload All
                            </span>
                          </label>
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
            description={
              searchQuery
                ? "No leads match your search. Try a different search term."
                : "You don't have any leads with pending documents."
            }
            action={{
              label: 'Add New Lead',
              onClick: () => {},
            }}
          />
        </div>
      )}

      {/* Document Requirements Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Document Requirements by Loan Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              type: 'Personal Loan',
              docs: ['PAN Card', 'Aadhaar', 'Salary Slips (3 months)', 'Bank Statement', 'Photo'],
            },
            {
              type: 'Home Loan',
              docs: ['PAN Card', 'Aadhaar', 'Income Proof', 'Property Documents', 'Bank Statement'],
            },
            {
              type: 'Business Loan',
              docs: ['PAN Card', 'GST Certificate', 'ITR (2 years)', 'Bank Statement (12 months)', 'Business Proof'],
            },
          ].map((item, index) => (
            <div key={index} className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-800 mb-2">{item.type}</h4>
              <ul className="space-y-1">
                {item.docs.map((doc, idx) => (
                  <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                    <CheckCircle size={12} className="text-green-500" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
