import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  Eye,
  Upload,
  MoreVertical,
  Calendar,
  X,
  FileText,
  Clock,
  CheckCircle,
  IndianRupee,
} from 'lucide-react';
import {
  CreditCard,
  Business,
  Home,
  AccountBalance,
  DriveEta,
  Stars,
  School,
  Grass,
  Flag,
  ShoppingCart,
  Construction,
  FlashOn,
} from '@mui/icons-material';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { recentLeads } from '../data/placeholderData';
import type { Lead, LeadStatus, LoanType } from '../types/partner-dashboard';
import { buildLoanTypeLabels, buildLoanTypeOptions, getLoanProduct, getLoanIcon, categoryLabels, type LoanCategory } from '../../data/loanProducts';

// Dynamic labels from registry - supports all loan products
const loanTypeLabels = buildLoanTypeLabels(true);

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'docs_pending', label: 'Docs Pending' },
  { value: 'docs_uploaded', label: 'Docs Uploaded' },
  { value: 'bank_processing', label: 'Bank Processing' },
  { value: 'approved', label: 'Approved' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'rejected', label: 'Rejected' },
];

// Loan category options for filter
const loanCategoryOptions: { value: LoanCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'personal', label: 'Personal', icon: <CreditCard fontSize="small" /> },
  { value: 'business', label: 'Business', icon: <Business fontSize="small" /> },
  { value: 'home', label: 'Home', icon: <Home fontSize="small" /> },
  { value: 'property', label: 'Property', icon: <AccountBalance fontSize="small" /> },
  { value: 'vehicle', label: 'Vehicle', icon: <DriveEta fontSize="small" /> },
  { value: 'gold_securities', label: 'Gold & Securities', icon: <Stars fontSize="small" /> },
  { value: 'education', label: 'Education', icon: <School fontSize="small" /> },
  { value: 'agriculture', label: 'Agriculture', icon: <Grass fontSize="small" /> },
  { value: 'government', label: 'Govt. Schemes', icon: <Flag fontSize="small" /> },
  { value: 'corporate', label: 'Corporate', icon: <AccountBalance fontSize="small" /> },
  { value: 'consumer', label: 'Consumer', icon: <ShoppingCart fontSize="small" /> },
  { value: 'short_term', label: 'Short-Term', icon: <FlashOn fontSize="small" /> },
  { value: 'real_estate', label: 'Real Estate', icon: <Construction fontSize="small" /> },
  { value: 'specialized', label: 'Specialized', icon: <Stars fontSize="small" /> },
];

// Dynamic options from registry - supports all loan products
const loanTypeOptions = buildLoanTypeOptions().map(opt => ({ value: opt.value as LoanType, label: opt.label, icon: opt.icon }));

