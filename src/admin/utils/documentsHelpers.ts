import type { Lead, DocumentStatus, LeadStatus } from '../types/admin';
import type { ApiLeadResponse, ApiTimelineEvent, ApiLeadDocument } from '../types/apiResponses';

/** Map an API lead response to the admin Lead type */
export const mapApiLead = (apiLead: ApiLeadResponse): Lead => ({
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
  bankCode: apiLead.bankCode,
  preferredBank: apiLead.preferredBank,
  createdAt: apiLead.createdAt,
  updatedAt: apiLead.updatedAt,
  timeline: (apiLead.timeline || []).map((e: ApiTimelineEvent) => ({
    id: e.id,
    status: e.status,
    timestamp: e.timestamp,
    updatedBy: e.updatedBy,
    note: e.note,
  })),
  documents: (apiLead.documents || []).map((d: ApiLeadDocument) => ({
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
export const DOC_RELEVANT_STATUSES: LeadStatus[] = ['docs_pending', 'docs_uploaded', 'bank_processing'];
