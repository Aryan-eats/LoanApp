import { Info } from 'lucide-react';
import { useState } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children || <Info size={14} className="text-slate-500 hover:text-slate-300 transition-colors" />}
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-slate-900 border border-white/10 text-slate-200 text-xs px-3 py-2 rounded-lg max-w-xs whitespace-normal shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-white/10" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
