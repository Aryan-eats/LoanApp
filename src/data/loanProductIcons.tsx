// Icon rendering for loan products - imports @mui/icons-material.
// Only import this module when you need to render loan icons.
// For data/labels only, import from './loanProductsData' instead.

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
import {
  loanProducts,
  getLoanProduct,
  getProductsByCategory,
  categoryOrder,
  categoryLabels,
  type LoanCategory,
} from './loanProductsData';

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

/**
 * Get icon component for a loan code
 */
export function getLoanIcon(code: string, size: "small" | "inherit" | "large" | "medium" = "small"): React.ReactNode {
  const product = getLoanProduct(code);
  return getLoanIconComponent(product?.icon, size);
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
