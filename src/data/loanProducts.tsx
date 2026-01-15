// Canonical Loan Products Registry
// Derived from serviceCategories in loanCategories.ts
// All loan types across Admin and Partner dashboards should reference this registry

import {
  CreditCard,
  FlashOn,
  Smartphone,
  Tv,
  Flight,
  Favorite,
  LocalHospital,
  Work,
  Business,
  AccountBalanceWallet,
  AccountBalance,
  TrendingDown,
  Description,
  Payments,
  Analytics,
  RocketLaunch,
  Settings,
  Build,
  Link,
  MedicalServices,
  Store,
  Home,
  Construction,
  Architecture,
  SwapHoriz,
  Add,
  LocationOn,
  HomeWork,
  Elderly,
  Factory,
  DriveEta,
  TwoWheeler,
  LocalShipping,
  Agriculture,
  Stars,
  Receipt,
  Diamond,
  TrendingUp,
  Shield,
  School,
  Public,
  Lock,
  MenuBook,
  Assignment,
  Language,
  AttachMoney,
  Inventory,
  Flag,
  Handshake,
  Verified,
  Grass,
  Nature,
  Science,
  Pets,
  Chair,
  Star,
  Today,
  Refresh,
  Warning,
  Engineering,
  CallMerge,
  CurrencyBitcoin,
  BatteryChargingFull,
  Recycling,
  WbSunny,
} from '@mui/icons-material';
import React from 'react';

export type LoanCategory =
  | 'personal'
  | 'business'
  | 'home'
  | 'property'
  | 'vehicle'
  | 'gold_securities'
  | 'education'
  | 'corporate'
  | 'government'
  | 'agriculture'
  | 'consumer'
  | 'short_term'
  | 'real_estate'
  | 'specialized';

export interface LoanProduct {
  code: string;
  label: string;
  shortLabel?: string;
  category: LoanCategory;
  icon?: string;
  aliases?: string[];
}

