import React from 'react';
import type { ApplicationStatus, LeadStatus, DocumentStatus, CommissionStatus } from '../types/admin';

type StatusType = ApplicationStatus | LeadStatus | DocumentStatus | CommissionStatus | 'active' | 'inactive' | 'uploaded' | 'processing';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  // Application Status
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  under_review: { label: 'Under Review', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  suspended: { label: 'Suspended', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  
  // Lead Status
  submitted: { label: 'Submitted', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  docs_collected: { label: 'Docs Collected', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  bank_logged: { label: 'Bank Logged', className: 'bg-purple-50 text-purple-700 border-purple-200' },
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

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-300' };
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${config.className} ${sizeClasses}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
