import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import StatusBadge from '../../components/shared/StatusBadge';
import { getBankById, toggleBankStatus, updateBank } from '../../api/banksApi';
import type { BankFromApi, BankCommissionRate } from '../../api/banksApi';
import { buildLoanTypeLabels, loanProducts, categoryLabels, categoryOrder, getProductsByCategory } from '../../data/loanProductsData';
import type { LoanCategory } from '../../data/loanProductsData';

const loanTypeLabels = buildLoanTypeLabels(true);

// Build category options for the commission dropdown (main categories only)
const categoryOptions = categoryOrder.map(cat => ({ value: cat, label: categoryLabels[cat] }));

// Build a lookup that resolves both individual loan codes and category codes to a label
function getLoanDisplayLabel(code: string): string {
  // Check if it's a category code
  if (categoryLabels[code as LoanCategory]) return categoryLabels[code as LoanCategory];
  // Check if it's an individual loan code
  if (loanTypeLabels[code]) return loanTypeLabels[code];
  return code;
}

// Group products by category for the supported loan types section
const categoriesWithProducts = categoryOrder
  .map(cat => ({ category: cat, label: categoryLabels[cat], products: getProductsByCategory(cat) }))
  .filter(g => g.products.length > 0);

// Map individual loan codes → parent category code so existing DB values resolve in the dropdown
const loanCodeToCategory: Record<string, string> = {};
for (const product of loanProducts) {
  loanCodeToCategory[product.code] = product.category;
}

function formatAmount(val: string | null): string {
  if (!val) return '—';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

// -- Editable field helpers ----------------------------------------------------

interface EditableFieldProps {
  label: string;
  value: string;
  editing: boolean;
  onChange: (val: string) => void;
  type?: 'text' | 'number' | 'email' | 'tel';
  className?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, value, editing, onChange, type = 'text', className = '' }) => (
  <div className={className}>
    <label className="block text-xs text-gray-500 mb-1">{label}</label>
    {editing ? (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    ) : (
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    )}
  </div>
);

// -- Editable commission rate row ----------------------------------------------

interface CommissionRowData {
  loanType: string;
  partnerCommission: string;
  interestRate: string;
  minAmount: string;
  maxAmount: string;
  maxTenure: string;
}

function apiRateToRow(r: BankCommissionRate): CommissionRowData {
  // Map individual loan codes (e.g. 'home_loan') to their parent category ('home')
  const mappedType = loanCodeToCategory[r.loanType] || r.loanType;
  return {
    loanType: mappedType,
    partnerCommission: r.partnerCommission,
    interestRate: r.interestRate || '',
    minAmount: r.minAmount || '',
    maxAmount: r.maxAmount || '',
    maxTenure: r.maxTenure?.toString() || '',
  };
}

// -- Main Component ------------------------------------------------------------