// Icon mapping function
export function getLoanIconComponent(iconName?: string, size: "small" | "inherit" | "large" | "medium" = "small"): React.ReactNode {
  if (!iconName) return null;

  const iconProps = { fontSize: size };

  switch (iconName) {
    case 'CreditCard': return <CreditCard {...iconProps} />;
    case 'Flash': return <FlashOn {...iconProps} />;
    case 'Smartphone': return <Smartphone {...iconProps} />;
    case 'Tv': return <Tv {...iconProps} />;
    case 'Flight': return <Flight {...iconProps} />;
    case 'Favorite': return <Favorite {...iconProps} />;
    case 'LocalHospital': return <LocalHospital {...iconProps} />;
    case 'Work': return <Work {...iconProps} />;
    case 'Business': return <Business {...iconProps} />;
    case 'AccountBalanceWallet': return <AccountBalanceWallet {...iconProps} />;
    case 'AccountBalance': return <AccountBalance {...iconProps} />;
    case 'TrendingDown': return <TrendingDown {...iconProps} />;
    case 'Description': return <Description {...iconProps} />;
    case 'Payments': return <Payments {...iconProps} />;
    case 'Analytics': return <Analytics {...iconProps} />;
    case 'RocketLaunch': return <RocketLaunch {...iconProps} />;
    case 'Settings': return <Settings {...iconProps} />;
    case 'Build': return <Build {...iconProps} />;
    case 'Link': return <Link {...iconProps} />;
    case 'MedicalServices': return <MedicalServices {...iconProps} />;
    case 'Store': return <Store {...iconProps} />;
    case 'Home': return <Home {...iconProps} />;
    case 'Construction': return <Construction {...iconProps} />;
    case 'Architecture': return <Architecture {...iconProps} />;
    case 'SwapHoriz': return <SwapHoriz {...iconProps} />;
    case 'Add': return <Add {...iconProps} />;
    case 'LocationOn': return <LocationOn {...iconProps} />;
    case 'HomeWork': return <HomeWork {...iconProps} />;
    case 'Elderly': return <Elderly {...iconProps} />;
    case 'Factory': return <Factory {...iconProps} />;
    case 'DriveEta': return <DriveEta {...iconProps} />;
    case 'TwoWheeler': return <TwoWheeler {...iconProps} />;
    case 'LocalShipping': return <LocalShipping {...iconProps} />;
    case 'Agriculture': return <Agriculture {...iconProps} />;
    case 'Stars': return <Stars {...iconProps} />;
    case 'Receipt': return <Receipt {...iconProps} />;
    case 'Diamond': return <Diamond {...iconProps} />;
    case 'TrendingUp': return <TrendingUp {...iconProps} />;
    case 'Shield': return <Shield {...iconProps} />;
    case 'School': return <School {...iconProps} />;
    case 'Public': return <Public {...iconProps} />;
    case 'Lock': return <Lock {...iconProps} />;
    case 'MenuBook': return <MenuBook {...iconProps} />;
    case 'Assignment': return <Assignment {...iconProps} />;
    case 'Language': return <Language {...iconProps} />;
    case 'AttachMoney': return <AttachMoney {...iconProps} />;
    case 'Inventory': return <Inventory {...iconProps} />;
    case 'Flag': return <Flag {...iconProps} />;
    case 'Handshake': return <Handshake {...iconProps} />;
    case 'Verified': return <Verified {...iconProps} />;
    case 'Grass': return <Grass {...iconProps} />;
    case 'Nature': return <Nature {...iconProps} />;
    case 'Science': return <Science {...iconProps} />;
    case 'Pets': return <Pets {...iconProps} />;
    case 'Chair': return <Chair {...iconProps} />;
    case 'Star': return <Star {...iconProps} />;
    case 'Today': return <Today {...iconProps} />;
    case 'Refresh': return <Refresh {...iconProps} />;
    case 'Warning': return <Warning {...iconProps} />;
    case 'Engineering': return <Engineering {...iconProps} />;
    case 'Bridge': return <CallMerge {...iconProps} />;
    case 'CurrencyBitcoin': return <CurrencyBitcoin {...iconProps} />;
    case 'BatteryChargingFull': return <BatteryChargingFull {...iconProps} />;
    case 'Eco': return <Recycling {...iconProps} />;
    case 'WbSunny': return <WbSunny {...iconProps} />;
    default: return <CreditCard {...iconProps} />;
  }
}

