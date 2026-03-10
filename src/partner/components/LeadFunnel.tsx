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
  const maxValue = Math.max(...Object.values(data));

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Lead Funnel</h3>
          <p className="text-sm text-slate-400">Lead progression overview</p>
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
                <span className="text-sm font-medium text-slate-300">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{value}</span>
                  {index > 0 && (
                    <span className="text-xs text-slate-500">({conversionRate}%)</span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-white/5 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${stage.color} rounded-lg transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
                {/* Funnel taper effect */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, transparent ${percentage * 0.95}%, rgba(255,255,255,0.3) ${percentage}%)`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Overall Conversion Rate</span>
          <span className="font-semibold text-emerald-400">
            {data.totalLeads > 0 ? ((data.disbursed / data.totalLeads) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}
