import React from 'react';
import type { LoanType, LeadStatus } from '../../types/admin';
import { buildLoanTypeLabels } from '../../../data/loanProductsData';

const loanTypeLabels = buildLoanTypeLabels(true);

interface LeadsFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: LeadStatus | '';
  setStatusFilter: (status: LeadStatus | '') => void;
  loanTypeFilter: LoanType | '';
  setLoanTypeFilter: (type: LoanType | '') => void;
}

const LeadsFilters: React.FC<LeadsFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  loanTypeFilter,
  setLoanTypeFilter,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg 
              className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, lead ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Loan Type Filter */}
        <select
          value={loanTypeFilter}
          onChange={(e) => setLoanTypeFilter(e.target.value as LoanType | '')}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
        >
          <option value="">All Loan Types</option>
          {Object.entries(loanTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label as string}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
        >
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="docs_pending">Docs Pending</option>
          <option value="docs_uploaded">Docs Uploaded</option>
          <option value="bank_processing">Bank Processing</option>
          <option value="approved">Approved</option>
          <option value="disbursed">Disbursed</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Date Filter — disabled until wired to state */}
        <input
          type="date"
          disabled
          aria-disabled="true"
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
        />
      </div>
    </div>
  );
};

export default LeadsFilters;
