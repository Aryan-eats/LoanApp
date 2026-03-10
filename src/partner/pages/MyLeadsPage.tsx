import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Send, Plus } from 'lucide-react';
import { useLeadsStore } from '../../stores/leadsStore';
import { useLocalLeadsStore } from '../../stores/localLeadsStore';
import StoredClients from './StoredClients';
import SubmittedToAdminTab from './SubmittedToAdminTab';

export default function MyLeadsPage() {
  const [activeTab, setActiveTab] = useState<'local' | 'admin'>('local');

  const { leads, fetchLeads } = useLeadsStore();
  const { leads: localLeads, fetchLeads: fetchStoredClients } = useLocalLeadsStore();

  useEffect(() => {
    fetchLeads();
    fetchStoredClients();
  }, [fetchLeads, fetchStoredClients]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">My Leads</h1>
          <p className="text-slate-400 mt-2 font-medium">Manage your pipeline and track submitted leads</p>
        </div>
        <Link
          to="/partner/add-client"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 active:scale-[0.98] transition-all duration-200"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create New Lead
        </Link>
      </div>

      <div className="bg-slate-900 rounded-[24px] shadow-sm ring-1 ring-white/10 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex px-4 sm:px-6 pt-4 gap-6 sm:gap-8 overflow-x-auto border-b border-white/5 pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setActiveTab('local')}
            className={`flex flex-col items-center gap-3 group shrink-0 transition-opacity duration-200 ${
              activeTab === 'local' ? 'opacity-100' : 'opacity-50 hover:opacity-80'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className={activeTab === 'local' ? 'text-indigo-600' : 'text-slate-500'} />
              <span className={`font-bold text-base tracking-tight ${activeTab === 'local' ? 'text-indigo-600' : 'text-slate-600'}`}>
                My Clients
              </span>
              {localLeads.length > 0 && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${activeTab === 'local' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {localLeads.length}
                </span>
              )}
            </div>
            <div className={`h-1 w-full max-w-[40px] rounded-t-full transition-colors ${activeTab === 'local' ? 'bg-indigo-600' : 'bg-transparent group-hover:bg-slate-200'}`} />
          </button>
          
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-3 group shrink-0 transition-opacity duration-200 ${
              activeTab === 'admin' ? 'opacity-100' : 'opacity-50 hover:opacity-80'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send size={18} className={activeTab === 'admin' ? 'text-indigo-600' : 'text-slate-500'} />
              <span className={`font-bold text-base tracking-tight ${activeTab === 'admin' ? 'text-indigo-600' : 'text-slate-600'}`}>
                Submitted to Admin
              </span>
              {leads.length > 0 && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${activeTab === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {leads.length}
                </span>
              )}
            </div>
            <div className={`h-1 w-full max-w-[40px] rounded-t-full transition-colors ${activeTab === 'admin' ? 'bg-indigo-600' : 'bg-transparent group-hover:bg-slate-200'}`} />
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 sm:p-6 bg-slate-900/50 min-h-[400px]">
          {activeTab === 'local' && (
            <StoredClients onSubmitSuccess={() => setActiveTab('admin')} />
          )}

          {activeTab === 'admin' && (
            <SubmittedToAdminTab />
          )}
        </div>
      </div>
    </div>
  );
}
