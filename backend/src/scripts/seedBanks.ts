/**
 * Seed script – populates banks and bank_commission_rates tables.
 * Safe to run multiple times (upsert by bank code).
 *
 * Usage:
 *   npx tsx src/scripts/seedBanks.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { basePrisma as prisma } from '../shared/db/prisma.js';

interface CommissionRate {
  loanType: string;
  partnerCommission: number;
  interestRate?: string;
  maxAmount?: number;
  minAmount?: number;
  maxTenure?: number;
}

interface BankSeed {
  name: string;
  code: string;
  status: 'active' | 'inactive';
  supportedLoanTypes: string[];
  interestRateMin: number;
  interestRateMax: number;
  processingFee: string;
  maxTenure: number;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  isPopular: boolean;
  features: string[];
  commissionRates: CommissionRate[];
  avgTat: number;
  activeLeads: number;
  approvalRate: number;
  totalDisbursed: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}

const banks: BankSeed[] = [
  // -- Existing 9 banks ------------------------------------------------------
  {
    name: 'HDFC Bank',
    code: 'HDFC',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'car_loan', 'lap', 'lrd', 'overdraft', 'business_loan', 'gold_loan'],
    interestRateMin: 8.5, interestRateMax: 14,
    processingFee: '0.5% - 2%', maxTenure: 360,
    minAmount: 100000, maxAmount: 100000000,
    processingTime: '3-10 days', isPopular: true,
    features: ['Instant approval for salaried', 'No prepayment charges', 'Doorstep service'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.5, interestRate: '8.5% - 9.5%', maxAmount: 100000000, minAmount: 500000, maxTenure: 360 },
      { loanType: 'personal_loan', partnerCommission: 1.0, interestRate: '10.5% - 14%', maxAmount: 4000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'car_loan', partnerCommission: 0.75, interestRate: '8.5% - 11%', maxAmount: 10000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'lap', partnerCommission: 0.75, interestRate: '9% - 12%', maxAmount: 50000000, minAmount: 500000, maxTenure: 180 },
      { loanType: 'lrd', partnerCommission: 0.5, interestRate: '8.75% - 10.5%', maxAmount: 100000000, minAmount: 2500000, maxTenure: 180 },
      { loanType: 'overdraft', partnerCommission: 0.25, interestRate: '10% - 14%', maxAmount: 10000000, minAmount: 500000, maxTenure: 12 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '11% - 16%', maxAmount: 5000000, minAmount: 200000, maxTenure: 60 },
      { loanType: 'gold_loan', partnerCommission: 0.5, interestRate: '10.5% - 14%', maxAmount: 10000000, minAmount: 25000, maxTenure: 36 },
    ],
    avgTat: 4, activeLeads: 45, approvalRate: 72, totalDisbursed: '₹12.5 Cr',
    contactPerson: 'Rajiv Malhotra', contactEmail: 'rajiv.m@hdfc.com', contactPhone: '+91 98765 43210',
  },
  {
    name: 'ICICI Bank',
    code: 'ICICI',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'business_loan', 'car_loan', 'two_wheeler_loan', 'education_loan'],
    interestRateMin: 8.75, interestRateMax: 15,
    processingFee: '0.5% - 2.5%', maxTenure: 300,
    minAmount: 100000, maxAmount: 75000000,
    processingTime: '2-7 days', isPopular: true,
    features: ['Quick processing', 'Online tracking', 'Flexible EMI options'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.5, interestRate: '8.75% - 9.75%', maxAmount: 75000000, minAmount: 500000, maxTenure: 300 },
      { loanType: 'personal_loan', partnerCommission: 1.0, interestRate: '10.75% - 15%', maxAmount: 5000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 16%', maxAmount: 5000000, minAmount: 300000, maxTenure: 60 },
      { loanType: 'car_loan', partnerCommission: 0.75, interestRate: '8.75% - 11.5%', maxAmount: 10000000, minAmount: 150000, maxTenure: 84 },
      { loanType: 'two_wheeler_loan', partnerCommission: 0.5, interestRate: '9.5% - 14%', maxAmount: 300000, minAmount: 25000, maxTenure: 48 },
      { loanType: 'education_loan', partnerCommission: 0.3, interestRate: '9% - 11.5%', maxAmount: 15000000, minAmount: 100000, maxTenure: 120 },
    ],
    avgTat: 3, activeLeads: 38, approvalRate: 68, totalDisbursed: '₹9.8 Cr',
    contactPerson: 'Priya Sharma', contactEmail: 'priya.s@icici.com', contactPhone: '+91 98765 43211',
  },
  {
    name: 'Axis Bank',
    code: 'AXIS',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'business_loan', 'working_capital_loan', 'invoice_financing'],
    interestRateMin: 8.6, interestRateMax: 14.5,
    processingFee: '0.5% - 2%', maxTenure: 360,
    minAmount: 100000, maxAmount: 50000000,
    processingTime: '3-10 days', isPopular: false,
    features: ['Digital process', 'Overdraft facility', 'Balance transfer options', 'Working capital solutions'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.5, interestRate: '8.6% - 9.5%', maxAmount: 50000000, minAmount: 500000, maxTenure: 360 },
      { loanType: 'personal_loan', partnerCommission: 1.0, interestRate: '10.5% - 14.5%', maxAmount: 4000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 16%', maxAmount: 3000000, minAmount: 200000, maxTenure: 48 },
      { loanType: 'working_capital_loan', partnerCommission: 1.0, interestRate: '11% - 15%', maxAmount: 10000000, minAmount: 500000, maxTenure: 60 },
      { loanType: 'invoice_financing', partnerCommission: 0.5, interestRate: '10% - 14%', maxAmount: 20000000, minAmount: 100000, maxTenure: 12 },
    ],
    avgTat: 5, activeLeads: 28, approvalRate: 65, totalDisbursed: '₹6.2 Cr',
    contactPerson: 'Amit Kumar', contactEmail: 'amit.k@axisbank.com', contactPhone: '+91 98765 43212',
  },
  {
    name: 'Bajaj Finserv',
    code: 'BAJAJ',
    status: 'active',
    supportedLoanTypes: ['personal_loan', 'business_loan', 'consumer_durable_loan', 'emi_card_loan'],
    interestRateMin: 11, interestRateMax: 18,
    processingFee: '2% - 3%', maxTenure: 60,
    minAmount: 50000, maxAmount: 2500000,
    processingTime: '1-3 days', isPopular: false,
    features: ['Same day disbursal', 'Minimal documentation', 'Flexi loan option', 'EMI Card facility'],
    commissionRates: [
      { loanType: 'personal_loan', partnerCommission: 2.0, interestRate: '11% - 16%', maxAmount: 2500000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'business_loan', partnerCommission: 2.5, interestRate: '14% - 18%', maxAmount: 2500000, minAmount: 100000, maxTenure: 48 },
      { loanType: 'consumer_durable_loan', partnerCommission: 1.0, interestRate: '0% - 15%', maxAmount: 500000, minAmount: 5000, maxTenure: 24 },
      { loanType: 'emi_card_loan', partnerCommission: 1.5, interestRate: '12% - 18%', maxAmount: 400000, minAmount: 10000, maxTenure: 24 },
    ],
    avgTat: 2, activeLeads: 52, approvalRate: 58, totalDisbursed: '₹4.5 Cr',
    contactPerson: 'Sneha Patel', contactEmail: 'sneha.p@bajaj.com', contactPhone: '+91 98765 43213',
  },
  {
    name: 'Tata Capital',
    code: 'TATA',
    status: 'inactive',
    supportedLoanTypes: ['personal_loan', 'business_loan', 'car_loan', 'used_car_loan', 'commercial_vehicle_loan'],
    interestRateMin: 9.5, interestRateMax: 16,
    processingFee: '1% - 2%', maxTenure: 84,
    minAmount: 75000, maxAmount: 25000000,
    processingTime: '2-5 days', isPopular: false,
    features: ['Wide vehicle financing', 'Used car loans', 'Commercial vehicle financing', 'Fleet finance'],
    commissionRates: [
      { loanType: 'personal_loan', partnerCommission: 1.0, interestRate: '10.5% - 16%', maxAmount: 3500000, minAmount: 75000, maxTenure: 72 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 16%', maxAmount: 5000000, minAmount: 200000, maxTenure: 60 },
      { loanType: 'car_loan', partnerCommission: 0.75, interestRate: '9.5% - 12%', maxAmount: 10000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'used_car_loan', partnerCommission: 1.0, interestRate: '11% - 14%', maxAmount: 5000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'commercial_vehicle_loan', partnerCommission: 0.75, interestRate: '10% - 14%', maxAmount: 25000000, minAmount: 200000, maxTenure: 84 },
    ],
    avgTat: 3, activeLeads: 0, approvalRate: 62, totalDisbursed: '₹2.1 Cr',
    contactPerson: 'Vikram Singh', contactEmail: 'vikram.s@tatacapital.com', contactPhone: '+91 98765 43214',
  },
  {
    name: 'SBI',
    code: 'SBI',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'education_loan', 'kcc', 'tractor_loan', 'mudra_shishu', 'mudra_kishor', 'mudra_tarun', 'pmay_home_loan', 'solar_panel_loan'],
    interestRateMin: 8.25, interestRateMax: 13,
    processingFee: '0.35% - 1%', maxTenure: 360,
    minAmount: 50000, maxAmount: 150000000,
    processingTime: '5-14 days', isPopular: true,
    features: ['Lowest interest rates', 'Government bank trust', 'Wide branch network', 'Government scheme loans'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.4, interestRate: '8.25% - 9%', maxAmount: 150000000, minAmount: 300000, maxTenure: 360 },
      { loanType: 'personal_loan', partnerCommission: 0.8, interestRate: '11% - 13%', maxAmount: 2000000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'education_loan', partnerCommission: 0.25, interestRate: '8.5% - 10.5%', maxAmount: 20000000, minAmount: 100000, maxTenure: 180 },
      { loanType: 'kcc', partnerCommission: 0.15, interestRate: '7% - 9%', maxAmount: 300000, minAmount: 10000, maxTenure: 12 },
      { loanType: 'tractor_loan', partnerCommission: 0.5, interestRate: '9% - 11%', maxAmount: 2000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'mudra_shishu', partnerCommission: 0.1, interestRate: '8.5% - 10%', maxAmount: 50000, minAmount: 10000, maxTenure: 60 },
      { loanType: 'mudra_kishor', partnerCommission: 0.2, interestRate: '9% - 11%', maxAmount: 500000, minAmount: 50001, maxTenure: 60 },
      { loanType: 'mudra_tarun', partnerCommission: 0.3, interestRate: '9.5% - 12%', maxAmount: 1000000, minAmount: 500001, maxTenure: 60 },
      { loanType: 'pmay_home_loan', partnerCommission: 0.35, interestRate: '6.5% - 8.5%', maxAmount: 50000000, minAmount: 500000, maxTenure: 360 },
      { loanType: 'solar_panel_loan', partnerCommission: 0.4, interestRate: '8% - 10%', maxAmount: 1000000, minAmount: 50000, maxTenure: 60 },
    ],
    avgTat: 7, activeLeads: 62, approvalRate: 75, totalDisbursed: '₹18.5 Cr',
    contactPerson: 'Rakesh Sharma', contactEmail: 'rakesh.s@sbi.co.in', contactPhone: '+91 98765 43215',
  },
  {
    name: 'Muthoot Finance',
    code: 'MUTHOOT',
    status: 'active',
    supportedLoanTypes: ['gold_loan', 'loan_against_fd', 'personal_loan'],
    interestRateMin: 10.5, interestRateMax: 18,
    processingFee: '0 - 1%', maxTenure: 36,
    minAmount: 10000, maxAmount: 10000000,
    processingTime: '1 hour - 1 day', isPopular: true,
    features: ['Instant gold loan', 'No income proof required', 'Minimal documentation', 'Multiple branches'],
    commissionRates: [
      { loanType: 'gold_loan', partnerCommission: 0.5, interestRate: '10.5% - 15%', maxAmount: 10000000, minAmount: 10000, maxTenure: 36 },
      { loanType: 'loan_against_fd', partnerCommission: 0.25, interestRate: '9% - 12%', maxAmount: 5000000, minAmount: 25000, maxTenure: 36 },
      { loanType: 'personal_loan', partnerCommission: 1.5, interestRate: '14% - 18%', maxAmount: 500000, minAmount: 25000, maxTenure: 36 },
    ],
    avgTat: 1, activeLeads: 25, approvalRate: 92, totalDisbursed: '₹3.2 Cr',
    contactPerson: 'Suresh Nair', contactEmail: 'suresh.n@muthoot.com', contactPhone: '+91 98765 43216',
  },
  {
    name: 'Hero FinCorp',
    code: 'HERO',
    status: 'active',
    supportedLoanTypes: ['two_wheeler_loan', 'personal_loan', 'ev_loan'],
    interestRateMin: 12, interestRateMax: 18,
    processingFee: '1% - 2%', maxTenure: 48,
    minAmount: 25000, maxAmount: 500000,
    processingTime: '1-2 days', isPopular: false,
    features: ['Quick approval', 'Low down payment', 'EV financing available', 'Dealer network'],
    commissionRates: [
      { loanType: 'two_wheeler_loan', partnerCommission: 1.0, interestRate: '12% - 16%', maxAmount: 300000, minAmount: 25000, maxTenure: 48 },
      { loanType: 'personal_loan', partnerCommission: 1.5, interestRate: '14% - 18%', maxAmount: 500000, minAmount: 50000, maxTenure: 48 },
      { loanType: 'ev_loan', partnerCommission: 0.75, interestRate: '10% - 14%', maxAmount: 500000, minAmount: 50000, maxTenure: 48 },
    ],
    avgTat: 2, activeLeads: 18, approvalRate: 70, totalDisbursed: '₹1.8 Cr',
    contactPerson: 'Anuj Gupta', contactEmail: 'anuj.g@herofincorp.com', contactPhone: '+91 98765 43217',
  },
  {
    name: 'Kotak Mahindra Bank',
    code: 'KOTAK',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'business_loan'],
    interestRateMin: 8.7, interestRateMax: 15,
    processingFee: '0.5% - 2%', maxTenure: 240,
    minAmount: 75000, maxAmount: 40000000,
    processingTime: '3-7 days', isPopular: false,
    features: ['Instant e-approval', 'No hidden charges', 'Dedicated relationship manager'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.5, interestRate: '8.7% - 9.75%', maxAmount: 40000000, minAmount: 500000, maxTenure: 240 },
      { loanType: 'personal_loan', partnerCommission: 1.0, interestRate: '10.99% - 15%', maxAmount: 3000000, minAmount: 75000, maxTenure: 60 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 16%', maxAmount: 3000000, minAmount: 200000, maxTenure: 48 },
    ],
    avgTat: 3, activeLeads: 12, approvalRate: 65, totalDisbursed: '₹4.2 Cr',
    contactPerson: 'Deepak Rao', contactEmail: 'deepak.rao@kotak.com', contactPhone: '+91 98765 00000',
  },
  // -- 16 New banks ----------------------------------------------------------
  {
    name: 'Punjab National Bank',
    code: 'PNB',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'education_loan', 'car_loan', 'kcc', 'mudra_shishu', 'mudra_kishor'],
    interestRateMin: 8.45, interestRateMax: 14,
    processingFee: '0.35% - 1%', maxTenure: 360,
    minAmount: 50000, maxAmount: 100000000,
    processingTime: '5-12 days', isPopular: false,
    features: ['Government bank', 'Pan-India network', 'Competitive rates', 'Mudra loans available'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.4, interestRate: '8.45% - 9.5%', maxAmount: 100000000, minAmount: 300000, maxTenure: 360 },
      { loanType: 'personal_loan', partnerCommission: 0.8, interestRate: '10.5% - 14%', maxAmount: 2000000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'education_loan', partnerCommission: 0.25, interestRate: '8.55% - 10.75%', maxAmount: 15000000, minAmount: 100000, maxTenure: 180 },
      { loanType: 'car_loan', partnerCommission: 0.5, interestRate: '8.75% - 10.5%', maxAmount: 5000000, minAmount: 100000, maxTenure: 84 },
    ],
    avgTat: 6, activeLeads: 35, approvalRate: 70, totalDisbursed: '₹8.2 Cr',
    contactPerson: 'Anil Verma', contactEmail: 'anil.v@pnb.co.in', contactPhone: '+91 98765 43218',
  },
  {
    name: 'Bank of Baroda',
    code: 'BOB',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'car_loan', 'education_loan', 'business_loan', 'mudra_tarun'],
    interestRateMin: 8.4, interestRateMax: 13.5,
    processingFee: '0.25% - 1%', maxTenure: 360,
    minAmount: 50000, maxAmount: 100000000,
    processingTime: '5-10 days', isPopular: false,
    features: ['Low processing fees', 'Rural reach', 'Government-backed trust', 'NRI loan facility'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.4, interestRate: '8.4% - 9.3%', maxAmount: 100000000, minAmount: 300000, maxTenure: 360 },
      { loanType: 'personal_loan', partnerCommission: 0.9, interestRate: '10.6% - 13.5%', maxAmount: 2000000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'car_loan', partnerCommission: 0.5, interestRate: '8.7% - 10.25%', maxAmount: 5000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'education_loan', partnerCommission: 0.2, interestRate: '8.35% - 10.35%', maxAmount: 20000000, minAmount: 100000, maxTenure: 180 },
      { loanType: 'business_loan', partnerCommission: 1.2, interestRate: '11% - 13.5%', maxAmount: 5000000, minAmount: 200000, maxTenure: 60 },
    ],
    avgTat: 6, activeLeads: 30, approvalRate: 71, totalDisbursed: '₹7.5 Cr',
    contactPerson: 'Meera Jain', contactEmail: 'meera.j@bankofbaroda.com', contactPhone: '+91 98765 43219',
  },
  {
    name: 'Union Bank of India',
    code: 'UNION',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'car_loan', 'education_loan', 'kcc'],
    interestRateMin: 8.35, interestRateMax: 14,
    processingFee: '0.5% - 1%', maxTenure: 360,
    minAmount: 50000, maxAmount: 75000000,
    processingTime: '5-12 days', isPopular: false,
    features: ['Government bank', 'Star home loan scheme', 'Wide ATM network', 'Good for rural loans'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.35, interestRate: '8.35% - 9.4%', maxAmount: 75000000, minAmount: 300000, maxTenure: 360 },
      { loanType: 'personal_loan', partnerCommission: 0.8, interestRate: '10.8% - 14%', maxAmount: 1500000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'car_loan', partnerCommission: 0.5, interestRate: '8.7% - 10.5%', maxAmount: 5000000, minAmount: 100000, maxTenure: 84 },
    ],
    avgTat: 7, activeLeads: 22, approvalRate: 68, totalDisbursed: '₹5.8 Cr',
    contactPerson: 'Ravi Prasad', contactEmail: 'ravi.p@unionbank.co.in', contactPhone: '+91 98765 43220',
  },
  {
    name: 'Canara Bank',
    code: 'CANARA',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'car_loan', 'education_loan', 'gold_loan'],
    interestRateMin: 8.4, interestRateMax: 13.5,
    processingFee: '0.5% - 1%', maxTenure: 360,
    minAmount: 25000, maxAmount: 75000000,
    processingTime: '5-10 days', isPopular: false,
    features: ['Government bank', 'Canara gold loan', 'Education priority', 'Digital banking'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.4, interestRate: '8.4% - 9.3%', maxAmount: 75000000, minAmount: 300000, maxTenure: 360 },
      { loanType: 'personal_loan', partnerCommission: 0.8, interestRate: '10.85% - 13.5%', maxAmount: 1500000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'gold_loan', partnerCommission: 0.4, interestRate: '7.65% - 10%', maxAmount: 5000000, minAmount: 25000, maxTenure: 36 },
    ],
    avgTat: 6, activeLeads: 20, approvalRate: 69, totalDisbursed: '₹5.1 Cr',
    contactPerson: 'Kavitha Rao', contactEmail: 'kavitha.r@canarabank.com', contactPhone: '+91 98765 43221',
  },
  {
    name: 'IndusInd Bank',
    code: 'INDUSIND',
    status: 'active',
    supportedLoanTypes: ['personal_loan', 'car_loan', 'used_car_loan', 'business_loan', 'two_wheeler_loan', 'commercial_vehicle_loan'],
    interestRateMin: 9.5, interestRateMax: 16,
    processingFee: '1% - 2.5%', maxTenure: 84,
    minAmount: 50000, maxAmount: 25000000,
    processingTime: '2-5 days', isPopular: false,
    features: ['Vehicle financing specialist', 'Quick disbursal', 'Used car financing', 'Flexible tenure'],
    commissionRates: [
      { loanType: 'personal_loan', partnerCommission: 1.2, interestRate: '10.5% - 16%', maxAmount: 3000000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'car_loan', partnerCommission: 0.75, interestRate: '9.5% - 12%', maxAmount: 10000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'used_car_loan', partnerCommission: 1.0, interestRate: '11% - 14%', maxAmount: 5000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 16%', maxAmount: 5000000, minAmount: 200000, maxTenure: 60 },
      { loanType: 'commercial_vehicle_loan', partnerCommission: 0.8, interestRate: '10% - 14%', maxAmount: 25000000, minAmount: 200000, maxTenure: 84 },
    ],
    avgTat: 3, activeLeads: 32, approvalRate: 66, totalDisbursed: '₹5.6 Cr',
    contactPerson: 'Nikhil Desai', contactEmail: 'nikhil.d@indusind.com', contactPhone: '+91 98765 43222',
  },
  {
    name: 'Yes Bank',
    code: 'YES',
    status: 'active',
    supportedLoanTypes: ['personal_loan', 'home_loan', 'business_loan', 'car_loan', 'lap'],
    interestRateMin: 9.0, interestRateMax: 15.5,
    processingFee: '1% - 2%', maxTenure: 300,
    minAmount: 100000, maxAmount: 50000000,
    processingTime: '3-7 days', isPopular: false,
    features: ['Digital-first approach', 'Quick approval', 'Flexible EMI', 'Balance transfer options'],
    commissionRates: [
      { loanType: 'personal_loan', partnerCommission: 1.2, interestRate: '10.5% - 15.5%', maxAmount: 4000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'home_loan', partnerCommission: 0.5, interestRate: '9% - 10%', maxAmount: 50000000, minAmount: 500000, maxTenure: 300 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 15.5%', maxAmount: 5000000, minAmount: 200000, maxTenure: 60 },
      { loanType: 'car_loan', partnerCommission: 0.7, interestRate: '9.5% - 12%', maxAmount: 10000000, minAmount: 100000, maxTenure: 84 },
    ],
    avgTat: 4, activeLeads: 15, approvalRate: 63, totalDisbursed: '₹3.8 Cr',
    contactPerson: 'Siddharth Roy', contactEmail: 'siddharth.r@yesbank.in', contactPhone: '+91 98765 43223',
  },
  {
    name: 'IDFC First Bank',
    code: 'IDFC',
    status: 'active',
    supportedLoanTypes: ['personal_loan', 'home_loan', 'car_loan', 'consumer_durable_loan'],
    interestRateMin: 9.0, interestRateMax: 15,
    processingFee: '0.5% - 2%', maxTenure: 360,
    minAmount: 20000, maxAmount: 50000000,
    processingTime: '2-5 days', isPopular: false,
    features: ['Zero prepayment charges', 'Digital application', 'Quick processing', 'Good savings rates'],
    commissionRates: [
      { loanType: 'personal_loan', partnerCommission: 1.0, interestRate: '10.49% - 15%', maxAmount: 4000000, minAmount: 20000, maxTenure: 60 },
      { loanType: 'home_loan', partnerCommission: 0.45, interestRate: '9% - 10%', maxAmount: 50000000, minAmount: 500000, maxTenure: 360 },
      { loanType: 'car_loan', partnerCommission: 0.7, interestRate: '9% - 11.5%', maxAmount: 10000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'consumer_durable_loan', partnerCommission: 0.8, interestRate: '0% - 14%', maxAmount: 500000, minAmount: 5000, maxTenure: 24 },
    ],
    avgTat: 3, activeLeads: 28, approvalRate: 67, totalDisbursed: '₹4.0 Cr',
    contactPerson: 'Neha Kapoor', contactEmail: 'neha.k@idfcfirst.com', contactPhone: '+91 98765 43224',
  },
  {
    name: 'Bandhan Bank',
    code: 'BANDHAN',
    status: 'active',
    supportedLoanTypes: ['personal_loan', 'home_loan', 'business_loan', 'gold_loan', 'mudra_shishu', 'mudra_kishor'],
    interestRateMin: 9.5, interestRateMax: 16,
    processingFee: '1% - 2%', maxTenure: 240,
    minAmount: 10000, maxAmount: 25000000,
    processingTime: '3-7 days', isPopular: false,
    features: ['Microfinance specialist', 'Rural reach', 'Small business loans', 'Affordable housing'],
    commissionRates: [
      { loanType: 'personal_loan', partnerCommission: 1.2, interestRate: '11% - 16%', maxAmount: 2000000, minAmount: 10000, maxTenure: 60 },
      { loanType: 'home_loan', partnerCommission: 0.45, interestRate: '9.5% - 10.5%', maxAmount: 25000000, minAmount: 200000, maxTenure: 240 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 16%', maxAmount: 2000000, minAmount: 100000, maxTenure: 48 },
      { loanType: 'gold_loan', partnerCommission: 0.5, interestRate: '10% - 14%', maxAmount: 5000000, minAmount: 10000, maxTenure: 36 },
    ],
    avgTat: 4, activeLeads: 40, approvalRate: 74, totalDisbursed: '₹6.0 Cr',
    contactPerson: 'Soumya Das', contactEmail: 'soumya.d@bandhanbank.com', contactPhone: '+91 98765 43225',
  },
  {
    name: 'Federal Bank',
    code: 'FEDERAL',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'car_loan', 'gold_loan', 'education_loan'],
    interestRateMin: 8.8, interestRateMax: 14.5,
    processingFee: '0.5% - 1.5%', maxTenure: 360,
    minAmount: 25000, maxAmount: 50000000,
    processingTime: '3-7 days', isPopular: false,
    features: ['Strong in South India', 'NRI banking expert', 'Gold loan leader', 'Digital banking'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.45, interestRate: '8.8% - 9.85%', maxAmount: 50000000, minAmount: 300000, maxTenure: 360 },
      { loanType: 'personal_loan', partnerCommission: 1.0, interestRate: '10.49% - 14.5%', maxAmount: 2500000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'gold_loan', partnerCommission: 0.4, interestRate: '8.9% - 12%', maxAmount: 5000000, minAmount: 25000, maxTenure: 36 },
    ],
    avgTat: 4, activeLeads: 18, approvalRate: 72, totalDisbursed: '₹3.5 Cr',
    contactPerson: 'Thomas K.', contactEmail: 'thomas.k@federalbank.co.in', contactPhone: '+91 98765 43226',
  },
  {
    name: 'L&T Finance',
    code: 'LNT',
    status: 'active',
    supportedLoanTypes: ['home_loan', 'personal_loan', 'business_loan', 'lap', 'two_wheeler_loan', 'tractor_loan'],
    interestRateMin: 9.0, interestRateMax: 16,
    processingFee: '1% - 2.5%', maxTenure: 300,
    minAmount: 25000, maxAmount: 50000000,
    processingTime: '3-7 days', isPopular: false,
    features: ['Infrastructure finance', 'Rural lending', 'Two-wheeler finance', 'Farm equipment'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.5, interestRate: '9% - 10.5%', maxAmount: 50000000, minAmount: 500000, maxTenure: 300 },
      { loanType: 'personal_loan', partnerCommission: 1.2, interestRate: '11% - 16%', maxAmount: 2500000, minAmount: 50000, maxTenure: 60 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 16%', maxAmount: 5000000, minAmount: 200000, maxTenure: 60 },
      { loanType: 'lap', partnerCommission: 0.75, interestRate: '10% - 13%', maxAmount: 25000000, minAmount: 500000, maxTenure: 180 },
      { loanType: 'two_wheeler_loan', partnerCommission: 0.8, interestRate: '12% - 16%', maxAmount: 300000, minAmount: 25000, maxTenure: 48 },
      { loanType: 'tractor_loan', partnerCommission: 0.5, interestRate: '10% - 13%', maxAmount: 2000000, minAmount: 100000, maxTenure: 84 },
    ],
    avgTat: 4, activeLeads: 22, approvalRate: 64, totalDisbursed: '₹4.8 Cr',
    contactPerson: 'Ashwin Menon', contactEmail: 'ashwin.m@ltfinance.com', contactPhone: '+91 98765 43227',
  },
  {
    name: 'Mahindra Finance',
    code: 'MAHINDRA',
    status: 'active',
    supportedLoanTypes: ['car_loan', 'used_car_loan', 'commercial_vehicle_loan', 'tractor_loan', 'personal_loan', 'business_loan'],
    interestRateMin: 10, interestRateMax: 18,
    processingFee: '1% - 3%', maxTenure: 84,
    minAmount: 50000, maxAmount: 25000000,
    processingTime: '2-5 days', isPopular: false,
    features: ['Rural financing leader', 'Vehicle loan specialist', 'Used vehicle loans', 'Pan-India dealer network'],
    commissionRates: [
      { loanType: 'car_loan', partnerCommission: 0.8, interestRate: '10% - 13%', maxAmount: 10000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'used_car_loan', partnerCommission: 1.0, interestRate: '11.5% - 15%', maxAmount: 5000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'commercial_vehicle_loan', partnerCommission: 0.8, interestRate: '10.5% - 15%', maxAmount: 25000000, minAmount: 200000, maxTenure: 84 },
      { loanType: 'tractor_loan', partnerCommission: 0.6, interestRate: '10% - 14%', maxAmount: 2000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'personal_loan', partnerCommission: 1.5, interestRate: '13% - 18%', maxAmount: 1500000, minAmount: 50000, maxTenure: 48 },
    ],
    avgTat: 3, activeLeads: 48, approvalRate: 60, totalDisbursed: '₹7.2 Cr',
    contactPerson: 'Vikrant Joshi', contactEmail: 'vikrant.j@mahindrafinance.com', contactPhone: '+91 98765 43228',
  },
  {
    name: 'Piramal Finance',
    code: 'PIRAMAL',
    status: 'inactive',
    supportedLoanTypes: ['home_loan', 'business_loan', 'lap', 'working_capital_loan'],
    interestRateMin: 10.5, interestRateMax: 17,
    processingFee: '1.5% - 3%', maxTenure: 240,
    minAmount: 200000, maxAmount: 50000000,
    processingTime: '5-10 days', isPopular: false,
    features: ['Structured finance', 'Real estate funding', 'Large ticket loans', 'Wholesale lending'],
    commissionRates: [
      { loanType: 'home_loan', partnerCommission: 0.6, interestRate: '10.5% - 12.5%', maxAmount: 50000000, minAmount: 500000, maxTenure: 240 },
      { loanType: 'business_loan', partnerCommission: 1.8, interestRate: '13% - 17%', maxAmount: 10000000, minAmount: 500000, maxTenure: 60 },
      { loanType: 'lap', partnerCommission: 0.8, interestRate: '11% - 14%', maxAmount: 25000000, minAmount: 500000, maxTenure: 180 },
    ],
    avgTat: 6, activeLeads: 0, approvalRate: 55, totalDisbursed: '₹2.5 Cr',
    contactPerson: 'Rohit Deshpande', contactEmail: 'rohit.d@piramal.com', contactPhone: '+91 98765 43229',
  },
  {
    name: 'IIFL Finance',
    code: 'IIFL',
    status: 'active',
    supportedLoanTypes: ['gold_loan', 'home_loan', 'personal_loan', 'business_loan', 'lap'],
    interestRateMin: 9.5, interestRateMax: 18,
    processingFee: '0.5% - 2%', maxTenure: 240,
    minAmount: 10000, maxAmount: 50000000,
    processingTime: '1-5 days', isPopular: false,
    features: ['Gold loan leader', 'Quick gold loan', 'Home loans in 48hrs', 'Pan-India branches'],
    commissionRates: [
      { loanType: 'gold_loan', partnerCommission: 0.5, interestRate: '9.5% - 15%', maxAmount: 10000000, minAmount: 10000, maxTenure: 36 },
      { loanType: 'home_loan', partnerCommission: 0.5, interestRate: '9.5% - 11%', maxAmount: 50000000, minAmount: 500000, maxTenure: 240 },
      { loanType: 'personal_loan', partnerCommission: 1.5, interestRate: '12% - 18%', maxAmount: 2000000, minAmount: 25000, maxTenure: 48 },
      { loanType: 'business_loan', partnerCommission: 1.8, interestRate: '13% - 18%', maxAmount: 5000000, minAmount: 200000, maxTenure: 48 },
      { loanType: 'lap', partnerCommission: 0.75, interestRate: '10.5% - 13%', maxAmount: 25000000, minAmount: 500000, maxTenure: 180 },
    ],
    avgTat: 2, activeLeads: 35, approvalRate: 70, totalDisbursed: '₹5.5 Cr',
    contactPerson: 'Akash Mittal', contactEmail: 'akash.m@iifl.com', contactPhone: '+91 98765 43230',
  },
  {
    name: 'Cholamandalam Finance',
    code: 'CHOLA',
    status: 'active',
    supportedLoanTypes: ['car_loan', 'used_car_loan', 'commercial_vehicle_loan', 'home_loan', 'lap', 'business_loan'],
    interestRateMin: 9.25, interestRateMax: 16,
    processingFee: '1% - 2%', maxTenure: 240,
    minAmount: 100000, maxAmount: 50000000,
    processingTime: '2-7 days', isPopular: false,
    features: ['Vehicle finance specialist', 'Murugappa Group company', 'Strong in semi-urban', 'Used vehicle leader'],
    commissionRates: [
      { loanType: 'car_loan', partnerCommission: 0.75, interestRate: '9.25% - 11.5%', maxAmount: 10000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'used_car_loan', partnerCommission: 1.0, interestRate: '11% - 14%', maxAmount: 5000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'commercial_vehicle_loan', partnerCommission: 0.8, interestRate: '10% - 14%', maxAmount: 25000000, minAmount: 200000, maxTenure: 84 },
      { loanType: 'home_loan', partnerCommission: 0.5, interestRate: '9.25% - 10.5%', maxAmount: 50000000, minAmount: 300000, maxTenure: 240 },
      { loanType: 'lap', partnerCommission: 0.75, interestRate: '10% - 13%', maxAmount: 25000000, minAmount: 500000, maxTenure: 180 },
      { loanType: 'business_loan', partnerCommission: 1.5, interestRate: '12% - 16%', maxAmount: 5000000, minAmount: 200000, maxTenure: 48 },
    ],
    avgTat: 3, activeLeads: 42, approvalRate: 66, totalDisbursed: '₹8.8 Cr',
    contactPerson: 'Subramaniam K.', contactEmail: 'subramaniam.k@chola.co.in', contactPhone: '+91 98765 43231',
  },
  {
    name: 'Sundaram Finance',
    code: 'SUNDARAM',
    status: 'active',
    supportedLoanTypes: ['car_loan', 'used_car_loan', 'commercial_vehicle_loan', 'home_loan', 'lap'],
    interestRateMin: 9.0, interestRateMax: 15,
    processingFee: '0.5% - 1.5%', maxTenure: 240,
    minAmount: 100000, maxAmount: 30000000,
    processingTime: '3-7 days', isPopular: false,
    features: ['AAA-rated NBFC', 'South India leader', 'Vehicle finance expert', 'High trust factor'],
    commissionRates: [
      { loanType: 'car_loan', partnerCommission: 0.7, interestRate: '9% - 11%', maxAmount: 10000000, minAmount: 100000, maxTenure: 84 },
      { loanType: 'used_car_loan', partnerCommission: 0.9, interestRate: '10.5% - 13%', maxAmount: 5000000, minAmount: 100000, maxTenure: 60 },
      { loanType: 'commercial_vehicle_loan', partnerCommission: 0.75, interestRate: '10% - 13.5%', maxAmount: 20000000, minAmount: 200000, maxTenure: 84 },
      { loanType: 'home_loan', partnerCommission: 0.45, interestRate: '9% - 10%', maxAmount: 30000000, minAmount: 300000, maxTenure: 240 },
    ],
    avgTat: 4, activeLeads: 15, approvalRate: 73, totalDisbursed: '₹3.9 Cr',
    contactPerson: 'Srinivas Rajan', contactEmail: 'srinivas.r@sundaramfinance.in', contactPhone: '+91 98765 43232',
  },
  {
    name: 'Manappuram Finance',
    code: 'MANAPPURAM',
    status: 'active',
    supportedLoanTypes: ['gold_loan', 'personal_loan', 'business_loan', 'two_wheeler_loan'],
    interestRateMin: 10, interestRateMax: 26,
    processingFee: '0 - 1%', maxTenure: 36,
    minAmount: 5000, maxAmount: 10000000,
    processingTime: '30 min - 1 day', isPopular: false,
    features: ['Instant gold loan', 'Online gold loan', 'Asirvad microfinance', 'Pan-India branches'],
    commissionRates: [
      { loanType: 'gold_loan', partnerCommission: 0.5, interestRate: '10% - 18%', maxAmount: 10000000, minAmount: 5000, maxTenure: 36 },
      { loanType: 'personal_loan', partnerCommission: 1.5, interestRate: '16% - 26%', maxAmount: 500000, minAmount: 10000, maxTenure: 36 },
      { loanType: 'two_wheeler_loan', partnerCommission: 1.0, interestRate: '14% - 20%', maxAmount: 300000, minAmount: 15000, maxTenure: 48 },
    ],
    avgTat: 1, activeLeads: 30, approvalRate: 88, totalDisbursed: '₹4.2 Cr',
    contactPerson: 'Jayesh Nair', contactEmail: 'jayesh.n@manappuram.com', contactPhone: '+91 98765 43233',
  },
];

// -- Main seed -----------------------------------------------------------------
async function seed() {
  let bankCount = 0;
  let commissionCount = 0;

  for (const bankData of banks) {
    // Upsert the bank by unique code
    const bank = await prisma.bank.upsert({
      where: { code: bankData.code },
      update: {
        name: bankData.name,
        status: bankData.status,
        supportedLoanTypes: bankData.supportedLoanTypes,
        interestRateMin: bankData.interestRateMin,
        interestRateMax: bankData.interestRateMax,
        processingFee: bankData.processingFee,
        maxTenure: bankData.maxTenure,
        minAmount: bankData.minAmount,
        maxAmount: bankData.maxAmount,
        processingTime: bankData.processingTime,
        isPopular: bankData.isPopular,
        features: bankData.features,
        avgTat: bankData.avgTat,
        activeLeads: bankData.activeLeads,
        approvalRate: bankData.approvalRate,
        totalDisbursed: bankData.totalDisbursed,
        contactPerson: bankData.contactPerson,
        contactEmail: bankData.contactEmail,
        contactPhone: bankData.contactPhone,
      },
      create: {
        name: bankData.name,
        code: bankData.code,
        status: bankData.status,
        supportedLoanTypes: bankData.supportedLoanTypes,
        interestRateMin: bankData.interestRateMin,
        interestRateMax: bankData.interestRateMax,
        processingFee: bankData.processingFee,
        maxTenure: bankData.maxTenure,
        minAmount: bankData.minAmount,
        maxAmount: bankData.maxAmount,
        processingTime: bankData.processingTime,
        isPopular: bankData.isPopular,
        features: bankData.features,
        avgTat: bankData.avgTat,
        activeLeads: bankData.activeLeads,
        approvalRate: bankData.approvalRate,
        totalDisbursed: bankData.totalDisbursed,
        contactPerson: bankData.contactPerson,
        contactEmail: bankData.contactEmail,
        contactPhone: bankData.contactPhone,
      },
    });
    bankCount++;

    // Upsert commission rates for this bank
    for (const rate of bankData.commissionRates) {
      await prisma.bankCommissionRate.upsert({
        where: {
          bankId_loanType: {
            bankId: bank.id,
            loanType: rate.loanType,
          },
        },
        update: {
          partnerCommission: rate.partnerCommission,
          interestRate: rate.interestRate ?? null,
          maxAmount: rate.maxAmount ?? null,
          minAmount: rate.minAmount ?? null,
          maxTenure: rate.maxTenure ?? null,
        },
        create: {
          bankId: bank.id,
          loanType: rate.loanType,
          partnerCommission: rate.partnerCommission,
          interestRate: rate.interestRate ?? null,
          maxAmount: rate.maxAmount ?? null,
          minAmount: rate.minAmount ?? null,
          maxTenure: rate.maxTenure ?? null,
        },
      });
      commissionCount++;
    }
  }

  console.log(`✅ Seeded ${bankCount} banks and ${commissionCount} commission rates.`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
