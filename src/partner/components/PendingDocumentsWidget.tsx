import { useMemo } from 'react';
import type { Lead } from '../types/partner-dashboard';
import { FileWarning, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PendingDocumentsWidgetProps {
  leads: Lead[];
}

export default function PendingDocumentsWidget({ leads }: PendingDocumentsWidgetProps) {
  const pendingDocs = useMemo(() => {
    const list: { id: string, name: string, missingDoc: string, daysPending: number }[] = [];
    const now = new Date();

    leads.forEach(l => {
      if (l.status === 'docs_pending') {
        const days = Math.floor((now.getTime() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        // Find missing docs from lead.documents
        const uploadedTypes = l.documents.map(d => d.type);
        const requiredTypes = ['pan_card', 'aadhaar_front', 'bank_statement']; // simple heuristic for presentation
        const missing = requiredTypes.find(t => !uploadedTypes.includes(t as any)) || 'Required Document';
        const formattedMissing = missing.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        list.push({
          id: l.id,
          name: l.client.fullName,
          missingDoc: formattedMissing,
          daysPending: days
        });
      }
    });

    return list.sort((a, b) => b.daysPending - a.daysPending).slice(0, 5);
  }, [leads]);

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-white/10 p-5 flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <FileWarning size={18} />
          </div>
          <h3 className="text-lg font-semibold text-slate-100">Pending Documents</h3>
        </div>
        <Link to="/partner/leads" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
          View all
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pr-4 font-medium">Client</th>
              <th className="pb-3 px-4 font-medium">Missing Document</th>
              <th className="pb-3 pl-4 font-medium whitespace-nowrap">Days Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pendingDocs.length > 0 ? (
              pendingDocs.map(doc => (
                <tr key={doc.id} className="group hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                        {doc.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-200 text-sm whitespace-nowrap">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20 whitespace-nowrap">
                      {doc.missingDoc}
                    </span>
                  </td>
                  <td className="py-3 pl-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-sm font-semibold flex items-center gap-1.5 ${doc.daysPending > 3 ? 'text-red-400' : 'text-slate-400'}`}>
                        <Clock size={14} className={doc.daysPending > 3 ? 'text-red-400' : 'text-slate-500'} />
                        {doc.daysPending} {doc.daysPending === 1 ? 'day' : 'days'}
                      </span>
                      <Link to={`/partner/documents/${doc.id}`} className="text-slate-500 group-hover:text-indigo-400 transition-colors bg-white/5 p-1 rounded-md border border-white/10 shadow-sm group-hover:border-indigo-500/30">
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-500">
                  <FileWarning size={28} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">No pending documents</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
