import StatusBadge from '../StatusBadge';
import type { Lead, LeadDocument } from '../../types/admin';
import { X, Download, Printer, Bell, Share2, CheckCircle, XCircle } from 'lucide-react';

interface DocumentPreviewModalProps {
  selectedDoc: { doc: LeadDocument; lead: Lead };
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNotifyPartner: () => void;
  onSendUploadLink: () => void;
}

const isPartnerUpload = (uploadedBy: string) => {
  return uploadedBy.toLowerCase().includes('partner');
};

export default function DocumentPreviewModal({
  selectedDoc,
  onClose,
  onApprove,
  onReject,
  onNotifyPartner,
  onSendUploadLink,
}: DocumentPreviewModalProps) {
  const { doc, lead } = selectedDoc;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{doc.type}</h2>
            <p className="text-sm text-gray-500">{doc.fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={doc.status} />
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Preview */}
        <div
          className="bg-gray-100 p-8 flex items-center justify-center"
          style={{ minHeight: '400px' }}
        >
          {doc.fileName.endsWith('.pdf') ? (
            <div className="text-center">
              <svg
                className="w-24 h-24 text-red-400 mx-auto"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 18H7v-2h6v2zm0-4H7v-2h6v2zm0-4H7v-2h6v2zm3-3.17l-.29-.3L13 5.83V9h2.83z" />
              </svg>
              <p className="text-gray-500 mt-4">PDF Preview</p>
              <p className="text-sm text-gray-400">File: {doc.fileName}</p>
            </div>
          ) : (
            <div className="text-center">
              <svg
                className="w-24 h-24 text-blue-400 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-500 mt-4">Image Preview</p>
              <p className="text-sm text-gray-400">File: {doc.fileName}</p>
            </div>
          )}
        </div>

        {/* Document Details */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Customer</p>
              <p className="font-medium text-gray-900">{lead.customerName}</p>
            </div>
            <div>
              <p className="text-gray-500">Lead ID</p>
              <p className="font-medium text-gray-900">{lead.id}</p>
            </div>
            <div>
              <p className="text-gray-500">Uploaded By</p>
              <p className="font-medium text-gray-900">{doc.uploadedBy}</p>
            </div>
            <div>
              <p className="text-gray-500">Upload Date</p>
              <p className="font-medium text-gray-900">{doc.uploadedAt}</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-200">
              <Download className="w-[18px] h-[18px]" />
              Download
            </button>
            <button className="inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-200">
              <Printer className="w-[18px] h-[18px]" />
              Print
            </button>
          </div>

          {doc.status === 'pending' && (
            <div className="flex items-center gap-3">
              {isPartnerUpload(doc.uploadedBy) ? (
                <button
                  onClick={onNotifyPartner}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 hover:border-indigo-300 shadow-sm transition-all duration-200"
                >
                  <Bell className="w-[18px] h-[18px]" />
                  Notify Partner
                </button>
              ) : (
                <button
                  onClick={onSendUploadLink}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 hover:border-violet-300 shadow-sm transition-all duration-200"
                >
                  <Share2 className="w-[18px] h-[18px]" />
                  Send Upload Link
                </button>
              )}
              <button
                onClick={onReject}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 hover:border-rose-300 shadow-sm transition-all duration-200"
              >
                <XCircle className="w-[18px] h-[18px]" />
                Reject
              </button>
              <button
                onClick={onApprove}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-200 transition-all duration-200"
              >
                <CheckCircle className="w-[18px] h-[18px]" />
                Verify Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { DocumentPreviewModalProps };
