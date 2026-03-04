import type { ApplicationStatus, LeadStatus, DocumentStatus, CommissionStatus } from '../types/admin';
import SharedStatusBadge from '../../components/shared/StatusBadge';
import type { StatusBadgeConfig } from '../../components/shared/StatusBadge';

type StatusType = ApplicationStatus | LeadStatus | DocumentStatus | CommissionStatus | 'active' | 'inactive' | 'uploaded' | 'processing' | 'draft';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, StatusBadgeConfig> = {
  // Application Status
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  under_review: { label: 'Under Review', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  suspended: { label: 'Suspended', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  
  // Lead Status (backend-compatible values)
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  submitted: { label: 'Submitted', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  docs_pending: { label: 'Docs Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  docs_uploaded: { label: 'Docs Uploaded', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  bank_processing: { label: 'Bank Processing', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  disbursed: { label: 'Disbursed', className: 'bg-green-50 text-green-700 border-green-200' },

  
  // Document Status
  verified: { label: 'Verified', className: 'bg-green-50 text-green-700 border-green-200' },
  uploaded: { label: 'Uploaded', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  
  // Commission Status
  paid: { label: 'Paid', className: 'bg-green-50 text-green-700 border-green-200' },
  processing: { label: 'Processing', className: 'bg-blue-50 text-blue-700 border-blue-200' },

  // General Status
  active: { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 border-gray-300' },
};

const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
  return (
    <SharedStatusBadge
      status={status}
      size={size}
      config={statusConfig}
      withBorder
      defaultClassName="bg-gray-100 text-gray-700 border-gray-300"
    />
  );
};

export default StatusBadge;
