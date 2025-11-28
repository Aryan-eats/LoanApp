import React from 'react';
import { serviceCategories } from '../data/loanCategories';
import ApplyButton from '../components/ApplyButton';

const Services: React.FC = () => {
  return (
    <div className="pt-20 pb-16 px-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-black mb-4">Our Services</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Explore our comprehensive range of loan products tailored to meet every financial need.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {serviceCategories.map((category, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col">
            <div className="bg-black p-4">
              <h2 className="text-xl font-bold text-white">{category.title}</h2>
              {category.description && (
                <p className="text-gray-300 text-sm mt-1">{category.description}</p>
              )}
            </div>
            <div className="p-6 grow">
              <ul className="space-y-2">
                {category.items.map((item, idx) => (
                  <li key={idx} className="flex items-start text-gray-700">
                    <span className="text-black mr-2">•</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ApplyButton category={category.title} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Services;
