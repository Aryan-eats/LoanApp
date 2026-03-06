import React from 'react';
import PageTransition from '../components/shared/PageTransition';
import { serviceCategories } from '../data/loanCategories';
import ApplyButton from '../components/ApplyButton';
import { CheckCircle2 } from 'lucide-react';

const Services: React.FC = () => {
  return (
    <PageTransition className="bg-[#F8FAFC] min-h-screen pb-24">
      {/* Premium Header Segment */}
      <div className="bg-linear-to-r from-black to-gray-800 pt-28 pb-20 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Credit that Scales <br className="hidden md:block" />
            <span className="text-gray-300 font-serif italic font-medium tracking-normal">With Your Ambition</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Compare various loan products from India's top banks and NBFCs. Unbiased guidance, transparent rates, and zero hidden charges.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceCategories.map((category, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 border border-gray-100 flex flex-col group overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-linear-to-b from-gray-50/50 to-white">
                <h2 className="text-2xl font-bold text-[#0A2540] mb-2">{category.title}</h2>
                {category.description && (
                  <p className="text-emerald-700 font-medium text-sm bg-emerald-50 inline-block px-3 py-1 rounded-full">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="p-6 grow">
                <ul className="space-y-3">
                  {category.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ApplyButton category={category.title} />
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default Services;
