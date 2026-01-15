import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lead } from '../admin/types/admin';

// Generate unique ID for new leads
const generateLeadId = () => {
  return `L${Date.now().toString(36).toUpperCase()}`;
};

// Generate unique customer ID
const generateCustomerId = () => {
  return `C${Date.now().toString(36).toUpperCase()}`;
};

interface LeadsStore {
  leads: Lead[];
  addLead: (leadData: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    city: string;
    loanType: string;
    loanSubType?: string;
    loanAmount: number;
    salaryType: string;
  }) => Lead;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  getLeadById: (id: string) => Lead | undefined;
}

export const useLeadsStore = create<LeadsStore>()(
  persist(
    (set, get) => ({
      leads: [],

      addLead: (leadData) => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const newLead: Lead = {
          id: generateLeadId(),
          customerId: generateCustomerId(),
          customerName: leadData.customerName,
          customerPhone: leadData.customerPhone,
          customerEmail: leadData.customerEmail || `${leadData.customerPhone}@placeholder.com`,
          loanType: leadData.loanType.toLowerCase().replace(/\s+/g, '_'),
          loanAmount: leadData.loanAmount,
          partnerId: 'WEBSITE',
          partnerName: 'Website Application',
          status: 'submitted',
          createdAt: dateStr,
          updatedAt: dateStr,
          timeline: [
            {
              id: 'T1',
              status: 'submitted',
              timestamp: `${dateStr} ${timeStr}`,
              updatedBy: 'System',
              note: `Applied via website. City: ${leadData.city}. Employment: ${leadData.salaryType}${leadData.loanSubType ? `. Sub-type: ${leadData.loanSubType}` : ''}`,
            },
          ],
          documents: [],
        };

        set((state) => ({
          leads: [newLead, ...state.leads],
        }));

        return newLead;
      },

      updateLead: (id, updates) => {
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === id
              ? { ...lead, ...updates, updatedAt: new Date().toISOString().split('T')[0] }
              : lead
          ),
        }));
      },

      deleteLead: (id) => {
        set((state) => ({
          leads: state.leads.filter((lead) => lead.id !== id),
        }));
      },

      getLeadById: (id) => {
        return get().leads.find((lead) => lead.id === id);
      },
    }),
    {
      name: 'leads-storage',
    }
  )
);
