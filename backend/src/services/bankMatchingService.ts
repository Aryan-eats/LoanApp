import { Decimal } from '@prisma/client/runtime/client';
import { basePrisma } from '../config/prisma.js';

const loanTypeMapping: Record<string, string[]> = {
  'Personal Loans': ['personal_loan'],
  'Business Loans': ['business_loan', 'working_capital_loan', 'invoice_financing'],
  'Home Loans': ['home_loan', 'pmay_home_loan'],
  'Property-Backed Loans': ['lap', 'lrd'],
  'Vehicle Loans': ['car_loan', 'used_car_loan', 'two_wheeler_loan', 'commercial_vehicle_loan', 'tractor_loan'],
  'Gold & Securities Loans': ['gold_loan', 'loan_against_fd'],
  'Education Loans': ['education_loan'],
  'Corporate / Large Loans': ['business_loan', 'working_capital_loan'],
  'Government Scheme Loans': ['mudra_shishu', 'mudra_kishor', 'mudra_tarun', 'pmay_home_loan', 'kcc'],
  'Agriculture Loans': ['kcc', 'tractor_loan'],
  'Consumer & Retail Loans': ['consumer_durable_loan', 'emi_card_loan'],
  'Salary & Short-Term Loans': ['personal_loan'],
  'Real Estate & Builder Loans': ['home_loan', 'lap'],
  'Specialized Loans': ['ev_loan', 'solar_panel_loan'],
};

export interface MatchOffersInput {
  loanType?: string;
  loanSubType?: string;
  loanAmount?: number;
}

export interface MatchedBankOffer {
  id: string;
  name: string;
  code: string;
  logo: string | null;
  supportedLoanTypes: string[];
  matchedLoanTypes: string[];
  interestRateMin: number;
  interestRateMax: number;
  processingFee: string;
  maxTenure: number;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  isPopular: boolean;
  displayAmount: number;
  estimatedEmi: number | null;
}

const resolveLoanTypes = ({ loanType, loanSubType }: MatchOffersInput): string[] => {
  if (loanSubType && loanSubType.trim().length > 0) {
    return [loanSubType.trim()];
  }

  if (!loanType || loanType.trim().length === 0) {
    return [];
  }

  return loanTypeMapping[loanType.trim()] ?? [loanType.trim()];
};

const calculateEstimatedEmi = (
  principal: Decimal,
  annualRatePercent: Decimal,
  tenureMonths: number
): Decimal | null => {
  if (!principal.isFinite() || principal.lte(0) || !Number.isFinite(tenureMonths) || tenureMonths <= 0) {
    return null;
  }

  if (annualRatePercent.lte(0)) {
    return principal.div(tenureMonths).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  }

  const monthlyRate = annualRatePercent.div(1200);
  const growth = monthlyRate.plus(1).pow(tenureMonths);
  const denominator = growth.minus(1);

  if (denominator.isZero()) {
    return null;
  }

  return principal
    .mul(monthlyRate)
    .mul(growth)
    .div(denominator)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
};

export const matchLeadOffers = async (input: MatchOffersInput): Promise<{
  resolvedLoanTypes: string[];
  offers: MatchedBankOffer[];
}> => {
  const resolvedLoanTypes = resolveLoanTypes(input);
  if (resolvedLoanTypes.length === 0) {
    return { resolvedLoanTypes, offers: [] };
  }

  const requestedAmount =
    typeof input.loanAmount === 'number' && Number.isFinite(input.loanAmount) && input.loanAmount > 0
      ? new Decimal(input.loanAmount)
      : null;

  const banks = await basePrisma.bank.findMany({
    where: {
      status: 'active',
      supportedLoanTypes: { hasSome: resolvedLoanTypes },
    },
    include: { commissionRates: true },
    orderBy: [{ interestRateMin: 'asc' }, { name: 'asc' }],
  });

  const offers = banks.flatMap((bank) => {
    const minAmount = new Decimal(bank.minAmount.toString());
    const maxAmount = new Decimal(bank.maxAmount.toString());

    if (requestedAmount && (requestedAmount.lt(minAmount) || requestedAmount.gt(maxAmount))) {
      return [];
    }

    const displayAmount = requestedAmount ?? maxAmount;
    const estimatedEmi = calculateEstimatedEmi(
      displayAmount,
      new Decimal(bank.interestRateMin.toString()),
      bank.maxTenure
    );
    const matchedLoanTypes = bank.commissionRates
      .map((rate) => rate.loanType)
      .filter((loanType) => resolvedLoanTypes.includes(loanType));

    return [{
      id: bank.id,
      name: bank.name,
      code: bank.code,
      logo: bank.logo,
      supportedLoanTypes: bank.supportedLoanTypes,
      matchedLoanTypes,
      interestRateMin: Number(bank.interestRateMin.toString()),
      interestRateMax: Number(bank.interestRateMax.toString()),
      processingFee: bank.processingFee,
      maxTenure: bank.maxTenure,
      minAmount: Number(minAmount.toString()),
      maxAmount: Number(maxAmount.toString()),
      processingTime: bank.processingTime,
      isPopular: bank.isPopular,
      displayAmount: Number(displayAmount.toString()),
      estimatedEmi: estimatedEmi ? Number(estimatedEmi.toString()) : null,
    }];
  });

  return { resolvedLoanTypes, offers };
};