const BankManagePage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();

  const [bank, setBank] = useState<BankFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable form state
  const [form, setForm] = useState({
    name: '', code: '', processingFee: '', processingTime: '',
    interestRateMin: '', interestRateMax: '',
    maxTenure: '', minAmount: '', maxAmount: '',
    avgTat: '', activeLeads: '', approvalRate: '', totalDisbursed: '',
    contactPerson: '', contactEmail: '', contactPhone: '',
    isPopular: false,
    features: [] as string[],
    supportedLoanTypes: [] as string[],
  });
  const [commissionRows, setCommissionRows] = useState<CommissionRowData[]>([]);
  const [newFeature, setNewFeature] = useState('');

  // -- Load data --
  const loadBank = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await getBankById(id);
      if (response.success && response.data?.bank) {
        setBank(response.data.bank);
        populateForm(response.data.bank);
      } else {
        setError('Bank not found');
      }
    } catch {
      setError('Failed to load bank data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (bankId) loadBank(bankId); }, [bankId, loadBank]);

  const populateForm = (b: BankFromApi) => {
    setForm({
      name: b.name, code: b.code,
      processingFee: b.processingFee, processingTime: b.processingTime,
      interestRateMin: b.interestRateMin, interestRateMax: b.interestRateMax,
      maxTenure: b.maxTenure.toString(), minAmount: b.minAmount, maxAmount: b.maxAmount,
      avgTat: b.avgTat.toString(), activeLeads: b.activeLeads.toString(),
      approvalRate: b.approvalRate.toString(), totalDisbursed: b.totalDisbursed,
      contactPerson: b.contactPerson, contactEmail: b.contactEmail, contactPhone: b.contactPhone,
      isPopular: b.isPopular,
      features: [...b.features],
      supportedLoanTypes: [...b.supportedLoanTypes],
    });
    setCommissionRows(b.commissionRates.map(apiRateToRow));
  };

  // -- Handlers --
  const handleToggleStatus = async () => {
    if (!bank) return;
    const newStatus = bank.status === 'active' ? 'inactive' : 'active';
    setTogglingStatus(true);
    try {
      const response = await toggleBankStatus(bank.id, newStatus);
      if (response.success && response.data?.bank) { setBank(response.data.bank); }
    } catch { setBank({ ...bank, status: newStatus }); }
    finally { setTogglingStatus(false); }
  };

  const handleCancel = () => {
    if (bank) populateForm(bank);
    setEditing(false);
    setSaveMsg(null);
  };

  const handleSave = async () => {
    if (!bank) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        code: form.code,
        processingFee: form.processingFee,
        processingTime: form.processingTime,
        interestRateMin: parseFloat(form.interestRateMin) || 0,
        interestRateMax: parseFloat(form.interestRateMax) || 0,
        maxTenure: parseInt(form.maxTenure) || 0,
        minAmount: parseFloat(form.minAmount) || 0,
        maxAmount: parseFloat(form.maxAmount) || 0,
        avgTat: parseInt(form.avgTat) || 0,
        activeLeads: parseInt(form.activeLeads) || 0,
        approvalRate: parseInt(form.approvalRate) || 0,
        totalDisbursed: form.totalDisbursed,
        contactPerson: form.contactPerson,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        isPopular: form.isPopular,
        features: form.features,
        supportedLoanTypes: form.supportedLoanTypes,
        commissionRates: commissionRows.map(r => ({
          loanType: r.loanType,
          partnerCommission: parseFloat(r.partnerCommission) || 0,
          interestRate: r.interestRate || null,
          minAmount: r.minAmount ? parseFloat(r.minAmount) : null,
          maxAmount: r.maxAmount ? parseFloat(r.maxAmount) : null,
          maxTenure: r.maxTenure ? parseInt(r.maxTenure) : null,
        })),
      };

      const response = await updateBank(bank.id, payload);
      if (response.success && response.data?.bank) {
        setBank(response.data.bank);
        populateForm(response.data.bank);
        setEditing(false);
        setSaveMsg({ type: 'success', text: 'Bank updated successfully' });
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        setSaveMsg({ type: 'error', text: response.message || 'Update failed' });
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const setFormField = (key: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // -- Commission row helpers --
  const updateCommissionRow = (idx: number, field: keyof CommissionRowData, value: string) => {
    setCommissionRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeCommissionRow = (idx: number) => {
    setCommissionRows(prev => prev.filter((_, i) => i !== idx));
  };

  const addCommissionRow = () => {
    setCommissionRows(prev => [...prev, {
      loanType: '', partnerCommission: '0', interestRate: '', minAmount: '', maxAmount: '', maxTenure: '',
    }]);
  };

  // -- Feature helpers --
  const addFeature = () => {
    if (newFeature.trim()) {
      setForm(prev => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
      setNewFeature('');
    }
  };

  const removeFeature = (idx: number) => {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  // -- Supported loan type helpers --
  const toggleLoanType = (code: string) => {
    setForm(prev => {
      const has = prev.supportedLoanTypes.includes(code);
      return {
        ...prev,
        supportedLoanTypes: has
          ? prev.supportedLoanTypes.filter(t => t !== code)
          : [...prev.supportedLoanTypes, code],
      };
    });
  };

  // -- Render --
  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4"><div className="w-10 h-10 bg-gray-200 rounded-lg" /><div><div className="h-6 w-48 bg-gray-200 rounded mb-1" /><div className="h-4 w-32 bg-gray-200 rounded" /></div></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-5"><div className="h-4 w-20 bg-gray-200 rounded mb-2" /><div className="h-7 w-16 bg-gray-200 rounded" /></div>)}</div>
          <div className="bg-white rounded-xl border border-gray-200 p-6"><div className="h-5 w-40 bg-gray-200 rounded mb-4" /><div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}</div></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !bank) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          <p className="text-lg text-gray-500 mb-4">{error || 'Bank not found'}</p>
          <button onClick={() => navigate('/admin/banks')} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">Back to Banks</button>
        </div>
      </AdminLayout>
    );
  }

  const initials = bank.name.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/admin/banks')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Banks
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-bold text-gray-600">{initials}</div>
            <div>
              <div className="flex items-center gap-3">
                {editing ? (
                  <input value={form.name} onChange={(e) => setFormField('name', e.target.value)} className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent" />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">{bank.name}</h1>
                )}
                <StatusBadge status={bank.status} variant="admin" />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Code: {editing ? (
                  <input value={form.code} onChange={(e) => setFormField('code', e.target.value)} className="text-sm text-gray-700 border-b border-blue-400 focus:outline-none bg-transparent w-20 ml-1" />
                ) : bank.code} · {bank.isPopular ? '⭐ Popular · ' : ''}Created {new Date(bank.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Edit Bank
              </button>
            )}
            <button
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${bank.status === 'active' ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
            >
              {togglingStatus ? 'Updating...' : bank.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${saveMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {saveMsg.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <EditableField label="Average TAT (days)" value={form.avgTat} editing={editing} onChange={(v) => setFormField('avgTat', v)} type="number" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <EditableField label="Approval Rate (%)" value={form.approvalRate} editing={editing} onChange={(v) => setFormField('approvalRate', v)} type="number" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <EditableField label="Active Leads" value={form.activeLeads} editing={editing} onChange={(v) => setFormField('activeLeads', v)} type="number" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <EditableField label="Total Disbursed" value={form.totalDisbursed} editing={editing} onChange={(v) => setFormField('totalDisbursed', v)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Commission Rates Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Loan Products & Commission Rates</h2>
                <p className="text-xs text-gray-500 mt-0.5">{commissionRows.length} loan products configured</p>
              </div>
              {editing && (
                <button onClick={addCommissionRow} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Product
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Min Amt</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Max Amt</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    {editing && <th className="px-4 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {commissionRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {editing ? (
                          <select value={row.loanType} onChange={(e) => updateCommissionRow(idx, 'loanType', e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Category</option>
                            {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <span className="font-medium text-gray-900">{getLoanDisplayLabel(row.loanType)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editing ? (
                          <input value={row.interestRate} onChange={(e) => updateCommissionRow(idx, 'interestRate', e.target.value)} className="w-28 text-sm border border-gray-300 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 8-12%" />
                        ) : (
                          <span className="text-gray-600">{row.interestRate || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editing ? (
                          <input type="number" value={row.minAmount} onChange={(e) => updateCommissionRow(idx, 'minAmount', e.target.value)} className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min" />
                        ) : (
                          <span className="text-gray-600">{formatAmount(row.minAmount)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editing ? (
                          <input type="number" value={row.maxAmount} onChange={(e) => updateCommissionRow(idx, 'maxAmount', e.target.value)} className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Max" />
                        ) : (
                          <span className="text-gray-600">{formatAmount(row.maxAmount)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editing ? (
                          <input type="number" value={row.maxTenure} onChange={(e) => updateCommissionRow(idx, 'maxTenure', e.target.value)} className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Months" />
                        ) : (
                          <span className="text-gray-600">{row.maxTenure ? `${row.maxTenure} mo` : '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editing ? (
                          <input type="number" step="0.1" value={row.partnerCommission} onChange={(e) => updateCommissionRow(idx, 'partnerCommission', e.target.value)} className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="%" />
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">{parseFloat(row.partnerCommission).toFixed(1)}%</span>
                        )}
                      </td>
                      {editing && (
                        <td className="px-4 py-3">
                          <button onClick={() => removeCommissionRow(idx)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {commissionRows.length === 0 && (
                    <tr>
                      <td colSpan={editing ? 7 : 6} className="px-4 py-8 text-center text-sm text-gray-400">No commission rates configured</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supported Loan Types - Category-wise */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Supported Loan Types</h2>
              <p className="text-xs text-gray-500 mt-0.5">{form.supportedLoanTypes.length} loan types selected across {categoriesWithProducts.filter(g => g.products.some(p => form.supportedLoanTypes.includes(p.code))).length} categories</p>
            </div>
            <div className="divide-y divide-gray-200">
              {categoriesWithProducts.map(group => {
                const groupCodes = group.products.map(p => p.code);
                const selectedInGroup = groupCodes.filter(c => form.supportedLoanTypes.includes(c));
                const allSelected = selectedInGroup.length === groupCodes.length;
                const someSelected = selectedInGroup.length > 0;

                return (
                  <div key={group.category}>
                    {/* Category header */}
                    <div className={`px-6 py-3 flex items-center justify-between ${someSelected ? 'bg-blue-50/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        {editing && (
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={() => {
                              if (allSelected) {
                                setForm(prev => ({ ...prev, supportedLoanTypes: prev.supportedLoanTypes.filter(t => !groupCodes.includes(t)) }));
                              } else {
                                setForm(prev => ({ ...prev, supportedLoanTypes: [...new Set([...prev.supportedLoanTypes, ...groupCodes])] }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${someSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                        {selectedInGroup.length}/{groupCodes.length}
                      </span>
                    </div>
                    {/* Subtypes */}
                    <div className="px-6 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {group.products.map(product => {
                          const checked = form.supportedLoanTypes.includes(product.code);
                          return editing ? (
                            <label key={product.code} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${checked ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleLoanType(product.code)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                              {product.shortLabel || product.label}
                            </label>
                          ) : (
                            <div key={product.code} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${checked ? 'text-gray-900' : 'text-gray-400'}`}>
                              {checked ? (
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              ) : (
                                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              )}
                              {product.shortLabel || product.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <EditableField label="Contact Person" value={form.contactPerson} editing={editing} onChange={(v) => setFormField('contactPerson', v)} />
              <EditableField label="Email" value={form.contactEmail} editing={editing} onChange={(v) => setFormField('contactEmail', v)} type="email" />
              <EditableField label="Phone" value={form.contactPhone} editing={editing} onChange={(v) => setFormField('contactPhone', v)} type="tel" />
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Bank Details</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Interest Min (%)" value={form.interestRateMin} editing={editing} onChange={(v) => setFormField('interestRateMin', v)} type="number" />
                <EditableField label="Interest Max (%)" value={form.interestRateMax} editing={editing} onChange={(v) => setFormField('interestRateMax', v)} type="number" />
              </div>
              <EditableField label="Processing Fee" value={form.processingFee} editing={editing} onChange={(v) => setFormField('processingFee', v)} />
              <EditableField label="Processing Time" value={form.processingTime} editing={editing} onChange={(v) => setFormField('processingTime', v)} />
              <EditableField label="Max Tenure (months)" value={form.maxTenure} editing={editing} onChange={(v) => setFormField('maxTenure', v)} type="number" />
              <div className="grid grid-cols-2 gap-3">
                <EditableField label="Min Amount (₹)" value={form.minAmount} editing={editing} onChange={(v) => setFormField('minAmount', v)} type="number" />
                <EditableField label="Max Amount (₹)" value={form.maxAmount} editing={editing} onChange={(v) => setFormField('maxAmount', v)} type="number" />
              </div>
              {editing && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPopular} onChange={(e) => setFormField('isPopular', e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Mark as Popular</span>
                </label>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Key Features</h2>
            <div className="space-y-2.5">
              {form.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {editing ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input value={feature} onChange={(e) => setForm(prev => ({ ...prev, features: prev.features.map((f, i) => i === idx ? e.target.value : f) }))} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button onClick={() => removeFeature(idx)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-700">{feature}</span>
                  )}
                </div>
              ))}
              {editing && (
                <div className="flex items-center gap-2 pt-2">
                  <input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFeature()} placeholder="Add a feature..." className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={addFeature} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Add</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BankManagePage;
