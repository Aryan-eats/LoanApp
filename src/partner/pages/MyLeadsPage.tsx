import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, FolderOpen, Send } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Leads</h1>
          <p className="text-slate-500 mt-1">Manage your pipeline and track submitted leads</p>
        </div>
        <Link
          to="/partner/add-client"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <FileText size={16} />
          New Lead
        </Link>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('local')}
          className={`relative px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'local'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <FolderOpen size={16} />
            My Clients
          </span>
          {localLeads.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
              {localLeads.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`relative px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'admin'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Send size={16} />
            Submitted
          </span>
          {leads.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
              {leads.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'local' && (
        <StoredClients onSubmitSuccess={() => setActiveTab('admin')} />
      )}

      {activeTab === 'admin' && (
        <SubmittedToAdminTab />
      )}
    </div>
  );
}
