import { Search } from 'lucide-react';
import type { DocumentStatus } from '@/types/shared';

interface DocumentFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: DocumentStatus | '';
  onStatusFilterChange: (value: DocumentStatus | '') => void;
  expandedCount: number;
  totalCount: number;
  onToggleExpandAll: () => void;
}

export default function DocumentFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  expandedCount,
  totalCount,
  onToggleExpandAll,
}: DocumentFiltersProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, lead ID, partner ID, phone, or document type..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as DocumentStatus | '')}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Expand/Collapse All */}
        <button
          onClick={onToggleExpandAll}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {expandedCount === totalCount ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
    </div>
  );
}

export type { DocumentFiltersProps };
