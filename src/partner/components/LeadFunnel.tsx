import { usePartnerTheme } from './PartnerThemeProvider';

interface LeadFunnelProps {
  data: {
    totalLeads: number;
    submitted: number;
    approved: number;
    disbursed: number;
  };
}

const funnelStages = [
  { key: 'totalLeads', label: 'Lead Received', color: 'bg-slate-700' },
  { key: 'submitted', label: 'Submitted to Bank', color: 'bg-indigo-500' },
  { key: 'approved', label: 'Approved', color: 'bg-emerald-500' },
  { key: 'disbursed', label: 'Disbursed', color: 'bg-green-500' },
];

export default function LeadFunnel({ data }: LeadFunnelProps) {
  const { isDark } = usePartnerTheme();
  const maxValue = Math.max(...Object.values(data));

  return (
    <div
      className={`backdrop-blur-sm rounded-xl p-5 transition-colors ${
        isDark
          ? 'bg-slate-900/50 border border-white/10'
          : 'bg-white/90 border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Lead Funnel</h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lead progression overview</p>
        </div>
      </div>

      <div className="space-y-4">
        {funnelStages.map((stage, index) => {
          const value = data[stage.key as keyof typeof data];
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const conversionRate = index > 0
            ? ((value / data[funnelStages[index - 1].key as keyof typeof data]) * 100).toFixed(0)
            : '100';

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</span>
                  {index > 0 && (
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>({conversionRate}%)</span>
                  )}
                </div>
              </div>
              <div className={`h-8 rounded-lg overflow-hidden relative ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <div
                  className={`h-full ${stage.color} rounded-lg transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, transparent ${percentage * 0.95}%, rgba(255,255,255,0.3) ${percentage}%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mt-6 pt-4 ${isDark ? 'border-t border-white/10' : 'border-t border-slate-100'}`}>
        <div className="flex items-center justify-between text-sm">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Overall Conversion Rate</span>
          <span className="font-semibold text-emerald-400">
            {data.totalLeads > 0 ? ((data.disbursed / data.totalLeads) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}
