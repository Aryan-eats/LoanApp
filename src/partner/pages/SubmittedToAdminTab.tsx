import { useState } from 'react';
import { useDebounce } from '../../hooks';
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
import StatusBadge from '../../components/shared/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useLeadsStore } from '../../stores/leadsStore';
import type { Lead, LeadStatus, LoanType } from '../types/partner-dashboard';
import {
  buildLoanTypeLabels,
  buildLoanTypeOptions,
  getLoanProduct,
  getLoanIcon,
  categoryLabels,
  type LoanCategory,
} from '../../data/loanProducts';

const loanTypeLabels = buildLoanTypeLabels(true);

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'docs_pending', label: 'Docs Pending' },
  { value: 'docs_uploaded', label: 'Docs Uploaded' },
  { value: 'docs_collected', label: 'Docs Collected' },
  { value: 'bank_processing', label: 'Bank Processing' },
  { value: 'bank_logged', label: 'Bank Logged' },
  { value: 'approved', label: 'Approved' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'rejected', label: 'Rejected' },
];

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

const loanTypeOptions = buildLoanTypeOptions().map((opt) => ({
  value: opt.value as LoanType,
  label: opt.label,
  icon: opt.icon,
}));

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function SubmittedToAdminTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<LoanCategory[]>([]);
  const [selectedLoanTypes, setSelectedLoanTypes] = useState<LoanType[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  const { leads } = useLeadsStore();

  const getFilteredSubTypes = () => {
    if (selectedCategories.length === 0) return loanTypeOptions;
    return loanTypeOptions.filter((opt) => {
      const product = getLoanProduct(opt.value);
      return product && selectedCategories.includes(product.category);
    });
  };

  const filteredLeads = (leads as Lead[]).filter((lead) => {
    const matchesSearch =
      lead.client.fullName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      lead.client.phone.includes(debouncedSearchQuery) ||
      lead.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(lead.status);

    const leadProduct = getLoanProduct(lead.loanType);
    const matchesCategory =
      selectedCategories.length === 0 || (leadProduct && selectedCategories.includes(leadProduct.category));

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
    selectedStatuses.length +
    selectedCategories.length +
    selectedLoanTypes.length +
    (dateRange.from || dateRange.to ? 1 : 0);

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  return (
    <>
      {/* Search + Filters */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, phone, or lead ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              showFilters || activeFiltersCount > 0
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                : 'border-white/10 text-slate-300 hover:bg-white/5'
            }`}
          >
            <Filter size={16} />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusToggle(option.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedStatuses.includes(option.value)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-white/5'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-slate-500">to</span>
                  <div className="relative flex-1">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Loan Category</label>
              <div className="flex flex-wrap gap-2">
                {loanCategoryOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleCategoryToggle(option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      selectedCategories.includes(option.value)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-white/5'
                    }`}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Loan Sub-Type
                {selectedCategories.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    (filtered by selected categories)
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {getFilteredSubTypes().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleLoanTypeToggle(option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      selectedLoanTypes.includes(option.value)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-white/5'
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

            {activeFiltersCount > 0 && (
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <X size={14} />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <p>
          Showing <span className="font-medium text-slate-200">{filteredLeads.length}</span> of{' '}
          <span className="font-medium text-slate-200">{leads.length}</span> submitted leads
        </p>
      </div>

      {filteredLeads.length > 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-white/10">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Lead ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Loan Details</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-indigo-400">{lead.id}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-200">{lead.client.fullName}</p>
                        <p className="text-xs text-slate-400">{lead.client.phone}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm text-slate-300">{loanTypeLabels[lead.loanType]}</p>
                        <p className="text-sm font-medium text-slate-200">{formatCurrency(lead.loanAmount)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {lead.bankAssigned ? (
                        <span className="text-sm text-slate-300">{lead.bankAssigned}</span>
                      ) : (
                        <span className="text-sm text-slate-500">Not assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={lead.status} variant="partner" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-400">{lead.createdAt}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openLeadDetails(lead)}
                          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                        {(lead.status === 'docs_pending' || lead.status === 'submitted') && (
                          <Link
                            to={`/partner/documents/${lead.id}`}
                            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Upload documents"
                          >
                            <Upload size={16} />
                          </Link>
                        )}
                        <button
                          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
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

          <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page 1 of 1</p>
            <div className="flex items-center gap-2">
              <button disabled className="px-3 py-1.5 border border-white/5 rounded-lg text-sm text-slate-600 cursor-not-allowed">
                Previous
              </button>
              <button disabled className="px-3 py-1.5 border border-white/5 rounded-lg text-sm text-slate-600 cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10">
          <EmptyState
            icon={<FileText size={32} />}
            title="No leads found"
            description={
              searchQuery || activeFiltersCount > 0
                ? 'No leads match your current filters. Try adjusting your search criteria.'
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.3)] max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Lead Details</h2>
                <p className="text-sm text-slate-400 font-mono mt-0.5">{selectedLead.id}</p>
              </div>
              <button
                onClick={() => setShowLeadDetails(false)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
              <div className="flex items-center justify-between mb-6 p-4 bg-slate-800/50 border border-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedLead.status} variant="partner" />
                  {selectedLead.bankAssigned && (
                    <span className="text-sm text-slate-400">• {selectedLead.bankAssigned}</span>
                  )}
                </div>
                {selectedLead.disbursedAmount && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Disbursed</p>
                    <p className="font-semibold text-emerald-400">{formatCurrency(selectedLead.disbursedAmount)}</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Client Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-sm font-medium text-slate-300">{selectedLead.client.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-sm font-medium text-slate-300">{selectedLead.client.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-300">{selectedLead.client.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Employment</p>
                    <p className="text-sm font-medium text-slate-300 capitalize">
                      {selectedLead.client.employmentType.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Loan Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Loan Category</p>
                    <p className="text-sm font-medium text-slate-300">
                      {getLoanProduct(selectedLead.loanType)?.category
                        ? categoryLabels[getLoanProduct(selectedLead.loanType)!.category]
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Loan Sub-Type</p>
                    <div className="flex items-center gap-2">
                      {getLoanIcon(selectedLead.loanType)}
                      <p className="text-sm font-medium text-slate-300">
                        {loanTypeLabels[selectedLead.loanType] || selectedLead.loanType}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Requested Amount</p>
                    <p className="text-sm font-medium text-slate-300">{formatCurrency(selectedLead.loanAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tenure</p>
                    <p className="text-sm font-medium text-slate-300">{selectedLead.tenure} months</p>
                  </div>
                  {selectedLead.interestRate && (
                    <div>
                      <p className="text-xs text-slate-500">Interest Rate</p>
                      <p className="text-sm font-medium text-slate-300">{selectedLead.interestRate}% p.a.</p>
                    </div>
                  )}
                  {selectedLead.emi && (
                    <div>
                      <p className="text-xs text-slate-500">EMI</p>
                      <p className="text-sm font-medium text-slate-300">{formatCurrency(selectedLead.emi)}/month</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Timeline</h3>
                <div className="space-y-3">
                  {selectedLead.timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                            index === selectedLead.timeline.length - 1
                              ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {index === selectedLead.timeline.length - 1 ? (
                            <Clock size={14} />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                        </div>
                        {index < selectedLead.timeline.length - 1 && (
                          <div className="w-0.5 h-8 bg-white/10 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={event.status} size="sm" variant="partner" />
                          <span className="text-xs text-slate-500">by {event.updatedBy}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{event.timestamp}</p>
                        {event.note && <p className="text-sm text-slate-300 mt-1">{event.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedLead.commission && (
                <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="text-emerald-400" size={18} />
                      <span className="font-medium text-emerald-300">Commission</span>
                    </div>
                    <StatusBadge status={selectedLead.commission.status} size="sm" variant="partner" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-emerald-400/80">
                      {selectedLead.commission.rate}% of disbursed amount
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {formatCurrency(selectedLead.commission.amount)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLeadDetails(false)}
                className="px-4 py-2 text-slate-300 hover:text-slate-100 hover:bg-white/5 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-white/10 cursor-pointer"
              >
                Close
              </button>
              {(selectedLead.status === 'docs_pending' || selectedLead.status === 'submitted') && (
                <Link
                  to={`/partner/documents/${selectedLead.id}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors inline-flex items-center gap-2 shadow-sm"
                >
                  <Upload size={16} />
                  Upload Documents
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
