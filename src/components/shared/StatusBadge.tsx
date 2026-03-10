interface StatusBadgeConfig {
  label: string;
  className: string;
}

type StatusBadgeVariant = 'default' | 'admin' | 'partner';

const adminStatusConfig: Record<string, StatusBadgeConfig> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
  under_review: { label: 'In Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  suspended: { label: 'Suspended', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  submitted: { label: 'Submitted', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  docs_pending: { label: 'Docs Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  docs_uploaded: { label: 'Docs Uploaded', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  docs_collected: { label: 'Docs Collected', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  bank_processing: { label: 'Bank Processing', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  bank_logged: { label: 'Bank Logged', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  disbursed: { label: 'Disbursed', className: 'bg-green-50 text-green-700 border-green-200' },
  verified: { label: 'Verified', className: 'bg-green-50 text-green-700 border-green-200' },
  uploaded: { label: 'Uploaded', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid: { label: 'Paid', className: 'bg-green-50 text-green-700 border-green-200' },
  processing: { label: 'Processing', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  active: { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 border-gray-300' },
};

const partnerStatusConfig: Record<string, StatusBadgeConfig> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  docs_pending: { label: 'Docs Pending', className: 'bg-amber-100 text-amber-700' },
  docs_uploaded: { label: 'Docs Uploaded', className: 'bg-cyan-100 text-cyan-700' },
  docs_collected: { label: 'Docs Collected', className: 'bg-indigo-100 text-indigo-700' },
  bank_processing: { label: 'Bank Processing', className: 'bg-purple-100 text-purple-700' },
  bank_logged: { label: 'Bank Logged', className: 'bg-violet-100 text-violet-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  disbursed: { label: 'Disbursed', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  new: { label: 'New', className: 'bg-slate-100 text-slate-700' },
  contacted: { label: 'Contacted', className: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Processing', className: 'bg-amber-100 text-amber-700' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-500' },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  uploaded: { label: 'Uploaded', className: 'bg-blue-100 text-blue-700' },
  verified: { label: 'Verified', className: 'bg-green-100 text-green-700' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
  open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-700' },
};

const variantDefaults: Record<StatusBadgeVariant, {
  config: Record<string, StatusBadgeConfig>;
  withBorder: boolean;
  defaultClassName: string;
}> = {
  default: {
    config: {},
    withBorder: false,
    defaultClassName: 'bg-slate-100 text-slate-600',
  },
  admin: {
    config: adminStatusConfig,
    withBorder: true,
    defaultClassName: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  partner: {
    config: partnerStatusConfig,
    withBorder: false,
    defaultClassName: 'bg-slate-100 text-slate-600',
  },
};

interface StatusBadgeProps<TStatus extends string> {
  status: TStatus;
  size?: 'sm' | 'md';
  variant?: StatusBadgeVariant;
  config?: Record<string, StatusBadgeConfig>;
  withBorder?: boolean;
  defaultClassName?: string;
  className?: string;
}

export default function StatusBadge<TStatus extends string>({
  status,
  size = 'md',
  variant = 'default',
  config,
  withBorder,
  defaultClassName,
  className = '',
}: StatusBadgeProps<TStatus>) {
  const variantConfig = variantDefaults[variant];
  const resolvedConfigMap = config ?? variantConfig.config;
  const resolvedWithBorder = withBorder ?? variantConfig.withBorder;
  const resolvedDefaultClassName = defaultClassName ?? variantConfig.defaultClassName;
  const fallbackLabel = status.replace(/_/g, ' ');
  const resolvedConfig = resolvedConfigMap[status] || { label: fallbackLabel, className: resolvedDefaultClassName };
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  // Extract the main color name (e.g. 'amber' from 'text-amber-700') to use for the dot
  const dotColorClass = resolvedConfig.className.match(/text-([a-z]+)-\d+/)?.[1] || 'slate';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${resolvedWithBorder ? 'border' : ''} ${resolvedConfig.className} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-${dotColorClass}-500 flex-shrink-0`} aria-hidden="true" />
      {resolvedConfig.label}
    </span>
  );
}

export type { StatusBadgeConfig, StatusBadgeProps, StatusBadgeVariant };
