import React from 'react';
import { motion } from 'framer-motion';
import PrefetchLink from './shared/PrefetchLink';
import { preloadApply, preloadServices } from '../utils/routePreloaders';
import OptimizedImage from './shared/OptimizedImage';
import { Check, ArrowRight } from 'lucide-react';

const loanProducts = [
  {
    category: 'Home Loan',
    title: 'Home Loans',
    description: 'Purchase your dream home or construct a new house.',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    rate: '8.50%',
    amount: '₹5 Cr',
    features: ['Up to 30 years tenure', 'Zero prepayment charges', 'Balance transfer facility']
  },
  {
    category: 'Business Loan',
    title: 'Business Loans',
    description: 'Unsecured working capital and expansion loans for MSMEs.',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    rate: '11.50%',
    amount: '₹75L',
    features: ['Collateral free', 'Flexible repayment', 'Minimal documentation']
  },
  {
    category: 'Personal Loan',
    title: 'Personal Loans',
    description: 'Instant funds for medical emergencies, travel, or weddings.',
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    rate: '10.49%',
    amount: '₹40L',
    features: ['Disbursal in 24 hours', 'No end-use restriction', '100% digital process']
  },
  {
    category: 'Loan Against Property',
    title: 'Loan Against Property',
    description: 'Unlock the value of your residential or commercial property.',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    rate: '9.00%',
    amount: '₹15 Cr',
    features: ['Higher loan amounts', 'Longer tenure up to 15 yrs', 'Lower EMIs']
  }
];

const Cards: React.FC = () => {
  return (
    <section className="py-24 bg-[#F8FAFC] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-extrabold text-[#0A2540] sm:text-4xl tracking-tight">
            Tailored Loan Products
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Find the perfect financing solution carefully matched to your requirements and financial profile.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {loanProducts.map((loan, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group relative z-10">
              <div className="h-48 w-full bg-gray-200 relative overflow-hidden">
                <OptimizedImage
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={loan.image}
                  alt={loan.title}
                  containerClassName="w-full h-full"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                <h3 className="absolute bottom-4 left-6 text-2xl font-bold text-white tracking-wide">{loan.title}</h3>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-end mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Starting from</p>
                    <p className="text-2xl font-bold text-[#0A2540]">{loan.rate}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Up to</p>
                    <p className="text-xl font-bold text-emerald-600">{loan.amount}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-6 flex-1">{loan.description}</p>
                
                <ul className="mb-6 space-y-2">
                  {loan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
                
                <PrefetchLink 
                  prefetchRoute={preloadApply}
                  to="/apply" 
                  state={{ loanType: loan.category }}
                  className="w-full py-3 rounded-lg bg-gray-50 text-[#0A2540] font-semibold text-center group-hover:bg-[#0A2540] group-hover:text-white transition-colors duration-300 flex items-center justify-center gap-2"
                >
                  Apply Now <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -ml-6 group-hover:ml-0" />
                </PrefetchLink>
              </div>
            </div>
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
           <PrefetchLink prefetchRoute={preloadServices} to="/services" className="inline-flex items-center gap-2 text-[#0A2540] font-bold hover:text-blue-700 transition-colors">
              See All Loan Categories <ArrowRight className="w-5 h-5" />
           </PrefetchLink>
        </motion.div>
      </div>
    </section>
  );
};

export default Cards;   
