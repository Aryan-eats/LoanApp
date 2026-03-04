import type { ReactNode } from 'react';
import SharedStatsCard from '../../components/shared/StatsCard';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: StatsCardProps) {
  return (
    <SharedStatsCard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      trend={trend}
      variant={variant}
    />
  );
}
