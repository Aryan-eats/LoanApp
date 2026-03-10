import React, { useState } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Briefcase, 
  Phone, 
  Mail, 
  Calendar, 
  IndianRupee,
  Clock,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { LocalLead } from '../types/partner-dashboard';
import { buildLoanTypeLabels } from '../../data/loanProducts';
import { localStatusConfig } from './LocalLeadStatusManager';

const loanTypeLabels = buildLoanTypeLabels(true);

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

interface Props {
  lead: LocalLead;
  isOpen: boolean;
  onClose: () => void;
}

export default function LocalLeadDetailsModal({ lead, isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'banks' | 'timeline'>('overview');

  if (!isOpen) return null;

  const currentStatus = localStatusConfig[lead.localStatus];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={16} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
    { id: 'banks', label: 'Banks', icon: <Building2 size={16} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[24px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-slate-800/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">{lead.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${currentStatus.color}`}>
                  {currentStatus.label}
                </span>
                <span className="text-slate-500 text-xs font-medium">L-{(lead.id.slice(-6)).toUpperCase()}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-4 pt-4 border-b border-white/5 bg-slate-800/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold transition-all relative ${
                activeTab === tab.id ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/50">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Loan Type</p>
                  <p className="text-sm font-bold text-slate-200">{loanTypeLabels[lead.loanType] || lead.loanType}</p>
                </div>
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5 text-indigo-100">
                  <p className="text-[10px] uppercase font-bold text-indigo-500/60 tracking-widest mb-1">Loan Amount</p>
                  <p className="text-sm font-bold">{formatCurrency(lead.loanAmount)}</p>
                </div>
                <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Tenure</p>
                  <p className="text-sm font-bold text-slate-200">{lead.tenure ? `${lead.tenure} Months` : 'N/A'}</p>
                </div>
              </div>

              {/* Personal Details */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                  <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest">Client Personal Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5 px-1">
                  <InfoItem icon={<Phone size={14} />} label="Phone Number" value={lead.phone} />
                  <InfoItem icon={<Mail size={14} />} label="Email Address" value={lead.email || 'Not Provided'} />
                  <InfoItem icon={<Calendar size={14} />} label="Date of Birth" value={lead.dateOfBirth || 'Not Provided'} />
                  <InfoItem icon={<User size={14} />} label="Gender" value={lead.gender || 'Not Provided'} />
                  <InfoItem icon={<FileText size={14} />} label="PAN Number" value={lead.panNumber || 'Not Provided'} />
                  <InfoItem icon={<MapPin size={14} />} label="Location" value={`${lead.city || ''}${lead.city && lead.state ? ', ' : ''}${lead.state || ''} ${lead.pincode || ''}`.trim() || 'Not Provided'} />
                </div>
              </section>

              {/* Employment Details */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                  <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest">Professional Info</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5 px-1">
                  <InfoItem icon={<Briefcase size={14} />} label="Employment Type" value={lead.employmentType?.replace('_', ' ') || 'Not Provided'} className="capitalize" />
                  <InfoItem icon={<Building2 size={14} />} label="Company Name" value={lead.companyName || 'Not Provided'} />
                  <InfoItem icon={<IndianRupee size={14} />} label="Monthly Income" value={lead.monthlyIncome ? formatCurrency(lead.monthlyIncome) : 'Not Provided'} />
                  <InfoItem icon={<Briefcase size={14} />} label="Work Experience" value={lead.workExperience || 'Not Provided'} />
                </div>
              </section>

              {/* Notes */}
              {lead.notes && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                    <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest">Internal Notes</h3>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-[20px]">
                    <p className="text-sm text-amber-200/80 leading-relaxed italic">"{lead.notes}"</p>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-white/5">
                <FileText size={32} className="text-slate-500" />
              </div>
              <h4 className="text-lg font-bold text-slate-200 mb-2">No Documents Yet</h4>
              <p className="text-sm text-slate-500 max-w-[300px] font-medium">
                Submit this lead to admin to start the document collection and verification process.
              </p>
            </div>
          )}

          {activeTab === 'banks' && (
             <div className="flex flex-col items-center justify-center py-20 text-center">
               <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-white/5">
                 <Building2 size={32} className="text-slate-500" />
               </div>
               <h4 className="text-lg font-bold text-slate-200 mb-2">No Bank Assigned</h4>
               <p className="text-sm text-slate-500 max-w-[300px] font-medium">
                 Once submitted to admin, a suitable bank will be assigned to process this loan application.
               </p>
             </div>
          )}

          {activeTab === 'timeline' && (
            <div className="py-4">
               <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                 <div className="relative">
                   <div className="absolute -left-[24px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-4 border-slate-900 z-10" />
                   <div>
                     <p className="text-sm font-bold text-slate-200">Lead Created Locally</p>
                     <p className="text-xs text-slate-500 mt-1 font-medium italic">
                       {new Date(lead.createdAt).toLocaleDateString()} at {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </p>
                     <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                       <CheckCircle2 size={10} />
                       Initial Entry
                     </div>
                   </div>
                 </div>
                 
                 <div className="relative pb-8 opacity-40">
                    <div className="absolute -left-[22px] top-1.5 w-1.5 h-1.5 rounded-full bg-slate-700 border border-slate-900 z-10" />
                    <div>
                      <p className="text-sm font-bold text-slate-500">Submit to Admin</p>
                      <p className="text-xs text-slate-600 mt-1">Awaiting Submission</p>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-white/5 bg-slate-800/20 flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={12} className="text-indigo-500" />
            Last Updated {new Date(lead.updatedAt).toLocaleDateString()}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold transition-all border border-white/5"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, className = '' }: { icon: React.ReactNode, label: string, value: string | number, className?: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-500 shrink-0 border border-white/5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-0.5">{label}</p>
        <p className={`text-sm font-medium text-slate-200 ${className}`}>{value}</p>
      </div>
    </div>
  );
}
