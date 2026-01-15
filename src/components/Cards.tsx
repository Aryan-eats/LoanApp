import React from 'react';
import { Link } from 'react-router-dom';
import { featuredLoans } from '../data/featuredLoans';

const Cards: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Our Specialities
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Explore categories to find the perfect loan for your needs.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredLoans.map((loan, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <div className="h-48 w-full bg-gray-200">
                <img
                  className="w-full h-full object-cover"
                  src={loan.image}
                  alt={loan.title}
                  loading="lazy"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{loan.title}</h3>
                <p className="text-gray-600 flex-1">{loan.description}</p>
                <Link 
                  to="/apply" 
                  state={{ loanType: loan.category }}
                  className="mt-4 text-black font-semibold hover:text-gray-800 self-start inline-block"
                >
                  Let us know &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Cards;