export const loanProducts: LoanProduct[] = [
  // ============ Personal Loans ============
  { code: 'personal_loan', label: 'Personal Loan – Salaried', shortLabel: 'Personal Loan', category: 'personal', icon: 'CreditCard' },
  { code: 'personal_loan_self_employed', label: 'Personal Loan – Self-employed', category: 'personal', icon: 'CreditCard' },
  { code: 'instant_personal_loan', label: 'Instant Personal Loan (Fintech)', category: 'personal', icon: 'FlashOn' },
  { code: 'credit_line', label: 'Credit Line', category: 'personal', icon: 'CreditCard', aliases: ['Slice', 'LazyPay', 'KreditBee'] },
  { code: 'stdl', label: 'Small Ticket Digital Loan (STDL)', category: 'personal', icon: 'Smartphone' },
  { code: 'consumer_durable_loan', label: 'Consumer Durable Loans (Electronics EMI)', category: 'personal', icon: 'Tv' },
  { code: 'travel_loan', label: 'Travel Loan', category: 'personal', icon: 'Flight' },
  { code: 'wedding_loan', label: 'Wedding Loan', category: 'personal', icon: 'Favorite' },
  { code: 'medical_loan', label: 'Medical Loan', category: 'personal', icon: 'LocalHospital' },
  { code: 'professional_loan', label: 'Professional Loan (CA/Doctor/Architect)', category: 'personal', icon: 'Work' },

  // ============ Business Loans ============
  { code: 'business_loan', label: 'Unsecured Business Loan', shortLabel: 'Business Loan', category: 'business', icon: 'Business' },
  { code: 'secured_business_loan', label: 'Secured Business Loan', category: 'business', icon: 'Business' },
  { code: 'working_capital_loan', label: 'Working Capital Loan', category: 'business', icon: 'AccountBalanceWallet' },
  { code: 'overdraft', label: 'Overdraft (OD) Facility', shortLabel: 'OD', category: 'business', icon: 'AccountBalance' },
  { code: 'cash_credit', label: 'Cash Credit (CC)', shortLabel: 'CC', category: 'business', icon: 'AccountBalance' },
  { code: 'dropline_od', label: 'Dropline Overdraft', category: 'business', icon: 'TrendingDown' },
  { code: 'invoice_financing', label: 'Invoice Financing / Bill Discounting', category: 'business', icon: 'Description' },
  { code: 'merchant_cash_advance', label: 'Merchant Cash Advance (POS-based)', category: 'business', icon: 'Payments' },
  { code: 'gst_business_loan', label: 'GST-based Business Loan', category: 'business', icon: 'Analytics' },
  { code: 'startup_loan', label: 'Startup Loan (Standup India / Mudra)', category: 'business', icon: 'RocketLaunch' },
  { code: 'machinery_loan', label: 'Machinery Loan', category: 'business', icon: 'Settings' },
  { code: 'equipment_finance', label: 'Equipment Finance', category: 'business', icon: 'Build' },
  { code: 'supply_chain_finance', label: 'Supply Chain Finance', category: 'business', icon: 'Link' },
  { code: 'professional_business_loan', label: 'Professional Business Loans (Doctors/CA/CS)', category: 'business', icon: 'MedicalServices' },
  { code: 'franchise_loan', label: 'Franchise Loan', category: 'business', icon: 'Store' },

  // ============ Home Loans ============
  { code: 'home_loan', label: 'Home Purchase Loan', shortLabel: 'Home Loan', category: 'home', icon: 'Home' },
  { code: 'home_construction_loan', label: 'Home Construction Loan', category: 'home', icon: 'Construction' },
  { code: 'home_renovation_loan', label: 'Home Renovation Loan', category: 'home', icon: 'Build' },
  { code: 'home_extension_loan', label: 'Home Extension Loan', category: 'home', icon: 'Architecture' },
  { code: 'home_loan_bt', label: 'Home Loan Balance Transfer', shortLabel: 'Home Loan BT', category: 'home', icon: 'SwapHoriz' },
  { code: 'topup_home_loan', label: 'Top-Up Home Loan', category: 'home', icon: 'Add' },

  // ============ Property-Backed Loans ============
  { code: 'lap', label: 'Loan Against Property (Residential)', shortLabel: 'LAP', category: 'property', icon: 'AccountBalance' },
  { code: 'lap_commercial', label: 'LAP – Commercial', category: 'property', icon: 'Business' },
  { code: 'plot_loan', label: 'Plot Loan', category: 'property', icon: 'LocationOn' },
  { code: 'lrd', label: 'Lease Rental Discounting (LRD)', shortLabel: 'LRD', category: 'property', icon: 'HomeWork' },
  { code: 'reverse_mortgage', label: 'Reverse Mortgage Loan (for seniors)', category: 'property', icon: 'Elderly' },
  { code: 'industrial_property_loan', label: 'Industrial Property Loan', category: 'property', icon: 'Factory' },

  // ============ Vehicle Loans ============
  { code: 'car_loan', label: 'Car Loan – New', shortLabel: 'Car Loan', category: 'vehicle', icon: 'DriveEta' },
  { code: 'used_car_loan', label: 'Car Loan – Used', category: 'vehicle', icon: 'DriveEta' },
  { code: 'two_wheeler_loan', label: 'Two-Wheeler Loan', category: 'vehicle', icon: 'TwoWheeler' },
  { code: 'commercial_vehicle_loan', label: 'Commercial Vehicle Loan', shortLabel: 'CV Loan', category: 'vehicle', icon: 'LocalShipping' },
  { code: 'tractor_loan', label: 'Tractor Loan', category: 'vehicle', icon: 'Agriculture' },
  { code: 'fleet_finance', label: 'Fleet Finance', category: 'vehicle', icon: 'LocalShipping' },

  // ============ Gold & Securities Loans ============
  { code: 'gold_loan', label: 'Gold Loan', category: 'gold_securities', icon: 'Stars' },
  { code: 'sgb_loan', label: 'Sovereign Gold Bond Loan', category: 'gold_securities', icon: 'Receipt' },
  { code: 'loan_against_fd', label: 'Loan Against FD', shortLabel: 'Loan vs FD', category: 'gold_securities', icon: 'Diamond' },
  { code: 'loan_against_mf', label: 'Loan Against Mutual Funds', shortLabel: 'Loan vs MF', category: 'gold_securities', icon: 'TrendingUp' },
  { code: 'loan_against_shares', label: 'Loan Against Shares', category: 'gold_securities', icon: 'Analytics' },
  { code: 'loan_against_insurance', label: 'Loan Against Insurance Policy', category: 'gold_securities', icon: 'Shield' },

  // ============ Education Loans ============
  { code: 'education_loan', label: 'Domestic Education Loan', shortLabel: 'Education Loan', category: 'education', icon: 'School' },
  { code: 'foreign_education_loan', label: 'Foreign Education Loan', category: 'education', icon: 'Public' },
  { code: 'secured_education_loan', label: 'Secured Education Loan (Collateral)', category: 'education', icon: 'Lock' },
  { code: 'unsecured_education_loan', label: 'Unsecured Education Loan', category: 'education', icon: 'MenuBook' },

  // ============ Corporate / Large Loans ============
  { code: 'term_loan', label: 'Term Loan', category: 'corporate', icon: 'Assignment' },
  { code: 'project_finance', label: 'Project Finance', category: 'corporate', icon: 'Construction' },
  { code: 'working_capital_large', label: 'Working Capital (Large Corp)', category: 'corporate', icon: 'AccountBalance' },
  { code: 'ecb', label: 'External Commercial Borrowing (ECB)', shortLabel: 'ECB', category: 'corporate', icon: 'Language' },
  { code: 'cash_flow_lending', label: 'Cash Flow-based Lending', category: 'corporate', icon: 'AttachMoney' },
  { code: 'asset_backed_finance', label: 'Asset-Backed Finance', category: 'corporate', icon: 'Inventory' },

  // ============ Government Scheme Loans ============
  { code: 'mudra_shishu', label: 'Mudra – Shishu (up to ₹50K)', category: 'government', icon: 'Flag' },
  { code: 'mudra_kishor', label: 'Mudra – Kishor (₹50K–₹5L)', category: 'government', icon: 'Flag' },
  { code: 'mudra_tarun', label: 'Mudra – Tarun (₹5L–₹10L)', category: 'government', icon: 'Flag' },
  { code: 'pmegp', label: 'PMEGP Loan', category: 'government', icon: 'AccountBalance' },
  { code: 'standup_india', label: 'Standup India Loan', category: 'government', icon: 'Handshake' },
  { code: 'pmay_home_loan', label: 'PMAY Subsidy-linked Home Loan', category: 'government', icon: 'Home' },
  { code: 'cgtmse', label: 'CGTMSE Guaranteed Loan', category: 'government', icon: 'Verified' },

  // ============ Agriculture Loans ============
  { code: 'kcc', label: 'Kisan Credit Card (KCC)', shortLabel: 'KCC', category: 'agriculture', icon: 'Grass' },
  { code: 'crop_loan', label: 'Crop Loan', category: 'agriculture', icon: 'Nature' },
  { code: 'seed_fertilizer_loan', label: 'Seed/Fertilizer Loan', category: 'agriculture', icon: 'Science' },
  { code: 'warehouse_receipt_finance', label: 'Warehouse Receipt Finance', category: 'agriculture', icon: 'Factory' },
  { code: 'dairy_poultry_loan', label: 'Dairy/Poultry Farm Loan', category: 'agriculture', icon: 'Pets' },
  { code: 'farm_equipment_loan', label: 'Farm Equipment Loan', category: 'agriculture', icon: 'Build' },

  // ============ Consumer & Retail Loans ============
  { code: 'emi_card_loan', label: 'EMI Card Loans', category: 'consumer', icon: 'CreditCard' },
  { code: 'mobile_electronics_emi', label: 'Mobile / Electronics EMI', category: 'consumer', icon: 'Smartphone' },
  { code: 'furniture_loan', label: 'Furniture Loan', category: 'consumer', icon: 'Chair' },
  { code: 'lifestyle_loan', label: 'Lifestyle Loan', category: 'consumer', icon: 'Star' },

  // ============ Salary & Short-Term Loans ============
  { code: 'advance_salary_loan', label: 'Advance Salary Loan', category: 'short_term', icon: 'Payments' },
  { code: 'payday_loan', label: 'Payday Loan (Fintech)', category: 'short_term', icon: 'Today' },
  { code: 'revolving_loc', label: 'Line of Credit (Revolving)', shortLabel: 'Revolving LOC', category: 'short_term', icon: 'Refresh' },
  { code: 'emergency_loan', label: 'Emergency Loan', category: 'short_term', icon: 'Warning' },

  // ============ Real Estate & Builder Loans ============
  { code: 'builder_finance', label: 'Builder Finance', category: 'real_estate', icon: 'Construction' },
  { code: 'construction_finance', label: 'Construction Finance', category: 'real_estate', icon: 'Engineering' },
  { code: 'plot_construction_loan', label: 'Plot + Construction Loan', category: 'real_estate', icon: 'Home' },
  { code: 'bridge_loan', label: 'Bridge Loan', category: 'real_estate', icon: 'CallMerge' },

  // ============ Specialized Loans ============
  { code: 'crypto_loan', label: 'Loan Against Cryptocurrency', category: 'specialized', icon: 'CurrencyBitcoin' },
  { code: 'ev_loan', label: 'EV Loan (Electric Vehicle)', shortLabel: 'EV Loan', category: 'specialized', icon: 'BatteryChargingFull' },
  { code: 'green_home_loan', label: 'Green Home Loan', category: 'specialized', icon: 'Recycling' },
  { code: 'solar_panel_loan', label: 'Solar Panel Loan', category: 'specialized', icon: 'WbSunny' },
  { code: 'medical_equipment_loan', label: 'Medical Equipment Loan', category: 'specialized', icon: 'MedicalServices' },
];