// Format currency
const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function MyLeadsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<LoanCategory[]>([]);
  const [selectedLoanTypes, setSelectedLoanTypes] = useState<LoanType[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  // Get filtered sub-types based on selected categories
  const getFilteredSubTypes = () => {
    if (selectedCategories.length === 0) {
      return loanTypeOptions;
    }
    return loanTypeOptions.filter(opt => {
      const product = getLoanProduct(opt.value);
      return product && selectedCategories.includes(product.category);
    });
  };

  // Filter leads
  const filteredLeads = recentLeads.filter((lead) => {
    const matchesSearch =
      lead.client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.client.phone.includes(searchQuery) ||
      lead.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(lead.status);
    
    // Check category match
    const leadProduct = getLoanProduct(lead.loanType);
    const matchesCategory = selectedCategories.length === 0 || 
      (leadProduct && selectedCategories.includes(leadProduct.category));
    
    const matchesLoanType = selectedLoanTypes.length === 0 || selectedLoanTypes.includes(lead.loanType);

    return matchesSearch && matchesStatus && matchesCategory && matchesLoanType;
  });

  const handleStatusToggle = (status: LeadStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleCategoryToggle = (category: LoanCategory) => {
    setSelectedCategories((prev) => {
      const newCategories = prev.includes(category) 
        ? prev.filter((c) => c !== category) 
        : [...prev, category];
      
      // Clear sub-type selections that don't belong to selected categories
      if (newCategories.length > 0) {
        setSelectedLoanTypes((prevTypes) => 
          prevTypes.filter((type) => {
            const product = getLoanProduct(type);
            return product && newCategories.includes(product.category);
          })
        );
      }
      
      return newCategories;
    });
  };

  const handleLoanTypeToggle = (type: LoanType) => {
    setSelectedLoanTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedLoanTypes([]);
    setDateRange({ from: '', to: '' });
  };

  const activeFiltersCount =
    selectedStatuses.length + selectedCategories.length + selectedLoanTypes.length + (dateRange.from || dateRange.to ? 1 : 0);

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Leads</h1>
          <p className="text-slate-500 mt-1">Track and manage all your submitted leads</p>
        </div>
        <Link
          to="/partner/add-client"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FileText size={16} />
          New Lead
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, phone, or lead ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusToggle(option.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedStatuses.includes(option.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-slate-400">to</span>
                  <div className="relative flex-1">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Category Filter */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Loan Category</label>
              <div className="flex flex-wrap gap-2">
                {loanCategoryOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleCategoryToggle(option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      selectedCategories.includes(option.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Sub-Type Filter */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Loan Sub-Type
                {selectedCategories.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    (filtered by selected categories)
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {getFilteredSubTypes().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleLoanTypeToggle(option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      selectedLoanTypes.includes(option.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
                {getFilteredSubTypes().length === 0 && selectedCategories.length > 0 && (
                  <p className="text-sm text-slate-500 italic">No sub-types available for selected categories</p>
                )}
              </div>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <X size={14} />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>
          Showing <span className="font-medium text-slate-700">{filteredLeads.length}</span> of{' '}
          <span className="font-medium text-slate-700">{recentLeads.length}</span> leads
        </p>
      </div>

      {/* Leads Table */}
      {filteredLeads.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Lead ID
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Loan Details
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Bank
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-blue-600">{lead.id}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{lead.client.fullName}</p>
                        <p className="text-xs text-slate-500">{lead.client.phone}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm text-slate-700">{loanTypeLabels[lead.loanType]}</p>
                        <p className="text-sm font-medium text-slate-800">{formatCurrency(lead.loanAmount)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {lead.bankAssigned ? (
                        <span className="text-sm text-slate-700">{lead.bankAssigned}</span>
                      ) : (
                        <span className="text-sm text-slate-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-600">{lead.createdAt}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openLeadDetails(lead)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                        {(lead.status === 'docs_pending' || lead.status === 'submitted') && (
                          <Link
                            to={`/partner/documents/${lead.id}`}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Upload documents"
                          >
                            <Upload size={16} />
                          </Link>
                        )}
                        <button
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="More actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page 1 of 1</p>
            <div className="flex items-center gap-2">
              <button
                disabled
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={<FileText size={32} />}
            title="No leads found"
            description={
              searchQuery || activeFiltersCount > 0
                ? "No leads match your current filters. Try adjusting your search criteria."
                : "You haven't submitted any leads yet. Start by adding your first client."
            }
            action={{
              label: searchQuery || activeFiltersCount > 0 ? 'Clear Filters' : 'Add Client',
              onClick: searchQuery || activeFiltersCount > 0 ? clearFilters : () => {},
            }}
          />
        </div>
      )}

      {/* Lead Details Modal */}
      {showLeadDetails && selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Lead Details</h2>
                <p className="text-sm text-slate-500">{selectedLead.id}</p>
              </div>
              <button
                onClick={() => setShowLeadDetails(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Status Banner */}
              <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedLead.status} />
                  {selectedLead.bankAssigned && (
                    <span className="text-sm text-slate-600">• {selectedLead.bankAssigned}</span>
                  )}
                </div>
                {selectedLead.disbursedAmount && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Disbursed</p>
                    <p className="font-semibold text-green-600">{formatCurrency(selectedLead.disbursedAmount)}</p>
                  </div>
                )}
              </div>

              {/* Client Info */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Client Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-sm font-medium text-slate-800">{selectedLead.client.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-sm font-medium text-slate-800">{selectedLead.client.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-800">{selectedLead.client.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Employment</p>
                    <p className="text-sm font-medium text-slate-800 capitalize">
                      {selectedLead.client.employmentType.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Loan Info */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Loan Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Loan Category</p>
                    <p className="text-sm font-medium text-slate-800">
                      {getLoanProduct(selectedLead.loanType)?.category 
                        ? categoryLabels[getLoanProduct(selectedLead.loanType)!.category]
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Loan Sub-Type</p>
                    <div className="flex items-center gap-2">
                      {getLoanIcon(selectedLead.loanType)}
                      <p className="text-sm font-medium text-slate-800">{loanTypeLabels[selectedLead.loanType] || selectedLead.loanType}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Requested Amount</p>
                    <p className="text-sm font-medium text-slate-800">{formatCurrency(selectedLead.loanAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tenure</p>
                    <p className="text-sm font-medium text-slate-800">{selectedLead.tenure} months</p>
                  </div>
                  {selectedLead.interestRate && (
                    <div>
                      <p className="text-xs text-slate-500">Interest Rate</p>
                      <p className="text-sm font-medium text-slate-800">{selectedLead.interestRate}% p.a.</p>
                    </div>
                  )}
                  {selectedLead.emi && (
                    <div>
                      <p className="text-xs text-slate-500">EMI</p>
                      <p className="text-sm font-medium text-slate-800">{formatCurrency(selectedLead.emi)}/month</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h3>
                <div className="space-y-3">
                  {selectedLead.timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === selectedLead.timeline.length - 1
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {index === selectedLead.timeline.length - 1 ? (
                            <Clock size={14} />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                        </div>
                        {index < selectedLead.timeline.length - 1 && (
                          <div className="w-0.5 h-8 bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={event.status} size="sm" />
                          <span className="text-xs text-slate-400">by {event.updatedBy}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{event.timestamp}</p>
                        {event.note && <p className="text-sm text-slate-600 mt-1">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commission Info */}
              {selectedLead.commission && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="text-green-600" size={18} />
                      <span className="font-medium text-green-800">Commission</span>
                    </div>
                    <StatusBadge status={selectedLead.commission.status} size="sm" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-green-700">
                      {selectedLead.commission.rate}% of disbursed amount
                    </span>
                    <span className="font-semibold text-green-800">
                      {formatCurrency(selectedLead.commission.amount)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLeadDetails(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
              {(selectedLead.status === 'docs_pending' || selectedLead.status === 'submitted') && (
                <Link
                  to={`/partner/documents/${selectedLead.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Upload size={16} />
                  Upload Documents
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
