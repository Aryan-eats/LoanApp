export type TenureUnit = 'months' | 'years';

export type AmortizationRow = {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
};

export type EmiCalculationResult = {
  monthlyEmi: number;
  totalInterest: number;
  totalAmount: number;
  monthlyRate: number;
  tenureMonths: number;
  schedule: AmortizationRow[];
};

const roundToPaise = (value: number): number => Math.round(value * 100) / 100;

export const getTenureMonths = (tenureValue: number, tenureUnit: TenureUnit): number => {
  if (!Number.isFinite(tenureValue) || tenureValue <= 0) {
    return 0;
  }

  return tenureUnit === 'years' ? Math.round(tenureValue * 12) : Math.round(tenureValue);
};

export const calculateEmiDetails = (
  principal: number,
  annualRate: number,
  tenureValue: number,
  tenureUnit: TenureUnit
): EmiCalculationResult => {
  const tenureMonths = getTenureMonths(tenureValue, tenureUnit);

  if (!Number.isFinite(principal) || principal <= 0 || tenureMonths <= 0) {
    return {
      monthlyEmi: 0,
      totalInterest: 0,
      totalAmount: 0,
      monthlyRate: 0,
      tenureMonths: 0,
      schedule: [],
    };
  }

  const monthlyRate = Number.isFinite(annualRate) && annualRate > 0 ? annualRate / 12 / 100 : 0;
  const growthFactor = monthlyRate > 0 ? Math.pow(1 + monthlyRate, tenureMonths) : 1;
  const emi = monthlyRate > 0
    ? (principal * monthlyRate * growthFactor) / (growthFactor - 1)
    : principal / tenureMonths;

  let balance = principal;
  let totalInterest = 0;
  let totalAmount = 0;
  const schedule: AmortizationRow[] = [];

  for (let month = 1; month <= tenureMonths; month += 1) {
    const rawInterest = monthlyRate > 0 ? balance * monthlyRate : 0;
    const rawPrincipal = emi - rawInterest;
    const isLastMonth = month === tenureMonths;
    const principalPayment = roundToPaise(isLastMonth ? balance : Math.min(balance, rawPrincipal));
    const interestPayment = roundToPaise(rawInterest);
    const emiPayment = roundToPaise(principalPayment + interestPayment);

    balance = roundToPaise(Math.max(0, balance - principalPayment));
    totalInterest = roundToPaise(totalInterest + interestPayment);
    totalAmount = roundToPaise(totalAmount + emiPayment);

    schedule.push({
      month,
      emi: emiPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance,
    });
  }

  return {
    monthlyEmi: roundToPaise(emi),
    totalInterest,
    totalAmount,
    monthlyRate,
    tenureMonths,
    schedule,
  };
};