// Extract all loan codes as a type
export const loanProductCodes = loanProducts.map((p) => p.code);
export type LoanProductCode = (typeof loanProducts)[number]['code'];

// Category labels for UI display
export const categoryLabels: Record<LoanCategory, string> = {
  personal: 'Personal Loans',
  business: 'Business Loans',
  home: 'Home Loans',
  property: 'Property-Backed Loans',
  vehicle: 'Vehicle Loans',
  gold_securities: 'Gold & Securities Loans',
  education: 'Education Loans',
  corporate: 'Corporate / Large Loans',
  government: 'Government Scheme Loans',
  agriculture: 'Agriculture Loans',
  consumer: 'Consumer & Retail Loans',
  short_term: 'Salary & Short-Term Loans',
  real_estate: 'Real Estate & Builder Loans',
  specialized: 'Specialized Loans',
};

// Category order for consistent UI display
export const categoryOrder: LoanCategory[] = [
  'personal',
  'business',
  'home',
  'property',
  'vehicle',
  'gold_securities',
  'education',
  'corporate',
  'government',
  'agriculture',
  'consumer',
  'short_term',
  'real_estate',
  'specialized',
];

// ============ Helper Functions ============

/**
 * Get loan product by code
 */
export function getLoanProduct(code: string): LoanProduct | undefined {
  return loanProducts.find((p) => p.code === code);
}

