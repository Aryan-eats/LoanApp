import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldCheck, FileText, Users, Activity } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import RecentActivityFeed from '../components/RecentActivityFeed';
import CustomerContextPills from '../components/CustomerContextPills';
import { getCustomerDetail, type PartnerCustomerDetailResponse } from '../../api/partnerCustomersApi';
import {
  formatLeadScore,
  formatLeadSource,
  formatScoreBand,
  resolveConsentSummary,
  resolveCustomerId,
  resolveCustomerKey,
  resolveLeadScore,
  resolveLeadSource,
  resolveScoreBand,
} from '../utils/customerCrm';
import type { Lead } from '../types/partner-dashboard';

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatDate = (value?: string) => {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-100">{value}</p>
      {helper && <p className="mt-1 text-sm text-slate-400">{helper}</p>}
    </div>
  );
}

function ConsentSummaryCard({ consent }: { consent: NonNullable<PartnerCustomerDetailResponse['customer']['consentSummary']> }) {
  const checks = [
    { key: 'dataShare', label: 'Data share', value: consent.dataShare },
    { key: 'contact', label: 'Contact', value: consent.contact },
    { key: 'terms', label: 'Terms', value: consent.terms },
    { key: 'privacyPolicy', label: 'Privacy', value: Boolean(consent.privacyPolicy) },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Consent summary</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{consent.summary ?? 'Captured and stored'}</p>
        </div>
        <ShieldCheck className="text-emerald-300" size={20} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {checks.map((item) => (
          <StatusBadge
            key={item.key}
            status={item.value ? 'verified' : 'rejected'}
            variant="partner"
            size="sm"
            className="capitalize"
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-400">
        {consent.recordedAt ? `Recorded on ${formatDate(consent.recordedAt)}` : 'No capture timestamp provided'}
      </p>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const customerId = resolveCustomerId(lead) ?? resolveCustomerId(lead.client);
  const customerKey = resolveCustomerKey(lead) ?? resolveCustomerKey(lead.client);
  const source = resolveLeadSource(lead);
  const score = resolveLeadScore(lead);
  const band = resolveScoreBand(lead);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-lg font-semibold text-slate-100">{lead.client.fullName}</p>
            <p className="text-sm text-slate-400">{lead.client.phone}</p>
          </div>
          <CustomerContextPills
            customerId={customerId}
            customerKey={customerKey}
            leadSource={source}
            leadScore={score}
            scoreBand={band}
            consentSummary={resolveConsentSummary(lead)}
            compact
          />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300 lg:min-w-[320px]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
            <div className="mt-2">
              <StatusBadge status={lead.status} variant="partner" />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount</p>
            <p className="mt-2 font-semibold text-slate-100">{formatCurrency(lead.loanAmount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tenure</p>
            <p className="mt-2 font-semibold text-slate-100">{lead.tenure} months</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Updated</p>
            <p className="mt-2 font-semibold text-slate-100">{formatDate(lead.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const [detail, setDetail] = useState<PartnerCustomerDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setError('Customer id is missing.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getCustomerDetail(customerId)
      .then((response) => {
        if (!isMounted) return;

        if (response.success && response.data) {
          setDetail(response.data);
        } else {
          setError(response.message || 'Unable to load customer details.');
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load customer details.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  const customer = detail?.customer;
  const storedClient = detail?.storedClient ?? null;
  const relatedLeads = detail?.relatedLeads ?? [];
  const activity = detail?.activity ?? [];

  const summary = useMemo(() => {
    const leadSource = resolveLeadSource(customer ?? null);
    const leadScore = resolveLeadScore(customer ?? null);
    const scoreBand = resolveScoreBand(customer ?? null);
    const consent = resolveConsentSummary(customer ?? null);

    return {
      leadSource,
      leadScore,
      scoreBand,
      consent,
    };
  }, [customer]);

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading customer details...</span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-slate-900/60 p-6">
        <p className="text-lg font-semibold text-slate-100">Customer details unavailable</p>
        <p className="mt-2 text-sm text-slate-400">{error ?? 'No customer data was returned for this record.'}</p>
        <Link to="/partner/leads" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
          <ArrowLeft size={16} />
          Back to leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/partner/leads" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200">
            <ArrowLeft size={16} />
            Back to leads
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-100">{customer.fullName}</h1>
          <p className="mt-2 text-slate-400">
            Customer profile for {customer.phone}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Customer record</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">{customer.customerKey ?? customer.customerId}</p>
          <CustomerContextPills
            customerId={customer.customerId}
            customerKey={customer.customerKey}
            leadSource={summary.leadSource}
            leadScore={summary.leadScore}
            scoreBand={summary.scoreBand}
            consentSummary={summary.consent}
            className="mt-3"
            compact
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Customer Id" value={customer.customerId} helper={customer.email ?? 'No email on file'} />
        <SummaryCard label="Lead source" value={formatLeadSource(summary.leadSource)} helper={storedClient ? 'Persisted from stored client data' : 'Sourced from customer payload'} />
        <SummaryCard label="Lead score" value={formatLeadScore(summary.leadScore)} helper={formatScoreBand(summary.scoreBand)} />
        <SummaryCard label="Related leads" value={String(relatedLeads.length)} helper={`${activity.length} activity item${activity.length === 1 ? '' : 's'}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Customer summary</h2>
              <p className="text-sm text-slate-400">Identity, score, and consent state for this customer.</p>
            </div>
            <Activity className="text-indigo-300" size={18} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard label="Full name" value={customer.fullName} />
            <SummaryCard label="Phone" value={customer.phone} />
            <SummaryCard label="Email" value={customer.email ?? 'Not provided'} />
            <SummaryCard
              label="Score band"
              value={formatScoreBand(summary.scoreBand)}
              helper={summary.leadScore !== null && summary.leadScore !== undefined ? `${formatLeadScore(summary.leadScore)} current score` : 'No score provided'}
            />
          </div>

          {summary.consent ? (
            <ConsentSummaryCard consent={summary.consent} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              No consent summary was returned for this customer.
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div className="flex items-center gap-2">
            <Users className="text-indigo-300" size={18} />
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Stored client snapshot</h2>
              <p className="text-sm text-slate-400">Latest locally captured record, if one exists.</p>
            </div>
          </div>

          {storedClient ? (
            <div className="space-y-4">
              <CustomerContextPills
                customerId={resolveCustomerId(storedClient)}
                customerKey={resolveCustomerKey(storedClient)}
                leadSource={resolveLeadSource(storedClient)}
                leadScore={resolveLeadScore(storedClient)}
                scoreBand={resolveScoreBand(storedClient)}
                consentSummary={resolveConsentSummary(storedClient)}
                compact
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryCard label="Local status" value={storedClient.localStatus} />
                <SummaryCard label="Loan type" value={storedClient.loanType} />
                <SummaryCard label="Loan amount" value={formatCurrency(storedClient.loanAmount)} />
                <SummaryCard label="Updated" value={formatDate(storedClient.updatedAt)} />
              </div>
              {storedClient.notes && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Notes</p>
                  <p className="mt-2 text-sm text-slate-300">{storedClient.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
              No stored client snapshot is available yet.
            </div>
          )}
        </section>
      </div>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
        <div className="flex items-center gap-2">
          <FileText className="text-indigo-300" size={18} />
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Related submitted leads</h2>
            <p className="text-sm text-slate-400">Lead records tied to the same customer identity.</p>
          </div>
        </div>

        <div className="space-y-3">
          {relatedLeads.length > 0 ? (
            relatedLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-400">
              No related submitted leads were returned.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
        <div className="flex items-center gap-2">
          <Activity className="text-indigo-300" size={18} />
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Activity feed</h2>
            <p className="text-sm text-slate-400">Persisted customer activity when available, otherwise lead timeline data.</p>
          </div>
        </div>
        <RecentActivityFeed title="Activity feed" activityItems={activity} leads={relatedLeads} limit={10} />
      </section>
    </div>
  );
}
