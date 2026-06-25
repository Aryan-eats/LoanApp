export type SoftCheckInput = {
  fullName: string;
  phone: string;
  monthlyIncome: number;
  existingEMI?: number;
  employmentType: string;
  loanType: string;
  loanAmount: number;
  consentCredit: boolean;
};

export type SoftCheckBank = {
  id: string;
  name: string;
  code: string;
  status: string;
  supportedLoanTypes: string[];
  interestRateMin: number | string;
  interestRateMax: number | string;
  processingFee: string;
  maxTenure: number;
  minAmount: number | string;
  maxAmount: number | string;
  processingTime: string;
  isPopular: boolean;
  features: string[];
  logo?: string | null;
};

export type SoftCheckResult = {
  checkType: 'soft';
  creditImpact: 'none';
  isEligible: boolean;
  score: number;
  maxLoanAmount: number;
  minLoanAmount: number;
  estimatedEMI: number;
  eligibleBanks: Array<SoftCheckBank & { displayAmount: number }>;
  factors: Array<{
    factor: string;
    status: 'positive' | 'neutral' | 'negative';
    description: string;
    weight: number;
  }>;
  disclaimer: string;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const estimateEmi = (amount: number, annualRate = 12, months = 60) => {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return Math.round(amount / months);
  return Math.round(
    (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1)
  );
};

export function runSoftCheck({
  input,
  banks,
}: {
  input: SoftCheckInput;
  banks: SoftCheckBank[];
}): SoftCheckResult {
  if (!input.consentCredit) throw new Error('Soft check consent is required');

  const income = toNumber(input.monthlyIncome);
  const existingEMI = toNumber(input.existingEMI);
  const requestedAmount = toNumber(input.loanAmount);
  const disposableForEmi = Math.max(0, income * 0.5 - existingEMI);
  const estimatedEMI = estimateEmi(requestedAmount);
  const maxLoanAmount = Math.max(0, Math.round(disposableForEmi * 36));
  const eligibleBanks = banks
    .filter((bank) => bank.status === 'active' && bank.supportedLoanTypes.includes(input.loanType))
    .filter(
      (bank) =>
        requestedAmount >= toNumber(bank.minAmount) &&
        requestedAmount <= Math.min(toNumber(bank.maxAmount), maxLoanAmount)
    )
    .map((bank) => ({ ...bank, displayAmount: Math.min(toNumber(bank.maxAmount), maxLoanAmount) }));

  const score = Math.min(
    100,
    25 +
      (income >= 50_000 ? 25 : 10) +
      (existingEMI <= income * 0.25 ? 25 : 10) +
      (eligibleBanks.length ? 25 : 0)
  );

  return {
    checkType: 'soft',
    creditImpact: 'none',
    isEligible: eligibleBanks.length > 0 && estimatedEMI <= disposableForEmi,
    score,
    maxLoanAmount,
    minLoanAmount: eligibleBanks.length
      ? Math.min(...eligibleBanks.map((bank) => toNumber(bank.minAmount)))
      : 0,
    estimatedEMI,
    eligibleBanks,
    factors: [
      {
        factor: 'Income Level',
        status: income >= 50_000 ? 'positive' : 'neutral',
        description: 'Based on declared monthly income',
        weight: 30,
      },
      {
        factor: 'Debt-to-Income Ratio',
        status: estimatedEMI <= disposableForEmi ? 'positive' : 'negative',
        description: 'Based on declared existing EMI obligations',
        weight: 35,
      },
      {
        factor: 'Bank Fit',
        status: eligibleBanks.length ? 'positive' : 'negative',
        description: 'Matched against active lender limits',
        weight: 35,
      },
    ],
    disclaimer:
      'Soft eligibility check only. No credit score impact. Final approval requires lender verification and may involve a hard inquiry.',
  };
}
