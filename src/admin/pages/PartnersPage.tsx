import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import { getPartners, updatePartnerStatus } from '../../api/partnersApi';
import type { Partner, ApplicationStatus, PartnerType } from '../types/admin';

const partnerTypeLabels: Record<PartnerType, string> = {
  freelancer: 'Freelancer',
  used_car_dealer: 'Used Car Dealer',
  property_dealer: 'Property Dealer',
  builder: 'Builder',
  sub_dsa: 'Sub-DSA',
};

const PartnersPage: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<PartnerType | ''>('');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject' | 'suspend' | null;
    partner: Partner | null;
  }>({ isOpen: false, action: null, partner: null });

  // Fetch partners on mount
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setIsLoading(true);
        const response = await getPartners();
        if (response.success && response.data) {
          setPartners(response.data.partners);
        }
      } catch (error) {
        console.error('Failed to fetch partners:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartners();
  }, []);

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch = 
      partner.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || partner.status === statusFilter;
    const matchesType = !typeFilter || partner.partnerType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleAction = (action: 'approve' | 'reject' | 'suspend', partner: Partner) => {
    setConfirmModal({ isOpen: true, action, partner });
  };

  const executeAction = async () => {
    if (!confirmModal.partner || !confirmModal.action) return;
    
    try {
      const statusMap = {
        approve: 'approved' as const,
        reject: 'rejected' as const,
        suspend: 'suspended' as const,
      };
      
      await updatePartnerStatus(confirmModal.partner.id, statusMap[confirmModal.action]);
      
      // Refresh partners list
      const response = await getPartners();
      if (response.success && response.data) {
        setPartners(response.data.partners);
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
    
    setConfirmModal({ isOpen: false, action: null, partner: null });
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-1">Manage partner applications and accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{filteredPartners.length} partners</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PartnerType | '')}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
          >
            <option value="">All Types</option>
            <option value="freelancer">Freelancer</option>
            <option value="used_car_dealer">Used Car Dealer</option>
            <option value="property_dealer">Property Dealer</option>
            <option value="builder">Builder</option>
            <option value="sub_dsa">Sub-DSA</option>
          </select>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">City</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Leads</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPartners.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {partner.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{partner.fullName}</p>
                        <p className="text-xs text-gray-500">{partner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {partnerTypeLabels[partner.partnerType]}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{partner.city}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={partner.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{partner.leadsSubmitted}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{partner.joinedDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedPartner(partner)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {partner.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction('approve', partner)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Approve"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleAction('reject', partner)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Reject"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                      {partner.status === 'approved' && (
                        <button
                          onClick={() => handleAction('suspend', partner)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Suspend"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPartners.length === 0 && (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No partners found</p>
          </div>
        )}
      </div>

      {/* Partner Detail Drawer */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedPartner(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Partner Details</h2>
              <button
                onClick={() => setSelectedPartner(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="text-sm font-medium text-gray-900">{selectedPartner.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm text-gray-900">{selectedPartner.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Phone</span>
                    <span className="text-sm text-gray-900">{selectedPartner.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Partner Type</span>
                    <span className="text-sm text-gray-900">{partnerTypeLabels[selectedPartner.partnerType]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">City</span>
                    <span className="text-sm text-gray-900">{selectedPartner.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <StatusBadge status={selectedPartner.status} size="sm" />
                  </div>
                </div>
              </div>

              {/* PAN/Business Details */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">PAN / Business Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">PAN Number</span>
                    <span className="text-sm font-mono text-gray-900">{selectedPartner.panNumber}</span>
                  </div>
                  {selectedPartner.businessName && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Business Name</span>
                      <span className="text-sm text-gray-900">{selectedPartner.businessName}</span>
                    </div>
                  )}
                  {selectedPartner.businessAddress && (
                    <div>
                      <span className="text-sm text-gray-500">Business Address</span>
                      <p className="text-sm text-gray-900 mt-1">{selectedPartner.businessAddress}</p>
                    </div>
                  )}
                  {selectedPartner.gstNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">GST Number</span>
                      <span className="text-sm font-mono text-gray-900">{selectedPartner.gstNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payout Details */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Payout Details</h3>
                <div className="space-y-3">
                  {selectedPartner.accountHolderName ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Account Holder</span>
                        <span className="text-sm text-gray-900">{selectedPartner.accountHolderName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Bank</span>
                        <span className="text-sm text-gray-900">{selectedPartner.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Account Number</span>
                        <span className="text-sm font-mono text-gray-900">{selectedPartner.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">IFSC Code</span>
                        <span className="text-sm font-mono text-gray-900">{selectedPartner.ifscCode}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No payout details provided</p>
                  )}
                </div>
              </div>

              {/* Lead History */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Lead History</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{selectedPartner.leadsSubmitted}</p>
                    <p className="text-sm text-gray-500">Total Leads Submitted</p>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              {selectedPartner.notes && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Internal Notes</h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">{selectedPartner.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 flex gap-3">
                {selectedPartner.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAction('approve', selectedPartner)}
                      className="flex-1 py-2 px-4 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction('reject', selectedPartner)}
                      className="flex-1 py-2 px-4 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedPartner.status === 'approved' && (
                  <button
                    onClick={() => handleAction('suspend', selectedPartner)}
                    className="flex-1 py-2 px-4 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Suspend Partner
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null, partner: null })}
        onConfirm={executeAction}
        title={
          confirmModal.action === 'approve' ? 'Approve Partner' :
          confirmModal.action === 'reject' ? 'Reject Partner' :
          'Suspend Partner'
        }
        message={
          confirmModal.action === 'approve' 
            ? `Are you sure you want to approve ${confirmModal.partner?.fullName}? They will be able to submit leads immediately.`
            : confirmModal.action === 'reject'
            ? `Are you sure you want to reject ${confirmModal.partner?.fullName}? This action cannot be undone.`
            : `Are you sure you want to suspend ${confirmModal.partner?.fullName}? They will not be able to submit new leads.`
        }
        confirmLabel={
          confirmModal.action === 'approve' ? 'Approve' :
          confirmModal.action === 'reject' ? 'Reject' :
          'Suspend'
        }
        confirmVariant={
          confirmModal.action === 'approve' ? 'default' :
          confirmModal.action === 'reject' ? 'danger' :
          'warning'
        }
      />
    </AdminLayout>
  );
};

export default PartnersPage;
