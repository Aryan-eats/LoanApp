import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean; // For backward compatibility with admin version
  };
  variant?: 'default' | 'success' | 'warning' | 'info' | 'blue' | 'green' | 'amber' | 'red';
  className?: string;
}

const variantStyles = {
  default: { iconBg: 'bg-slate-100', iconColor: 'text-slate-600' },
  success: { iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  green: { iconBg: 'bg-green-100', iconColor: 'text-green-600' },
  warning: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  amber: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  info: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  blue: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  red: { iconBg: 'bg-red-100', iconColor: 'text-red-600' },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  className = '',
}: StatsCardProps) {
  const styles = variantStyles[variant];
  
  // Determine trend direction - support both explicit isPositive and inferred from value
  const trendValue = trend?.value ?? 0;
  const isPositive = trend?.isPositive !== undefined ? trend.isPositive : trendValue > 0;
  const isNegative = trend?.isPositive !== undefined ? !trend.isPositive : trendValue < 0;

  const getTrendIcon = () => {
    if (!trend) return null;
    if (isPositive) return <TrendingUp size={14} className="text-green-500" />;
    if (isNegative) return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-slate-400" />;
  };

  const getTrendColor = () => {
    if (isPositive) return 'text-green-600';
    if (isNegative) return 'text-red-600';
    return 'text-slate-500';
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon()}
              <span className={`text-xs font-medium ${getTrendColor()}`}>
                {trendValue > 0 ? '+' : ''}{trendValue}%
              </span>
              {trend.label && <span className="text-xs text-slate-400">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={`${styles.iconBg} ${styles.iconColor} p-3 rounded-xl`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export for convenience
export type { StatsCardProps };
