import SharedStatsCard from '../../components/shared/StatsCard';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  color?: 'default' | 'blue' | 'green' | 'amber' | 'red';
}

const StatsCard = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'default',
}: StatsCardProps) => {
  return (
    <SharedStatsCard
      title={title}
      value={value}
      subtitle={subtitle}
      trend={trend ? { value: trend.value, isPositive: trend.isPositive } : undefined}
      icon={icon}
      variant={color}
    />
  );
};

export default StatsCard;
