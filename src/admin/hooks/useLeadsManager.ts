import { useState, useEffect } from 'react';
import { getLeads, updateLeadStatus as apiUpdateLeadStatus, assignBank as apiAssignBank } from '../../api/leadsApi';
import type { Lead, LeadStatus, LoanType } from '../types/admin';

interface UseLeadsManagerResult {
  leads: Lead[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: LeadStatus | '';
  setStatusFilter: (status: LeadStatus | '') => void;
  loanTypeFilter: LoanType | '';
  setLoanTypeFilter: (type: LoanType | '') => void;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  handleAddLead: (newLead: Lead) => void;
  handleStatusUpdate: (leadId: string, newStatus: LeadStatus, note?: string) => Promise<void>;
  handleBankAssignment: (leadId: string, bankName: string) => Promise<void>;
  filteredLeads: Lead[];
  refreshLeads: () => Promise<void>;
}

export const useLeadsManager = (): UseLeadsManagerResult => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [loanTypeFilter, setLoanTypeFilter] = useState<LoanType | ''>('');
  
  // Selection & Modals
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const response = await getLeads({}, true); // isAdmin = true
      if (response.success && response.data) {
        const apiLeads = response.data.leads.map((lead: any) => ({
          id: lead.id || lead._id,
          customerId: lead.client?.id || lead.customerId,
          customerName: lead.client?.fullName || lead.customerName,
          customerPhone: lead.client?.phone || lead.customerPhone,
          customerEmail: lead.client?.email || lead.customerEmail,
          loanType: lead.loanType,
          loanAmount: lead.loanAmount,
          partnerId: lead.partnerId || 'DIRECT',
          partnerName: lead.partnerName || 'Direct (Website)',
          status: lead.status,
          bankAssigned: lead.bankAssigned,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
          timeline: lead.timeline || [],
          documents: lead.documents || [],
          commission: lead.commission,
          preferredBank: lead.preferredBank, // Ensure this is mapped
        }));
        setLeads(apiLeads);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const refreshLeads = async () => {
    await fetchLeads();
  };

  const handleAddLead = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
    setShowAddModal(false);
  };

  const handleStatusUpdate = async (leadId: string, newStatus: LeadStatus, note?: string) => {
    try {
      const response = await apiUpdateLeadStatus(leadId, newStatus, note, true);
      
      if (response.success && response.data) {
        const updatedLead = response.data.lead;
        
        // Helper to update a lead in the list
        const updateLeadInList = (currentLead: Lead) => {
             return {
                ...currentLead,
                status: updatedLead.status as LeadStatus,
                updatedAt: updatedLead.updatedAt,
                timeline: updatedLead.timeline?.map((event: any) => ({
                  id: event.id,
                  status: event.status,
                  timestamp: event.timestamp,
                  updatedBy: event.updatedBy,
                  note: event.note,
                })) || currentLead.timeline,
                // Pick up newly created document slots (e.g. when transitioning to docs_pending)
                documents: updatedLead.documents?.length
                  ? updatedLead.documents.map((d: any) => ({
                      id: d.id,
                      type: d.type,
                      fileName: d.fileName || '',
                      fileSize: d.fileSize,
                      fileUrl: d.fileUrl,
                      mimeType: d.mimeType,
                      r2ObjectKey: d.r2ObjectKey,
                      uploadedBy: d.uploadedBy || 'Partner',
                      uploadedAt: d.uploadedAt
                        ? new Date(d.uploadedAt).toLocaleDateString()
                        : '',
                      status: d.status,
                      url: d.fileUrl,
                    }))
                  : currentLead.documents,
              };
        };

        setLeads((prev: Lead[]) => prev.map((lead: Lead) => (lead.id === leadId ? updateLeadInList(lead) : lead)));

        if (selectedLead?.id === leadId) {
          setSelectedLead((prev) => (prev ? updateLeadInList(prev) : null));
        }
      } else {
        console.error('Failed to update status:', response.message);
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  const handleBankAssignment = async (leadId: string, bankName: string) => {
    try {
      const response = await apiAssignBank(leadId, bankName, undefined, `Bank assigned: ${bankName}`);
      
      if (response.success && response.data) {
        const updatedLead = response.data.lead;

        const updateLeadInList = (currentLead: Lead) => ({
            ...currentLead,
            bankAssigned: updatedLead.bankAssigned,
            updatedAt: updatedLead.updatedAt,
            timeline: updatedLead.timeline?.map((event: any) => ({
              id: event.id,
              status: event.status,
              timestamp: event.timestamp,
              updatedBy: event.updatedBy,
              note: event.note,
            })) || currentLead.timeline,
        });

        setLeads((prev: Lead[]) => prev.map((lead: Lead) => (lead.id === leadId ? updateLeadInList(lead) : lead)));

        if (selectedLead?.id === leadId) {
           setSelectedLead((prev) => (prev ? updateLeadInList(prev) : null));
        }
      } else {
        console.error('Failed to assign bank:', response.message);
        throw new Error('Failed to assign bank');
      }
    } catch (error) {
      console.error('Error assigning bank:', error);
      throw error;
    }
  };

  const filteredLeads = leads.filter((lead) => {
    // Always exclude leads with no status (incomplete/draft data)
    if (!lead.status) return false;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (lead.customerName ?? '').toLowerCase().includes(query) ||
      (lead.customerPhone ?? '').includes(searchQuery) ||
      (lead.id ?? '').toLowerCase().includes(query);

    const matchesStatus = !statusFilter || lead.status === statusFilter;
    const matchesLoanType = !loanTypeFilter || lead.loanType === loanTypeFilter;

    return matchesSearch && matchesStatus && matchesLoanType;
  });

  return {
    leads,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    loanTypeFilter,
    setLoanTypeFilter,
    selectedLead,
    setSelectedLead,
    showAddModal,
    setShowAddModal,
    handleAddLead,
    handleStatusUpdate,
    handleBankAssignment,
    filteredLeads,
    refreshLeads
  };
};
