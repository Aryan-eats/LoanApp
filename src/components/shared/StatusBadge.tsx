interface StatusBadgeConfig {
  label: string;
  className: string;
}

interface StatusBadgeProps<TStatus extends string> {
  status: TStatus;
  size?: 'sm' | 'md';
  config: Record<string, StatusBadgeConfig>;
  withBorder?: boolean;
  defaultClassName?: string;
  className?: string;
}

export default function StatusBadge<TStatus extends string>({
  status,
  size = 'md',
  config,
  withBorder = false,
  defaultClassName = 'bg-slate-100 text-slate-600',
  className = '',
}: StatusBadgeProps<TStatus>) {
  const fallbackLabel = status.replace(/_/g, ' ');
  const resolvedConfig = config[status] || { label: fallbackLabel, className: defaultClassName };
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${withBorder ? 'border' : ''} ${resolvedConfig.className} ${sizeClasses} ${className}`}
    >
      {resolvedConfig.label}
    </span>
  );
}

export type { StatusBadgeConfig, StatusBadgeProps };
