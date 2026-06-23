import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Clock,
  Info,
  Percent,
  Search,
  Shield,
  XCircle,
} from 'lucide-react';
import { runSoftCheck, type SoftCheckResult } from '../../api/partnerDataApi';

type EligibilityFormData = {
  clientName: string;
  phone: string;
  monthlyIncome: string;
  employmentType: string;
  loanType: string;
  loanAmount: string;
  existingEMI: string;
  consentCredit: boolean;
};

const formatCurrency = (amount: number): string => {
  if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(2)} L`;
  return `Rs ${amount.toLocaleString('en-IN')}`;
};

const softCheckCopy =
  "This preliminary eligibility check uses declared information and lender rules. It does not affect the client's credit score. Final approval may require lender verification and a hard inquiry.";

export default function CreditCheckPage() {
  const location = useLocation();
  const clientData = (location.state as { clientData?: Record<string, unknown> } | null)?.clientData;
  const [formData, setFormData] = useState<EligibilityFormData>({
    clientName: String(clientData?.fullName ?? ''),
    phone: String(clientData?.phone ?? ''),
    monthlyIncome: String(clientData?.monthlyIncome ?? ''),
    employmentType: String(clientData?.employmentType ?? ''),
    loanType: String(clientData?.loanType ?? ''),
    loanAmount: String(clientData?.loanAmount ?? ''),
    existingEMI: '',
    consentCredit: Boolean(clientData?.consentCredit),
  });
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<SoftCheckResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = (field: keyof EligibilityFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canRun =
    formData.clientName &&
    formData.phone &&
    formData.monthlyIncome &&
    formData.employmentType &&
    formData.loanType &&
    formData.loanAmount &&
    formData.consentCredit &&
    !isChecking;

  const handleCheckEligibility = async () => {
    setIsChecking(true);
    setSubmitError(null);

    try {
      const response = await runSoftCheck({
        fullName: formData.clientName,
        phone: formData.phone,
        monthlyIncome: Number(formData.monthlyIncome),
        existingEMI: Number(formData.existingEMI || 0),
        employmentType: formData.employmentType,
        loanType: formData.loanType,
        loanAmount: Number(formData.loanAmount),
        consentCredit: formData.consentCredit,
      });

      if (!response.success || !response.data) {
        setSubmitError(response.message || 'Failed to run soft check');
        return;
      }

      setResult(response.data);
    } catch (error) {
      const { parseApiError } = await import('../../utils/parseApiError');
      setSubmitError(parseApiError(error, 'Failed to run soft check'));
    } finally {
      setIsChecking(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Eligibility Result</h1>
            <p className="mt-1 text-slate-400">Soft check completed for {formData.clientName}</p>
          </div>
          <button
            onClick={() => setResult(null)}
            className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-slate-100"
          >
            Check Another Client
          </button>
        </div>

        <div className="flex gap-3 rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4">
          <Shield className="shrink-0 text-indigo-400" size={20} />
          <div>
            <p className="text-sm font-medium text-indigo-300">Soft Check - No Credit Impact</p>
            <p className="mt-1 text-sm text-indigo-200/80">{softCheckCopy}</p>
          </div>
        </div>

        <div className={`rounded-xl border p-6 ${result.isEligible ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${result.isEligible ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {result.isEligible ? (
                  <CheckCircle size={32} className="text-emerald-400" />
                ) : (
                  <XCircle size={32} className="text-red-400" />
                )}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${result.isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.isEligible ? 'Eligible for Loan' : 'Not Eligible'}
                </h2>
                <p className={`text-sm ${result.isEligible ? 'text-emerald-300' : 'text-red-300'}`}>
                  {result.isEligible ? 'Client qualifies for matching lender offers' : 'Current profile does not meet lender rules'}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-100">{result.score}</p>
              <p className="text-xs text-slate-400">Eligibility Score</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
            <Summary label="Eligible Loan Range" value={`${formatCurrency(result.minLoanAmount)} - ${formatCurrency(result.maxLoanAmount)}`} />
            <Summary label="Estimated EMI" value={`${formatCurrency(result.estimatedEMI)}/month`} />
            <Summary label="Banks Available" value={`${result.eligibleBanks.length} Options`} />
          </div>
        </div>

        <section className="rounded-xl border border-white/10 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Eligibility Factors</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {result.factors.map((factor) => (
              <div key={factor.factor} className="rounded-lg border border-white/10 bg-slate-800/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-200">{factor.factor}</p>
                  <span className="text-xs text-slate-400">{factor.weight}% weight</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{factor.description}</p>
              </div>
            ))}
          </div>
        </section>

        {result.eligibleBanks.length > 0 && (
          <section className="rounded-xl border border-white/10 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Eligible Banks & NBFCs</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {result.eligibleBanks.map((bank) => (
                <div key={bank.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/5 bg-slate-900">
                      <Building2 size={24} className="text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200">{bank.name}</h4>
                      <p className="text-xs text-slate-400">Up to {formatCurrency(bank.displayAmount)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <Percent size={14} className="text-slate-500" />
                      {bank.interestRateMin}% - {bank.interestRateMax}%
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock size={14} className="text-slate-500" />
                      {bank.processingTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="rounded-xl border border-indigo-700/50 bg-indigo-900 p-6 text-indigo-50">
          <h3 className="mb-2 text-lg font-semibold text-indigo-100">Ready to Proceed?</h3>
          <p className="mb-4 text-sm text-indigo-200/80">Submit this lead with required documents to get formal lender offers.</p>
          <button className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-600">
            Submit Lead
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Credit Check / Eligibility</h1>
        <p className="mt-1 text-slate-400">Check your client's loan eligibility instantly</p>
      </div>

      <div className="flex gap-3 rounded-lg border border-indigo-500/10 bg-indigo-500/5 p-4">
        <Shield className="shrink-0 text-indigo-400" size={20} />
        <div>
          <p className="text-sm font-medium text-indigo-300">Soft Check - No Credit Impact</p>
          <p className="mt-1 text-sm text-indigo-200/80">{softCheckCopy}</p>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/50 p-6">
        <h2 className="mb-6 text-lg font-semibold text-slate-100">Client Information</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field id="clientName" label="Client Name *">
            <input id="clientName" type="text" value={formData.clientName} onChange={(e) => updateField('clientName', e.target.value)} placeholder="Enter client's full name" className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </Field>
          <Field id="phone" label="Mobile Number *">
            <input id="phone" type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="10-digit mobile number" className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </Field>
          <Field id="employmentType" label="Employment Type *">
            <select id="employmentType" value={formData.employmentType} onChange={(e) => updateField('employmentType', e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select employment type</option>
              <option value="salaried">Salaried</option>
              <option value="self_employed">Self Employed</option>
              <option value="business_owner">Business Owner</option>
              <option value="professional">Professional</option>
            </select>
          </Field>
          <Field id="monthlyIncome" label="Monthly Income *">
            <input id="monthlyIncome" type="number" value={formData.monthlyIncome} onChange={(e) => updateField('monthlyIncome', e.target.value)} placeholder="e.g., 50000" className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </Field>
          <Field id="loanType" label="Loan Type *">
            <select id="loanType" value={formData.loanType} onChange={(e) => updateField('loanType', e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select loan type</option>
              <option value="personal_loan">Personal Loan</option>
              <option value="home_loan">Home Loan</option>
              <option value="business_loan">Business Loan</option>
              <option value="car_loan">Car Loan</option>
              <option value="lap">Loan Against Property</option>
              <option value="education_loan">Education Loan</option>
            </select>
          </Field>
          <Field id="loanAmount" label="Required Loan Amount *">
            <input id="loanAmount" type="number" value={formData.loanAmount} onChange={(e) => updateField('loanAmount', e.target.value)} placeholder="e.g., 500000" className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </Field>
          <Field id="existingEMI" label="Existing EMI Obligations">
            <input id="existingEMI" type="number" value={formData.existingEMI} onChange={(e) => updateField('existingEMI', e.target.value)} placeholder="Monthly EMI amount (if any)" className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </Field>
          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-slate-800/30 p-4 text-sm text-slate-300 md:col-span-2">
            <input type="checkbox" checked={formData.consentCredit} onChange={(e) => updateField('consentCredit', e.target.checked)} className="mt-1 h-4 w-4" />
            <span>Client has consented to a soft eligibility check. This does not affect the client's credit score.</span>
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={handleCheckEligibility}
            disabled={!canRun}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Checking Eligibility...
              </>
            ) : (
              <>
                <Search size={18} />
                Check Eligibility
              </>
            )}
          </button>
          <p className="text-sm text-slate-400">
            <Info size={14} className="mr-1 inline text-slate-500" />
            This check takes less than 30 seconds
          </p>
        </div>
        {submitError && <p className="mt-3 text-sm text-red-300">{submitError}</p>}
      </section>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 p-3 text-center">
      <p className="text-xs font-medium text-emerald-300">{label}</p>
      <p className="mt-1 text-lg font-bold text-emerald-400">{value}</p>
    </div>
  );
}
