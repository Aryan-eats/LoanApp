// Icon rendering for loan products.
// Only import this module when you need to render loan icons.
// For data/labels only, import from './loanProductsData' instead.

import React from 'react';
import {
  Armchair,
  ArrowLeftRight,
  BadgeCheck,
  BadgeIndianRupee,
  BatteryCharging,
  Bike,
  Bitcoin,
  BookOpen,
  BriefcaseBusiness,
  Building,
  CalendarDays,
  Car,
  ChartNoAxesCombined,
  ClipboardList,
  Construction,
  CreditCard,
  Diamond,
  DraftingCompass,
  Factory,
  FileText,
  Flag,
  FlaskConical,
  GitMerge,
  Globe,
  GraduationCap,
  HandCoins,
  Handshake,
  HardHat,
  Heart,
  Home,
  Hospital,
  Landmark,
  Languages,
  Leaf,
  Link as LinkIcon,
  Lock,
  MapPin,
  Package,
  PawPrint,
  PersonStanding,
  Plane,
  Plus,
  Receipt,
  Recycle,
  RefreshCw,
  Rocket,
  Settings,
  Shield,
  Smartphone,
  Sprout,
  Star,
  Stars,
  Stethoscope,
  Store,
  Sun,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
  Tv,
  Wallet,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import {
  loanProducts,
  getLoanProduct,
  getProductsByCategory,
  categoryOrder,
  categoryLabels,
  type LoanCategory,
} from './loanProductsData';

type IconSize = 'small' | 'inherit' | 'large' | 'medium';

const getIconProps = (size: IconSize): LucideProps => {
  if (size === 'inherit') return {};
  if (size === 'large') return { size: 28 };
  if (size === 'medium') return { size: 22 };
  return { size: 18 };
};

const loanIconComponents: Record<string, LucideIcon> = {
  AccountBalance: Landmark,
  AccountBalanceWallet: Wallet,
  Add: Plus,
  Analytics: ChartNoAxesCombined,
  Architecture: DraftingCompass,
  Agriculture: Wheat,
  Assignment: ClipboardList,
  AttachMoney: BadgeIndianRupee,
  BatteryChargingFull: BatteryCharging,
  Bridge: GitMerge,
  Build: Wrench,
  Business: BriefcaseBusiness,
  Chair: Armchair,
  Construction,
  CreditCard,
  CurrencyBitcoin: Bitcoin,
  Description: FileText,
  Diamond,
  DriveEta: Car,
  Eco: Recycle,
  Elderly: PersonStanding,
  Engineering: HardHat,
  Factory,
  Favorite: Heart,
  Flag,
  Flash: Zap,
  FlashOn: Zap,
  Flight: Plane,
  Grass: Sprout,
  Handshake,
  Home,
  HomeWork: Building,
  Inventory: Package,
  Language: Languages,
  Link: LinkIcon,
  Lock,
  LocalHospital: Hospital,
  LocalShipping: Truck,
  LocationOn: MapPin,
  MedicalServices: Stethoscope,
  MenuBook: BookOpen,
  Nature: Leaf,
  Payments: HandCoins,
  Pets: PawPrint,
  Public: Globe,
  Receipt,
  Refresh: RefreshCw,
  RocketLaunch: Rocket,
  School: GraduationCap,
  Science: FlaskConical,
  Settings,
  Shield,
  Smartphone,
  Star,
  Stars,
  Store,
  SwapHoriz: ArrowLeftRight,
  Today: CalendarDays,
  TrendingDown,
  TrendingUp,
  Tv,
  TwoWheeler: Bike,
  Verified: BadgeCheck,
  Warning: TriangleAlert,
  WbSunny: Sun,
  Work: BriefcaseBusiness,
};

export function getLoanIconComponent(iconName?: string, size: IconSize = 'small'): React.ReactNode {
  if (!iconName) return null;

  const Icon = loanIconComponents[iconName] ?? CreditCard;
  const iconProps = getIconProps(size);
  return <Icon {...iconProps} />;
}

export function getLoanIcon(code: string, size: IconSize = 'small'): React.ReactNode {
  const product = getLoanProduct(code);
  return getLoanIconComponent(product?.icon, size);
}

export function buildLoanTypeOptions(): { value: string; label: string; icon: React.ReactNode }[] {
  return loanProducts.map((p) => ({
    value: p.code,
    label: p.shortLabel ?? p.label,
    icon: getLoanIconComponent(p.icon, 'small'),
  }));
}

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
      icon: getLoanIconComponent(p.icon, 'small'),
    })),
  }));
}
