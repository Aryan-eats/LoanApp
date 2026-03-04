/**
 * Stored Clients Store (backed by PartnerData DB table)
 *
 * Zustand store that persists partner-managed leads to the backend.
 * On first load after upgrade it migrates any leftover localStorage data
 * to the database so no data is lost.
 */

import { create } from 'zustand';
import type { LocalLead, LocalLeadStatus } from '../partner/types/partner-dashboard';
import * as partnerDataApi from '../api/partnerDataApi';
import * as leadsApi from '../api/leadsApi';
import type { CreateLeadData } from '../api/leadsApi';

export type { LocalLead, LocalLeadStatus };

// ---- localStorage migration helpers ----------------------------------------

const LS_KEY = 'partner-local-leads';
const LS_MIGRATED_KEY = 'partner-local-leads-migrated';

/**
 * Read any leads that were previously stored in localStorage
 * by the old Zustand persist middleware.
 */
function readLegacyLocalStorageLeads(): LocalLead[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Zustand persist wraps state in { state: { leads: [...] }, version: 0 }
    const leads = parsed?.state?.leads;
    return Array.isArray(leads) ? leads : [];
  } catch {
    return [];
  }
}

function markLocalStorageMigrated() {
  localStorage.setItem(LS_MIGRATED_KEY, 'true');
  localStorage.removeItem(LS_KEY);
}

function isLocalStorageMigrated(): boolean {
  return localStorage.getItem(LS_MIGRATED_KEY) === 'true' || !localStorage.getItem(LS_KEY);
}

// ---- Store types -----------------------------------------------------------

interface LocalLeadsState {
  leads: LocalLead[];
  isLoading: boolean;
  hasFetched: boolean;
}

interface LocalLeadsActions {
  /** Fetch all stored clients from the backend */
  fetchLeads: () => Promise<void>;
  /** Add a new stored client (persists to DB) */
  addLead: (data: Omit<LocalLead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LocalLead | null>;
  /** Update status (persists to DB) */
  updateStatus: (id: string, status: LocalLeadStatus) => void;
  /** Update notes (persists to DB) */
  updateNotes: (id: string, notes: string) => void;
  /** Delete a stored client (persists to DB) */
  deleteLead: (id: string) => void;
  /**
   * Submit a stored client to admin as a formal Lead.
   * On success the stored client is deleted from PartnerData.
   */
  submitToAdmin: (id: string) => Promise<import('../partner/types/partner-dashboard').Lead | null>;
}

type LocalLeadsStore = LocalLeadsState & LocalLeadsActions;

// ---- Store implementation --------------------------------------------------

export const useLocalLeadsStore = create<LocalLeadsStore>()((set, get) => ({
  leads: [],
  isLoading: false,
  hasFetched: false,

  fetchLeads: async () => {
    // Don't refetch if we already have data (unless called explicitly)
    if (get().isLoading) return;
    set({ isLoading: true });

    try {
      // 1. Migrate any leftover localStorage data first
      if (!isLocalStorageMigrated()) {
        const legacyLeads = readLegacyLocalStorageLeads();
        if (legacyLeads.length > 0) {
          try {
            await partnerDataApi.bulkCreateStoredClients(
              legacyLeads.map((l) => ({
                fullName: l.fullName,
                phone: l.phone,
                email: l.email,
                dateOfBirth: l.dateOfBirth,
                gender: l.gender,
                panNumber: l.panNumber,
                employmentType: l.employmentType,
                monthlyIncome: l.monthlyIncome,
                companyName: l.companyName,
                designation: l.designation,
                workExperience: l.workExperience,
                city: l.city,
                pincode: l.pincode,
                state: l.state,
                currentAddress: l.currentAddress,
                residenceType: l.residenceType,
                loanCategory: l.loanCategory,
                loanType: l.loanType,
                loanAmount: l.loanAmount,
                tenure: l.tenure,
                loanPurpose: l.loanPurpose,
                localStatus: l.localStatus,
                notes: l.notes,
                createdAt: l.createdAt,
              }))
            );
            markLocalStorageMigrated();
          } catch (err) {
            console.error('Failed to migrate localStorage leads to DB. Will retry next load.', err);
            // Don't mark as migrated so we retry next time
          }
        } else {
          // Nothing to migrate, mark done
          markLocalStorageMigrated();
        }
      }

      // 2. Fetch from backend
      const res = await partnerDataApi.getStoredClients();
      if (res.success && res.data) {
        set({ leads: res.data, hasFetched: true });
      }
    } catch (err) {
      console.error('fetchLeads (stored clients) error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addLead: async (data) => {
    try {
      const res = await partnerDataApi.createStoredClient({
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        panNumber: data.panNumber,
        employmentType: data.employmentType,
        monthlyIncome: data.monthlyIncome,
        companyName: data.companyName,
        designation: data.designation,
        workExperience: data.workExperience,
        city: data.city,
        pincode: data.pincode,
        state: data.state,
        currentAddress: data.currentAddress,
        residenceType: data.residenceType,
        loanCategory: data.loanCategory,
        loanType: data.loanType,
        loanAmount: data.loanAmount,
        tenure: data.tenure,
        loanPurpose: data.loanPurpose,
        localStatus: data.localStatus,
        notes: data.notes,
      });

      if (res.success && res.data) {
        const lead = res.data;
        set((state) => ({ leads: [lead, ...state.leads] }));
        return lead;
      }
      return null;
    } catch (err) {
      console.error('addLead error:', err);
      return null;
    }
  },

  updateStatus: async (id, status) => {
    // Optimistic update
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, localStatus: status, updatedAt: new Date().toISOString() } : l
      ),
    }));

    try {
      await partnerDataApi.updateStoredClientStatus(id, status);
    } catch (err) {
      console.error('updateStatus error:', err);
      // Revert by refetching
      get().fetchLeads();
    }
  },

  updateNotes: async (id, notes) => {
    // Optimistic update
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, notes, updatedAt: new Date().toISOString() } : l
      ),
    }));

    try {
      await partnerDataApi.updateStoredClientNotes(id, notes);
    } catch (err) {
      console.error('updateNotes error:', err);
      get().fetchLeads();
    }
  },

  deleteLead: async (id) => {
    // Optimistic remove
    const prev = get().leads;
    set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }));

    try {
      await partnerDataApi.deleteStoredClient(id);
    } catch (err) {
      console.error('deleteLead error:', err);
      // Revert
      set({ leads: prev });
    }
  },

  submitToAdmin: async (id) => {
    const lead = get().leads.find((l) => l.id === id);
    if (!lead) return null;

    const payload: CreateLeadData = {
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email || 'not-provided@placeholder.com',
      dateOfBirth: lead.dateOfBirth,
      panNumber: lead.panNumber,
      employmentType: lead.employmentType,
      monthlyIncome: lead.monthlyIncome,
      companyName: lead.companyName,
      city: lead.city,
      pincode: lead.pincode,
      loanType: lead.loanType,
      loanAmount: lead.loanAmount,
      tenure: lead.tenure,
    };

    try {
      const response = await leadsApi.createLead(payload, true);
      if (response.success && response.data) {
        // Delete from stored clients table now that it lives as a lead
        await partnerDataApi.deleteStoredClient(id);
        set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }));
        return response.data.lead;
      }
      return null;
    } catch {
      return null;
    }
  },
}));
