/**
 * Leads Store with Backend Integration
 * 
 * Zustand store that syncs with the backend API.
 * Uses frontend Lead types from partner-dashboard.ts.
 */

import { create } from 'zustand';
import * as leadsApi from '../api/leadsApi';
import type { Lead, LeadStatus, LeadsQueryParams, LeadStatsResponse, CreateLeadData } from '../api/leadsApi';

export type { Lead, LeadStatus, CreateLeadData };

interface LeadsState {
  leads: Lead[];
  selectedLead: Lead | null;
  stats: LeadStatsResponse['stats'] | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  isLoading: boolean;
  error: string | null;
  filters: LeadsQueryParams;
}

interface LeadsActions {
  // Fetch actions
  fetchLeads: (params?: LeadsQueryParams, isAdmin?: boolean) => Promise<void>;
  fetchLeadById: (id: string, isAdmin?: boolean) => Promise<Lead | null>;
  fetchStats: (isAdmin?: boolean) => Promise<void>;
  
  // CRUD actions
  createLead: (data: CreateLeadData) => Promise<Lead | null>;
  updateLead: (id: string, data: Partial<Lead>, isAdmin?: boolean) => Promise<Lead | null>;
  deleteLead: (id: string) => Promise<boolean>;
  
  // Status actions
  updateStatus: (id: string, status: LeadStatus, note?: string, isAdmin?: boolean) => Promise<Lead | null>;
  assignBank: (id: string, bankName: string, bankLogo?: string, note?: string) => Promise<Lead | null>;
  
  // Local actions
  setSelectedLead: (lead: Lead | null) => void;
  setFilters: (filters: LeadsQueryParams) => void;
  clearError: () => void;
  reset: () => void;
}

type LeadsStore = LeadsState & LeadsActions;

const initialState: LeadsState = {
  leads: [],
  selectedLead: null,
  stats: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  isLoading: false,
  error: null,
  filters: {},
};

export const useLeadsStore = create<LeadsStore>()((set, get) => ({
  ...initialState,

  // Fetch leads from API
  fetchLeads: async (params = {}, isAdmin = false) => {
    set({ isLoading: true, error: null });
    try {
      const mergedParams = { ...get().filters, ...params };
      const response = await leadsApi.getLeads(mergedParams, isAdmin);
      
      if (response.success && response.data) {
        set({
          leads: response.data.leads,
          pagination: response.data.pagination,
          isLoading: false,
        });
      } else {
        set({ error: 'Failed to fetch leads', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch leads',
        isLoading: false,
      });
    }
  },

  // Fetch single lead
  fetchLeadById: async (id, isAdmin = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await leadsApi.getLeadById(id, isAdmin);
      
      if (response.success && response.data) {
        set({ selectedLead: response.data.lead, isLoading: false });
        return response.data.lead;
      }
      set({ error: 'Lead not found', isLoading: false });
      return null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch lead',
        isLoading: false,
      });
      return null;
    }
  },

  // Fetch stats
  fetchStats: async (isAdmin = false) => {
    try {
      const response = await leadsApi.getLeadStats(isAdmin);
      
      if (response.success && response.data) {
        set({ stats: response.data.stats });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },

  // Create new lead
  createLead: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await leadsApi.createLead(data);
      
      if (response.success && response.data) {
        // Add to local state
        set((state) => ({
          leads: [response.data!.lead, ...state.leads],
          pagination: {
            ...state.pagination,
            total: state.pagination.total + 1,
          },
          isLoading: false,
        }));
        return response.data.lead;
      }
      set({ error: response.message || 'Failed to create lead', isLoading: false });
      return null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create lead',
        isLoading: false,
      });
      return null;
    }
  },

  // Update lead
  updateLead: async (id, data, isAdmin = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await leadsApi.updateLead(id, data, isAdmin);
      
      if (response.success && response.data) {
        // Update local state
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id ? response.data!.lead : lead
          ),
          selectedLead: state.selectedLead?.id === id ? response.data!.lead : state.selectedLead,
          isLoading: false,
        }));
        return response.data.lead;
      }
      set({ error: response.message || 'Failed to update lead', isLoading: false });
      return null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update lead',
        isLoading: false,
      });
      return null;
    }
  },

  // Delete lead
  deleteLead: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await leadsApi.deleteLead(id);
      
      if (response.success) {
        set((state) => ({
          leads: state.leads.filter((lead) => lead.id !== id),
          selectedLead: state.selectedLead?.id === id ? null : state.selectedLead,
          pagination: {
            ...state.pagination,
            total: state.pagination.total - 1,
          },
          isLoading: false,
        }));
        return true;
      }
      set({ error: response.message || 'Failed to delete lead', isLoading: false });
      return false;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete lead',
        isLoading: false,
      });
      return false;
    }
  },

  // Update status
  updateStatus: async (id, status, note, isAdmin = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await leadsApi.updateLeadStatus(id, status, note, isAdmin);
      
      if (response.success && response.data) {
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id ? response.data!.lead : lead
          ),
          selectedLead: state.selectedLead?.id === id ? response.data!.lead : state.selectedLead,
          isLoading: false,
        }));
        return response.data.lead;
      }
      set({ error: response.message || 'Failed to update status', isLoading: false });
      return null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update status',
        isLoading: false,
      });
      return null;
    }
  },

  // Assign bank
  assignBank: async (id, bankName, bankLogo, note) => {
    set({ isLoading: true, error: null });
    try {
      const response = await leadsApi.assignBank(id, bankName, bankLogo, note);
      
      if (response.success && response.data) {
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id ? response.data!.lead : lead
          ),
          selectedLead: state.selectedLead?.id === id ? response.data!.lead : state.selectedLead,
          isLoading: false,
        }));
        return response.data.lead;
      }
      set({ error: response.message || 'Failed to assign bank', isLoading: false });
      return null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to assign bank',
        isLoading: false,
      });
      return null;
    }
  },

  // Local actions
  setSelectedLead: (lead) => set({ selectedLead: lead }),
  
  setFilters: (filters) => set({ filters }),
  
  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}));

export default useLeadsStore;
