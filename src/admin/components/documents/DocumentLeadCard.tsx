import StatusBadge from '../StatusBadge';
import type { Lead, LeadDocument } from '../../types/admin';
import { getLoanTypeLabel } from '@/data/loanProducts';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  XCircle,
  CheckCircle,
  Eye,
  Download,
  Bell,
  Share2,
  FileText,
} from 'lucide-react';

interface DocumentLeadCardProps {
  lead: Lead;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewDocument: (doc: LeadDocument) => void;
  onApprove: (docId: string) => void;
  onReject: (docId: string) => void;
  onNotifyPartner: (doc: LeadDocument) => void;
  onSendUploadLink: (doc: LeadDocument) => void;
}

const isPartnerUpload = (uploadedBy: string) => {
  return uploadedBy.toLowerCase().includes('partner');
};

const calculateCompletionRate = (documents: LeadDocument[]) => {
  if (documents.length === 0) return 0;
  const verified = documents.filter((d) => d.status === 'verified').length;
  return Math.round((verified / documents.length) * 100);
};

export default function DocumentLeadCard({
  lead,
  isExpanded,
  onToggleExpand,
  onViewDocument,
  onApprove,
  onReject,
  onNotifyPartner,
  onSendUploadLink,
}: DocumentLeadCardProps) {
  const completionRate = calculateCompletionRate(lead.documents);
  const pendingCount = lead.documents.filter((d) => d.status === 'pending').length;
  const rejectedCount = lead.documents.filter((d) => d.status === 'rejected').length;
  const verifiedCount = lead.documents.filter((d) => d.status === 'verified').length;

  const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'bg-yellow-100' },
    uploaded: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100' },
    verified: { bg: 'bg-green-50', text: 'text-green-600', icon: 'bg-green-100' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100' },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Customer Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          <button className="p-1">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-600">
              {lead.customerName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{lead.customerName}</h3>
              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                {lead.id}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {getLoanTypeLabel(lead.loanType)} • ₹{(lead.loanAmount / 100000).toFixed(1)}L •
              Partner: {lead.partnerName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Indicators */}
          <div className="hidden md:flex items-center gap-4">
            {pendingCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-yellow-600">
                <Clock className="w-4 h-4" />
                {pendingCount} pending
              </span>
            )}
            {rejectedCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <XCircle className="w-4 h-4" />
                {rejectedCount} rejected
              </span>
            )}
            {verifiedCount > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                {verifiedCount} verified
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="w-32">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  completionRate === 100
                    ? 'bg-green-500'
                    : completionRate >= 50
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
                }`}
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center mt-1">{completionRate}% verified</p>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="p-4 bg-gray-50">
            <div className="grid grid-cols-1 gap-3">
              {lead.documents.map((doc) => {
                const colors = statusColors[doc.status];

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${colors.icon}`}>
                        <FileText className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{doc.type}</h4>
                        <p className="text-xs text-gray-500">
                          {doc.fileName} • Uploaded by {doc.uploadedBy} • {doc.uploadedAt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      <StatusBadge status={doc.status} size="sm" />

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDocument(doc);
                          }}
                          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm"
                          title="View document"
                        >
                          <Eye className="w-[18px] h-[18px]" />
                        </button>
                        <button
                          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-sm"
                          title="Download"
                        >
                          <Download className="w-[18px] h-[18px]" />
                        </button>
                        {doc.status === 'pending' && (
                          <>
                            {isPartnerUpload(doc.uploadedBy) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNotifyPartner(doc);
                                }}
                                className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                                title="Notify Partner"
                              >
                                <Bell className="w-[18px] h-[18px]" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSendUploadLink(doc);
                                }}
                                className="p-2 text-violet-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                                title="Send Upload Link to Customer"
                              >
                                <Share2 className="w-[18px] h-[18px]" />
                              </button>
                            )}
                            <div className="w-px h-5 bg-gray-200 mx-0.5" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onApprove(doc.id);
                              }}
                              className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                              title="Verify"
                            >
                              <CheckCircle className="w-[18px] h-[18px]" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReject(doc.id);
                              }}
                              className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 hover:shadow-sm"
                              title="Reject"
                            >
                              <XCircle className="w-[18px] h-[18px]" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bulk Actions for Pending Documents */}
            {lead.documents.some((d) => d.status === 'pending') && (
              <div className="mt-4 flex flex-col gap-3">
                {/* Partner notification banner */}
                {lead.documents.some(
                  (d) => d.status === 'pending' && isPartnerUpload(d.uploadedBy)
                ) && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        {
                          lead.documents.filter(
                            (d) => d.status === 'pending' && isPartnerUpload(d.uploadedBy)
                          ).length
                        }{' '}
                        document(s) pending from partner
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        lead.documents
                          .filter((d) => d.status === 'pending' && isPartnerUpload(d.uploadedBy))
                          .forEach((d) => onNotifyPartner(d));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Bell className="w-4 h-4" />
                      Notify Partner
                    </button>
                  </div>
                )}

                {/* Customer upload link banner */}
                {lead.documents.some(
                  (d) => d.status === 'pending' && !isPartnerUpload(d.uploadedBy)
                ) && (
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-800">
                        {
                          lead.documents.filter(
                            (d) => d.status === 'pending' && !isPartnerUpload(d.uploadedBy)
                          ).length
                        }{' '}
                        document(s) pending from customer
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const doc = lead.documents.find(
                          (d) => d.status === 'pending' && !isPartnerUpload(d.uploadedBy)
                        );
                        if (doc) onSendUploadLink(doc);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Send Upload Link
                    </button>
                  </div>
                )}

                {/* Verification actions */}
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      {lead.documents.filter((d) => d.status === 'pending').length} document(s)
                      pending verification
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      Reject All
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                      Verify All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { DocumentLeadCardProps };
