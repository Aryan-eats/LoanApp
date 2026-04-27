import { Link } from 'react-router-dom';
import { Calculator, PercentSquare, Building2, ClipboardCheck, ArrowRight } from 'lucide-react';
import { usePartnerTheme } from './PartnerThemeProvider';

export default function QuickToolsPanel() {
  const { isDark } = usePartnerTheme();
  const tools = [
    {
      title: 'EMI Calculator',
      description: 'Quickly calculate monthly EMIs',
      icon: <Calculator size={22} />,
      to: '#', // '/partner/tools/emi' if route exists
      color: 'bg-indigo-500/10 text-indigo-400',
      hover: 'hover:border-indigo-500/30'
    },
    {
      title: 'Balance Transfer',
      description: 'Calculate BT savings',
      icon: <PercentSquare size={22} />,
      to: '#',
      color: 'bg-emerald-500/10 text-emerald-400',
      hover: 'hover:border-emerald-500/30'
    },
    {
      title: 'Lender Comparison',
      description: 'Compare bank offers',
      icon: <Building2 size={22} />,
      to: '/partner/bank-offers',
      color: 'bg-amber-500/10 text-amber-400',
      hover: 'hover:border-amber-500/30'
    },
    {
      title: 'Eligibility Check',
      description: 'Run basic eligibility',
      icon: <ClipboardCheck size={22} />,
      to: '/partner/credit-check',
      color: 'bg-purple-500/10 text-purple-400',
      hover: 'hover:border-purple-500/30'
    }
  ];

  return (
    <div
      className={`backdrop-blur-sm rounded-xl p-5 transition-colors ${
        isDark
          ? 'bg-slate-900/50 border border-white/10'
          : 'bg-white/90 border border-slate-200 shadow-[0_18px_45px_rgba(148,163,184,0.12)]'
      }`}
    >
      <div className="mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Quick Tools</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fast access to calculators and checks</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map((tool, index) => (
          <Link
            key={index}
            to={tool.to}
            className={`group p-4 lg:p-5 rounded-xl border flex items-start sm:items-center gap-4 transition-all min-h-[48px] ${
              isDark
                ? `border-white/5 bg-white/5 hover:bg-white/10 ${tool.hover}`
                : `border-slate-200 bg-slate-50 hover:bg-white ${tool.hover}`
            }`}
          >
            <div className={`w-12 h-12 ${tool.color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
              {tool.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium flex items-center gap-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {tool.title}
                <ArrowRight size={14} className={`opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              </h4>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