/**
 * Get label for a loan code (uses shortLabel if available, else full label)
 */
export function getLoanLabel(code: string, useShort = false): string {
  const product = getLoanProduct(code);
  if (!product) return code;
  return useShort && product.shortLabel ? product.shortLabel : product.label;
}

/**
 * Get icon component for a loan code
 */
export function getLoanIcon(code: string, size: "small" | "inherit" | "large" | "medium" = "small"): React.ReactNode {
  const product = getLoanProduct(code);
  return getLoanIconComponent(product?.icon, size);
}

/**
 * Get products by category
 */
export function getProductsByCategory(category: LoanCategory): LoanProduct[] {
  return loanProducts.filter((p) => p.category === category);
}

/**
 * Get products grouped by category
 */
export function getProductsGroupedByCategory(): Record<LoanCategory, LoanProduct[]> {
  return categoryOrder.reduce(
    (acc, cat) => {
      acc[cat] = getProductsByCategory(cat);
      return acc;
    },
    {} as Record<LoanCategory, LoanProduct[]>
  );
}

/**
 * Get all categories that have at least one product
 */
export function getActiveCategories(): LoanCategory[] {
  const categoriesWithProducts = new Set(loanProducts.map((p) => p.category));
  return categoryOrder.filter((cat) => categoriesWithProducts.has(cat));
}

