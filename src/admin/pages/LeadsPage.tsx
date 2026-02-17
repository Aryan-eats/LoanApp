import React from 'react';
import AdminLayout from '../components/AdminLayout';
import { useLeadsManager } from '../hooks/useLeadsManager';
import LeadsFilters from '../components/leads/LeadsFilters';
import LeadsTable from '../components/leads/LeadsTable';
import LeadDetailsModal from '../components/leads/LeadDetailsModal';
import AddLeadModal from '../components/leads/AddLeadModal';

const LeadsPage: React.FC = () => {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    loanTypeFilter,
    setLoanTypeFilter,
    selectedLead,
    setSelectedLead,
    handleStatusUpdate,
    handleBankAssignment,
    filteredLeads,
    showAddModal,
    setShowAddModal,
    refreshLeads,
  } = useLeadsManager();

  return (
    <AdminLayout onAddLead={() => setShowAddModal(true)}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and track all loan applications</p>
      </div>

      <LeadsFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loanTypeFilter={loanTypeFilter}
        setLoanTypeFilter={setLoanTypeFilter}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <LeadsTable
          leads={filteredLeads}
          onLeadClick={setSelectedLead}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusUpdate={handleStatusUpdate}
          onBankAssign={handleBankAssignment}
        />
      )}
      
      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={refreshLeads}
      />

    </AdminLayout>
  );
};

export default LeadsPage;
