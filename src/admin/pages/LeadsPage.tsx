import React, { useState, useMemo, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import { leads as placeholderLeads, banks } from '../data/placeholderData';
import { useLeadsStore } from '../../stores/leadsStore';
import type { Lead, LeadStatus, LoanType } from '../types/admin';
import { buildLoanTypeLabels, getProductsByCategory, type LoanCategory } from '../../data/loanProducts';
import {
  User,
  Phone,
  Mail,
  IndianRupee,
  AlertCircle,
  X,
  ChevronDown,
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

// Dynamic labels from registry - supports all loan products
const loanTypeLabels = buildLoanTypeLabels(true);

// Helper function to get loan type display label
// Handles both registered codes and website-submitted loan types
const getLoanTypeLabel = (loanType: string): string => {
  // First try to find in registered labels
  if (loanTypeLabels[loanType]) {
    return loanTypeLabels[loanType];
  }
  // Otherwise, format the loan type string nicely
  // Convert snake_case to Title Case (e.g., "personal_loans" -> "Personal Loans")
  return loanType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const statusSteps: LeadStatus[] = ['submitted', 'docs_collected', 'bank_logged', 'approved', 'disbursed'];

// Loan categories for the form
const loanCategories: { value: LoanCategory; label: string; icon: React.ReactNode }[] = [
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
  { value: 'specialized', label: 'Specialized', icon: <FlashOn fontSize="small" /> },
];

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

const LeadsPage: React.FC = () => {
  // Get website-submitted leads from store
  const websiteLeads = useLeadsStore((state) => state.leads);
  
  // Merge placeholder leads with website leads
  const mergedLeads = useMemo(() => {
    return [...placeholderLeads, ...websiteLeads];
  }, [websiteLeads]);

  const [leads, setLeads] = useState(mergedLeads);
  
  // Keep leads in sync when websiteLeads changes
  useEffect(() => {
    setLeads(mergedLeads);
  }, [mergedLeads]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [loanTypeFilter, setLoanTypeFilter] = useState<LoanType | ''>('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'bank' | 'timeline' | 'commission'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LoanCategory | ''>('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    loanCategory: '',
    loanType: '',
    loanAmount: '',
  });

  const [statusNote, setStatusNote] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null);
  const [showBankConfirmModal, setShowBankConfirmModal] = useState(false);
  const [pendingBankAssignment, setPendingBankAssignment] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(formData.customerPhone)) newErrors.customerPhone = 'Enter valid 10-digit mobile number';
    if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Enter valid email address';
    }
    if (!formData.loanCategory) newErrors.loanCategory = 'Please select a loan category';
    if (!formData.loanType) newErrors.loanType = 'Please select a loan type';
    if (!formData.loanAmount) newErrors.loanAmount = 'Loan amount is required';
    else if (Number(formData.loanAmount) < 50000) newErrors.loanAmount = 'Minimum loan amount is ₹50,000';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddLead = () => {
    if (!validateForm()) return;

    const newLead: Lead = {
      id: `L${String(leads.length + 1).padStart(3, '0')}`,
      customerId: `C${String(leads.length + 1).padStart(3, '0')}`,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || '',
      loanType: formData.loanType as LoanType,
      loanAmount: Number(formData.loanAmount),
      partnerId: 'P001', // Default partner for admin-created leads
      partnerName: 'Admin Created',
      status: 'submitted',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      timeline: [
        {
          id: 'T1',
          status: 'submitted',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updatedBy: 'Admin',
        },
      ],
      documents: [],
    };

    setLeads((prev) => [newLead, ...prev]);
    setShowAddModal(false);
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      loanCategory: '',
      loanType: '',
      loanAmount: '',
    });
    setSelectedCategory('');
    setErrors({});
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  const handleStatusUpdate = (leadId: string, newStatus: LeadStatus, note?: string) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          const newTimelineEntry = {
            id: `T${lead.timeline.length + 1}`,
            status: newStatus,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            updatedBy: 'Admin',
            note: note || undefined,
          };
          return {
            ...lead,
            status: newStatus,
            updatedAt: new Date().toISOString().split('T')[0],
            timeline: [...lead.timeline, newTimelineEntry],
          };
        }
        return lead;
      })
    );

    // Update selectedLead if it's the one being modified
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => {
        if (!prev) return null;
        const newTimelineEntry = {
          id: `T${prev.timeline.length + 1}`,
          status: newStatus,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updatedBy: 'Admin',
          note: note || undefined,
        };
        return {
          ...prev,
          status: newStatus,
          updatedAt: new Date().toISOString().split('T')[0],
          timeline: [...prev.timeline, newTimelineEntry],
        };
      });
    }

    setStatusNote('');
    setShowStatusDropdown(null);
  };

  const handleBankAssignmentClick = (bankName: string) => {
    if (!selectedLead || !bankName) return;
    
    // If a bank is already assigned and we're changing to a different one, show confirmation
    if (selectedLead.bankAssigned && selectedLead.bankAssigned !== bankName) {
      setPendingBankAssignment(bankName);
      setShowBankConfirmModal(true);
    } else {
      // No bank assigned yet, assign directly
      handleBankAssignment(selectedLead.id, bankName);
    }
  };

  const confirmBankAssignment = () => {
    if (selectedLead && pendingBankAssignment) {
      handleBankAssignment(selectedLead.id, pendingBankAssignment);
    }
    setShowBankConfirmModal(false);
    setPendingBankAssignment(null);
  };

  const cancelBankAssignment = () => {
    setShowBankConfirmModal(false);
    setPendingBankAssignment(null);
  };

  const handleBankAssignment = (leadId: string, bankName: string) => {
    if (!bankName) return;
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const dateStr = new Date().toISOString().split('T')[0];

    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          const isChangingBank = lead.bankAssigned && lead.bankAssigned !== bankName;
          const newTimelineEntry = {
            id: `T${lead.timeline.length + 1}`,
            status: lead.status,
            timestamp,
            updatedBy: 'Admin',
            note: isChangingBank 
              ? `Bank changed from ${lead.bankAssigned} to ${bankName}`
              : `Bank assigned: ${bankName}`,
          };
          return {
            ...lead,
            bankAssigned: bankName,
            updatedAt: dateStr,
            timeline: [...lead.timeline, newTimelineEntry],
          };
        }
        return lead;
      })
    );

    // Update selectedLead if it's the one being modified
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => {
        if (!prev) return null;
        const isChangingBank = prev.bankAssigned && prev.bankAssigned !== bankName;
        const newTimelineEntry = {
          id: `T${prev.timeline.length + 1}`,
          status: prev.status,
          timestamp,
          updatedBy: 'Admin',
          note: isChangingBank 
            ? `Bank changed from ${prev.bankAssigned} to ${bankName}`
            : `Bank assigned: ${bankName}`,
        };
        return {
          ...prev,
          bankAssigned: bankName,
          updatedAt: dateStr,
          timeline: [...prev.timeline, newTimelineEntry],
        };
      });
    }
  };

  const getNextStatuses = (currentStatus: LeadStatus): LeadStatus[] => {
    const statusFlow: Record<LeadStatus, LeadStatus[]> = {
      submitted: ['docs_collected', 'rejected'],
      docs_collected: ['bank_logged', 'rejected'],
      bank_logged: ['approved', 'rejected'],
      approved: ['disbursed', 'rejected'],
      disbursed: [],
      rejected: ['submitted'], // Allow reactivation
    };
    return statusFlow[currentStatus] || [];
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.customerPhone.includes(searchQuery) ||
      lead.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || lead.status === statusFilter;
    const matchesLoanType = !loanTypeFilter || lead.loanType === loanTypeFilter;

    return matchesSearch && matchesStatus && matchesLoanType;
  });

  const getStatusIndex = (status: LeadStatus): number => {
    return statusSteps.indexOf(status);
  };

  return (
    <AdminLayout onAddLead={openAddModal}>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and track all loan applications</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <option key={value} value={value}>{label}</option>
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
            <option value="docs_collected">Docs Collected</option>
            <option value="bank_logged">Bank Logged</option>
            <option value="approved">Approved</option>
            <option value="disbursed">Disbursed</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Date Range */}
          <input
            type="date"
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Loan Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.id}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lead.customerName}</p>
                      <p className="text-xs text-gray-500">{lead.customerPhone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getLoanTypeLabel(lead.loanType)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(lead.loanAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.partnerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.bankAssigned || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setShowStatusDropdown(showStatusDropdown === lead.id ? null : lead.id)}
                        className="flex items-center gap-1 group"
                      >
                        <StatusBadge status={lead.status} size="sm" />
                        {getNextStatuses(lead.status).length > 0 && (
                          <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                      {showStatusDropdown === lead.id && getNextStatuses(lead.status).length > 0 && (
                        <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                          <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">Update Status</p>
                          {getNextStatuses(lead.status).map((status) => (
                            <button
                              key={status}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(lead.id, status);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${status === 'rejected' ? 'text-red-600' : 'text-gray-700'}`}
                            >
                              {status === 'rejected' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                              {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{lead.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setActiveTab('overview');
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No leads found</p>
          </div>
        )}
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Lead {selectedLead.id}</h2>
                <p className="text-sm text-gray-500">{selectedLead.customerName}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 px-6">
              <nav className="flex gap-6">
                {['overview', 'documents', 'bank', 'timeline', 'commission'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Loan Type</p>
                      <p className="text-lg font-semibold text-gray-900">{getLoanTypeLabel(selectedLead.loanType)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Loan Amount</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedLead.loanAmount)}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Name</span>
                        <span className="text-sm font-medium text-gray-900">{selectedLead.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Phone</span>
                        <span className="text-sm text-gray-900">{selectedLead.customerPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="text-sm text-gray-900">{selectedLead.customerEmail}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Partner Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Partner</span>
                        <span className="text-sm font-medium text-gray-900">{selectedLead.partnerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Partner ID</span>
                        <span className="text-sm text-gray-900">{selectedLead.partnerId}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Status</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <StatusBadge status={selectedLead.status} />
                    </div>

                    {/* Status Update Actions */}
                    {getNextStatuses(selectedLead.status).length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Update Status</h4>
                        
                        {/* Optional Note */}
                        <div className="mb-3">
                          <input
                            type="text"
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            placeholder="Add a note (optional)"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        </div>

                        {/* Status Buttons */}
                        <div className="flex flex-wrap gap-2">
                          {getNextStatuses(selectedLead.status).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusUpdate(selectedLead.id, status, statusNote)}
                              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                                status === 'rejected'
                                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                              }`}
                            >
                              {status === 'rejected' ? (
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Reject
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedLead.status === 'disbursed' && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 text-green-700">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium">Loan successfully disbursed!</span>
                        </div>
                      </div>
                    )}

                    {selectedLead.status === 'rejected' && (
                      <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-red-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium">This lead was rejected</span>
                          </div>
                          <button
                            onClick={() => handleStatusUpdate(selectedLead.id, 'submitted', 'Reactivated lead')}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Reactivate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {selectedLead.documents.length > 0 ? (
                    selectedLead.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.type}</p>
                            <p className="text-xs text-gray-500">{doc.fileName} • {doc.uploadedAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={doc.status} size="sm" />
                          <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No documents uploaded yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* Bank Submission Tab */}
              {activeTab === 'bank' && (
                <div className="space-y-6">
                  {/* Current Bank Info */}
                  {selectedLead.bankAssigned && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-800">Currently Assigned: {selectedLead.bankAssigned}</p>
                          <p className="text-xs text-green-600">Last updated: {selectedLead.updatedAt}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Available Banks - Click to Assign */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {selectedLead.bankAssigned ? 'Change Bank' : 'Select a Bank to Assign'}
                    </h4>
                    <p className="text-xs text-gray-500">Click on a bank to assign it to this lead</p>
                    <div className="grid gap-3">
                      {banks
                        .filter((bank) => bank.status === 'active')
                        .map((bank) => {
                          const isCurrentBank = selectedLead.bankAssigned === bank.name;
                          return (
                            <div
                              key={bank.id}
                              onClick={() => !isCurrentBank && handleBankAssignmentClick(bank.name)}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                isCurrentBank
                                  ? 'border-green-400 bg-green-50 cursor-default'
                                  : 'border-gray-200 hover:border-gray-900 hover:bg-gray-50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                                    isCurrentBank
                                      ? 'bg-green-200 text-green-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {bank.code.substring(0, 2)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{bank.name}</p>
                                    <p className="text-xs text-gray-500">TAT: {bank.avgTat} days • Contact: {bank.contactPerson}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-green-600">{bank.approvalRate}%</p>
                                    <p className="text-xs text-gray-500">Approval</p>
                                  </div>
                                  {!isCurrentBank && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBankAssignmentClick(bank.name);
                                      }}
                                      className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                      Assign
                                    </button>
                                  )}
                                </div>
                              </div>
                              {isCurrentBank && (
                                <div className="mt-3 pt-3 border-t border-green-200 flex items-center gap-1 text-xs text-green-700">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Currently Assigned
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {/* Status Progress */}
                  <div className="flex items-center justify-between mb-6">
                    {statusSteps.map((step, index) => {
                      const currentIndex = getStatusIndex(selectedLead.status);
                      const isCompleted = index <= currentIndex;
                      const isCurrent = index === currentIndex;

                      return (
                        <React.Fragment key={step}>
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                isCompleted
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-500'
                              } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}
                            >
                              {isCompleted ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span className={`text-xs mt-1 ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                              {step.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                          {index < statusSteps.length - 1 && (
                            <div className={`flex-1 h-0.5 ${index < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Timeline Events */}
                  <div className="space-y-4">
                    {selectedLead.timeline.map((event, index) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-gray-900 rounded-full" />
                          {index < selectedLead.timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-gray-900">
                            {event.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {event.timestamp} • by {event.updatedBy}
                          </p>
                          {event.note && (
                            <p className="text-sm text-gray-600 mt-2">{event.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commission Tab */}
              {activeTab === 'commission' && (
                <div className="space-y-4">
                  {selectedLead.commission ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Commission Status</span>
                        <StatusBadge status={selectedLead.commission.status} size="sm" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Disbursed Amount</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedLead.commission.disbursedAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Commission Rate</span>
                        <span className="text-sm text-gray-900">{selectedLead.commission.commissionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                        <span className="text-sm font-medium text-gray-900">Commission Amount</span>
                        <span className="text-lg font-bold text-green-600">{formatCurrency(selectedLead.commission.commissionAmount)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">Commission not yet generated</p>
                      <p className="text-xs text-gray-400 mt-1">Commission is calculated after loan disbursement</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bank Change Confirmation Modal */}
      {showBankConfirmModal && selectedLead && pendingBankAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Bank Change</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to change the assigned bank from{' '}
              <span className="font-semibold text-gray-900">{selectedLead.bankAssigned}</span> to{' '}
              <span className="font-semibold text-gray-900">{pendingBankAssignment}</span>?
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelBankAssignment}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBankAssignment}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add New Lead</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Customer Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={formData.customerName}
                          onChange={(e) => handleInputChange('customerName', e.target.value)}
                          placeholder="Enter customer name"
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                            errors.customerName ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                        />
                      </div>
                      {errors.customerName && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors.customerName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.customerPhone}
                          onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                          placeholder="10-digit mobile number"
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                            errors.customerPhone ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                        />
                      </div>
                      {errors.customerPhone && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors.customerPhone}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                          placeholder="customer@email.com"
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                            errors.customerEmail ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                        />
                      </div>
                      {errors.customerEmail && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors.customerEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Loan Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Details</h3>
                  
                  {/* Loan Category Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Loan Category *</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {loanCategories.map((cat) => (
                        <label
                          key={cat.value}
                          className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${
                            selectedCategory === cat.value
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="loanCategory"
                            value={cat.value}
                            checked={selectedCategory === cat.value}
                            onChange={(e) => {
                              setSelectedCategory(e.target.value as LoanCategory);
                              handleInputChange('loanCategory', e.target.value);
                              handleInputChange('loanType', ''); // Reset sub-type when category changes
                            }}
                            className="sr-only"
                          />
                          <span className="text-2xl">{cat.icon}</span>
                          <span className="text-xs font-medium text-gray-700 text-center">{cat.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.loanCategory && (
                      <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.loanCategory}
                      </p>
                    )}
                  </div>

                  {/* Loan Sub-Type Dropdown */}
                  {selectedCategory && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Select Specific Loan Type *
                      </label>
                      <div className="relative">
                        <select
                          value={formData.loanType}
                          onChange={(e) => handleInputChange('loanType', e.target.value)}
                          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 appearance-none bg-white ${
                            errors.loanType ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          }`}
                        >
                          <option value="">-- Select loan type --</option>
                          {getProductsByCategory(selectedCategory).map((product) => (
                            <option key={product.code} value={product.code}>
                              {product.icon} {product.shortLabel || product.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      {errors.loanType && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {errors.loanType}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Loan Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Loan Amount Required *
                    </label>
                    <div className="relative">
                      <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        value={formData.loanAmount}
                        onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                        placeholder="e.g., 500000"
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                          errors.loanAmount ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    {formData.loanAmount && (
                      <p className="mt-1 text-xs text-gray-500">
                        ₹{Number(formData.loanAmount).toLocaleString('en-IN')}
                      </p>
                    )}
                    {errors.loanAmount && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {errors.loanAmount}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddLead}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Add Lead
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default LeadsPage;