/**
 * Build a Record<code, label> for dropdowns and filters
 * Useful for backwards-compatible migration
 */
export function buildLoanTypeLabels(useShort = false): Record<string, string> {
  return loanProducts.reduce(
    (acc, p) => {
      acc[p.code] = useShort && p.shortLabel ? p.shortLabel : p.label;
      return acc;
    },
    {} as Record<string, string>
  );
}

/**
 * Build an array of { value, label, icon } for select/radio inputs
 */
export function buildLoanTypeOptions(): { value: string; label: string; icon: React.ReactNode }[] {
  return loanProducts.map((p) => ({
    value: p.code,
    label: p.shortLabel ?? p.label,
    icon: getLoanIconComponent(p.icon, "small"),
  }));
}

/**
 * Build options grouped by category (for grouped select inputs)
 */
export function buildGroupedLoanTypeOptions(): {
  category: LoanCategory;
  categoryLabel: string;
  options: { value: string; label: string; icon: React.ReactNode }[];
}[] {
  return categoryOrder.map((cat) => ({
    category: cat,
    categoryLabel: categoryLabels[cat],
    options: getProductsByCategory(cat).map((p) => ({
      value: p.code,
      label: p.shortLabel ?? p.label,
      icon: getLoanIconComponent(p.icon, "small"),
    })),
  }));
}

// ============ Legacy Support ============
// Original 6 loan types for backwards compatibility
export const legacyLoanTypes = [
  'home_loan',
  'personal_loan',
  'business_loan',
  'car_loan',
  'lap',
  'education_loan',
] as const;

export type LegacyLoanType = (typeof legacyLoanTypes)[number];

/**
 * Check if a code is one of the original 6 loan types
 */
export function isLegacyLoanType(code: string): code is LegacyLoanType {
  return legacyLoanTypes.includes(code as LegacyLoanType);
}

/**
 * Get display label for a loan type code
 * Convenience function that returns the full label or the code if not found
 * @param code - The loan product code
 * @returns The human-readable label for the loan type
 */
export function getLoanTypeLabel(code: string): string {
  const product = loanProducts.find((p) => p.code === code);
  return product?.label ?? code;
}

/**
 * Pre-built mapping of loan codes to labels for backwards compatibility
 * Use this for static mappings in components that need the full object
 */
export const loanTypeLabels: Record<string, string> = loanProducts.reduce(
  (acc, p) => {
    acc[p.code] = p.label;
    return acc;
  },
  {} as Record<string, string>
);
