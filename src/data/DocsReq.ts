/**
 * DocsReq.ts
 * Mock data: Documents required per loan type, scoped per partner type.
 *
 * Structure:
 *  - DocumentRequirement   → a single document item
 *  - LoanDocSet            → grouped document requirements for one loan type
 *  - PartnerDocMatrix      → eligible loan types + doc sets for a partner type
 */

import type { LoanCategory } from './loanProductsData';
import type { PartnerType } from '../types/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ApplicantProfile = 'salaried' | 'self_employed' | 'business_owner' | 'professional';

export interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  mandatory: boolean;
  /** accepted formats, e.g. ['pdf', 'jpg', 'png'] */
  acceptedFormats: string[];
  maxSizeMB: number;
}

export interface DocGroup {
  groupLabel: string;
  /** which applicant profiles this group applies to; empty = all */
  applicableFor: ApplicantProfile[];
  docs: DocumentRequirement[];
}

export interface LoanDocSet {
  loanCode: string;
  loanLabel: string;
  category: LoanCategory;
  docGroups: DocGroup[];
}

export interface PartnerDocMatrix {
  partnerType: PartnerType;
  partnerLabel: string;
  description: string;
  /** loan codes this partner type is eligible to source */
  eligibleLoanCodes: string[];
  /** full document requirement sets for each eligible loan */
  loanDocSets: LoanDocSet[];
}

// ---------------------------------------------------------------------------
// Reusable document blocks
// ---------------------------------------------------------------------------

const kycDocs: DocumentRequirement[] = [
  {
    id: 'aadhaar',
    name: 'Aadhaar Card',
    description: 'Front and back copy',
    mandatory: true,
    acceptedFormats: ['pdf', 'jpg', 'png'],
    maxSizeMB: 5,
  },
  {
    id: 'pan',
    name: 'PAN Card',
    mandatory: true,
    acceptedFormats: ['pdf', 'jpg', 'png'],
    maxSizeMB: 5,
  },
  {
    id: 'photo',
    name: 'Passport-size Photograph',
    mandatory: true,
    acceptedFormats: ['jpg', 'png'],
    maxSizeMB: 2,
  },
  {
    id: 'address_proof',
    name: 'Address Proof',
    description: 'Utility bill / rent agreement / voter ID (not older than 3 months)',
    mandatory: true,
    acceptedFormats: ['pdf', 'jpg', 'png'],
    maxSizeMB: 5,
  },
];

const salariedIncomeDocs: DocumentRequirement[] = [
  {
    id: 'salary_slip_3m',
    name: 'Last 3 Months Salary Slips',
    mandatory: true,
    acceptedFormats: ['pdf', 'jpg'],
    maxSizeMB: 10,
  },
  {
    id: 'bank_stmt_6m',
    name: 'Bank Statement (6 months – salary account)',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'form16',
    name: 'Form 16 / ITR (last 2 years)',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'employment_letter',
    name: 'Employment Letter / Offer Letter',
    mandatory: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 5,
  },
];

const selfEmployedIncomeDocs: DocumentRequirement[] = [
  {
    id: 'itr_2y',
    name: 'ITR with Computation (last 2 years)',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'pl_bs_2y',
    name: 'Audited P&L and Balance Sheet (last 2 years)',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'bank_stmt_12m',
    name: 'Bank Statement (12 months – current/savings account)',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 15,
  },
  {
    id: 'gst_returns_6m',
    name: 'GST Returns (last 6 months)',
    mandatory: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
];

const businessEntityDocs: DocumentRequirement[] = [
  {
    id: 'business_reg',
    name: 'Business Registration Certificate',
    description: 'Sole prop declaration / partnership deed / MOA-AOA / COI',
    mandatory: true,
    acceptedFormats: ['pdf', 'jpg'],
    maxSizeMB: 5,
  },
  {
    id: 'gst_reg',
    name: 'GST Registration Certificate',
    mandatory: false,
    acceptedFormats: ['pdf', 'jpg'],
    maxSizeMB: 5,
  },
  {
    id: 'udyam_reg',
    name: 'Udyam / MSME Registration Certificate',
    mandatory: false,
    acceptedFormats: ['pdf', 'jpg'],
    maxSizeMB: 5,
  },
  {
    id: 'trade_licence',
    name: 'Trade Licence / Shops & Establishment Certificate',
    mandatory: false,
    acceptedFormats: ['pdf', 'jpg'],
    maxSizeMB: 5,
  },
];

const residentialPropertyDocs: DocumentRequirement[] = [
  {
    id: 'sale_deed',
    name: 'Sale Deed / Agreement to Sell',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 20,
  },
  {
    id: 'title_chain',
    name: 'Chain of Title Documents (last 30 years)',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 30,
  },
  {
    id: 'approved_plan',
    name: 'Approved Building Plan',
    mandatory: true,
    acceptedFormats: ['pdf', 'jpg'],
    maxSizeMB: 20,
  },
  {
    id: 'property_tax_receipt',
    name: 'Latest Property Tax Receipt',
    mandatory: true,
    acceptedFormats: ['pdf', 'jpg'],
    maxSizeMB: 5,
  },
  {
    id: 'encumbrance_cert',
    name: 'Encumbrance Certificate (EC)',
    mandatory: true,
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
  },
  {
    id: 'noc_society',
    name: 'NOC from Society / Builder',
    mandatory: false,
    acceptedFormats: ['pdf'],
    maxSizeMB: 5,
  },
  {
    id: 'oc_cc',
    name: 'Occupancy Certificate / Completion Certificate',
    mandatory: false,
    acceptedFormats: ['pdf', 'jpg'],
    maxSizeMB: 10,
  },
];

// ---------------------------------------------------------------------------
// Loan-type-specific DocSets
// ---------------------------------------------------------------------------

const personalLoanSalariedDocSet: LoanDocSet = {
  loanCode: 'personal_loan',
  loanLabel: 'Personal Loan – Salaried',
  category: 'personal',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    {
      groupLabel: 'Income Documents',
      applicableFor: ['salaried'],
      docs: salariedIncomeDocs,
    },
  ],
};

const personalLoanSelfEmpDocSet: LoanDocSet = {
  loanCode: 'personal_loan_self_employed',
  loanLabel: 'Personal Loan – Self-employed',
  category: 'personal',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    {
      groupLabel: 'Income Documents',
      applicableFor: ['self_employed'],
      docs: selfEmployedIncomeDocs,
    },
    { groupLabel: 'Business Documents', applicableFor: ['self_employed'], docs: businessEntityDocs },
  ],
};

const professionalLoanDocSet: LoanDocSet = {
  loanCode: 'professional_loan',
  loanLabel: 'Professional Loan (CA / Doctor / Architect)',
  category: 'personal',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    {
      groupLabel: 'Professional Qualification / Registration',
      applicableFor: ['professional'],
      docs: [
        {
          id: 'professional_cert',
          name: 'Professional Degree / Registration Certificate',
          description: 'ICAI / MCI / COA registration as applicable',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
        {
          id: 'practice_proof',
          name: 'Proof of Practice (visiting card / clinic photos / office lease)',
          mandatory: false,
          acceptedFormats: ['pdf', 'jpg', 'png'],
          maxSizeMB: 10,
        },
      ],
    },
    { groupLabel: 'Income Documents', applicableFor: ['professional'], docs: selfEmployedIncomeDocs },
  ],
};

const businessLoanDocSet: LoanDocSet = {
  loanCode: 'business_loan',
  loanLabel: 'Unsecured Business Loan',
  category: 'business',
  docGroups: [
    { groupLabel: 'KYC Documents (Promoter/Director)', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Business Entity Documents', applicableFor: ['business_owner'], docs: businessEntityDocs },
    {
      groupLabel: 'Financial Documents',
      applicableFor: ['business_owner', 'self_employed'],
      docs: selfEmployedIncomeDocs,
    },
  ],
};

const workingCapitalDocSet: LoanDocSet = {
  loanCode: 'working_capital_loan',
  loanLabel: 'Working Capital Loan',
  category: 'business',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Business Entity Documents', applicableFor: ['business_owner'], docs: businessEntityDocs },
    { groupLabel: 'Financial Documents', applicableFor: ['business_owner'], docs: selfEmployedIncomeDocs },
    {
      groupLabel: 'Trade / Operational Documents',
      applicableFor: ['business_owner'],
      docs: [
        {
          id: 'stock_statement',
          name: 'Stock Statement (last 3 months)',
          mandatory: true,
          acceptedFormats: ['pdf', 'xlsx'],
          maxSizeMB: 10,
        },
        {
          id: 'debtor_creditor_stmt',
          name: 'Debtors & Creditors Statement',
          mandatory: false,
          acceptedFormats: ['pdf', 'xlsx'],
          maxSizeMB: 10,
        },
        {
          id: 'existing_banking',
          name: 'Existing Banking Facility Sanction Letter',
          mandatory: false,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
      ],
    },
  ],
};

const gstBusinessLoanDocSet: LoanDocSet = {
  loanCode: 'gst_business_loan',
  loanLabel: 'GST-based Business Loan',
  category: 'business',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Business Entity Documents', applicableFor: ['business_owner'], docs: businessEntityDocs },
    {
      groupLabel: 'GST & Financial Documents',
      applicableFor: ['business_owner'],
      docs: [
        {
          id: 'gst_returns_12m',
          name: 'GST Returns (GSTR-1 & GSTR-3B) – last 12 months',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 20,
        },
        {
          id: 'bank_stmt_12m_gst',
          name: 'Bank Statement – 12 months',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 15,
        },
        {
          id: 'itr_gst',
          name: 'ITR – last 1-2 years (if available)',
          mandatory: false,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
      ],
    },
  ],
};

const homeLoanDocSet: LoanDocSet = {
  loanCode: 'home_loan',
  loanLabel: 'Home Purchase Loan',
  category: 'home',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed)',
      applicableFor: ['self_employed', 'business_owner'],
      docs: selfEmployedIncomeDocs,
    },
    { groupLabel: 'Property Documents', applicableFor: [], docs: residentialPropertyDocs },
    {
      groupLabel: 'Additional – Home Loan',
      applicableFor: [],
      docs: [
        {
          id: 'allotment_letter',
          name: 'Builder Allotment Letter / Possession Letter',
          mandatory: false,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
        {
          id: 'cost_breakup',
          name: 'Cost Breakup / Builder Agreement',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
      ],
    },
  ],
};

const homeRenovationDocSet: LoanDocSet = {
  loanCode: 'home_renovation_loan',
  loanLabel: 'Home Renovation Loan',
  category: 'home',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed)',
      applicableFor: ['self_employed', 'business_owner'],
      docs: selfEmployedIncomeDocs,
    },
    {
      groupLabel: 'Property & Renovation Documents',
      applicableFor: [],
      docs: [
        {
          id: 'ownership_proof',
          name: 'Property Ownership Proof (title deed / sale deed)',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 20,
        },
        {
          id: 'renovation_estimate',
          name: 'Renovation Cost Estimate / Contractor Quote',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 10,
        },
        {
          id: 'property_tax_receipt',
          name: 'Property Tax Receipt (latest)',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
      ],
    },
  ],
};

const homeLoanBTDocSet: LoanDocSet = {
  loanCode: 'home_loan_bt',
  loanLabel: 'Home Loan Balance Transfer',
  category: 'home',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed)',
      applicableFor: ['self_employed', 'business_owner'],
      docs: selfEmployedIncomeDocs,
    },
    { groupLabel: 'Property Documents', applicableFor: [], docs: residentialPropertyDocs },
    {
      groupLabel: 'Existing Loan Documents',
      applicableFor: [],
      docs: [
        {
          id: 'existing_sanction_letter',
          name: 'Existing Home Loan Sanction Letter',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
        {
          id: 'loan_account_stmt',
          name: 'Loan Account Statement (24 months)',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
        {
          id: 'foreclosure_letter',
          name: 'Foreclosure / Outstanding Amount Letter',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 5,
        },
      ],
    },
  ],
};

const lapDocSet: LoanDocSet = {
  loanCode: 'lap',
  loanLabel: 'Loan Against Property (Residential)',
  category: 'property',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed / Business)',
      applicableFor: ['self_employed', 'business_owner'],
      docs: selfEmployedIncomeDocs,
    },
    { groupLabel: 'Collateral Property Documents', applicableFor: [], docs: residentialPropertyDocs },
  ],
};

const plotLoanDocSet: LoanDocSet = {
  loanCode: 'plot_loan',
  loanLabel: 'Plot Loan',
  category: 'property',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed)',
      applicableFor: ['self_employed', 'business_owner'],
      docs: selfEmployedIncomeDocs,
    },
    {
      groupLabel: 'Plot / Land Documents',
      applicableFor: [],
      docs: [
        {
          id: 'plot_sale_deed',
          name: 'Plot Sale Deed / Agreement',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 20,
        },
        {
          id: 'land_title_chain',
          name: 'Chain of Title / Mutation Records',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 20,
        },
        {
          id: 'land_map',
          name: 'Survey Map / Khasra / Khatauni',
          mandatory: false,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 10,
        },
        {
          id: 'na_order',
          name: 'Non-Agricultural (NA) Order / Conversion Certificate',
          mandatory: false,
          acceptedFormats: ['pdf'],
          maxSizeMB: 5,
        },
      ],
    },
  ],
};

const carLoanNewDocSet: LoanDocSet = {
  loanCode: 'car_loan',
  loanLabel: 'Car Loan – New',
  category: 'vehicle',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed)',
      applicableFor: ['self_employed', 'business_owner'],
      docs: selfEmployedIncomeDocs,
    },
    {
      groupLabel: 'Vehicle Documents',
      applicableFor: [],
      docs: [
        {
          id: 'car_proforma_invoice',
          name: 'Proforma Invoice from Dealer',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
        {
          id: 'car_quotation',
          name: 'Vehicle Quotation (on-road price breakup)',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 5,
        },
      ],
    },
  ],
};

const usedCarLoanDocSet: LoanDocSet = {
  loanCode: 'used_car_loan',
  loanLabel: 'Car Loan – Used',
  category: 'vehicle',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed)',
      applicableFor: ['self_employed', 'business_owner'],
      docs: selfEmployedIncomeDocs,
    },
    {
      groupLabel: 'Used Vehicle Documents',
      applicableFor: [],
      docs: [
        {
          id: 'rc_book',
          name: 'Registration Certificate (RC Book)',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
        {
          id: 'vehicle_insurance',
          name: 'Comprehensive Vehicle Insurance Policy',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
        {
          id: 'vehicle_valuation',
          name: 'Vehicle Valuation Report (from certified valuer)',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 5,
        },
        {
          id: 'form_29_30',
          name: 'Form 29 & 30 (Transfer of Ownership)',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
        {
          id: 'noc_seller',
          name: 'NOC from Seller / Previous Owner',
          mandatory: false,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 3,
        },
      ],
    },
  ],
};

const twoWheelerLoanDocSet: LoanDocSet = {
  loanCode: 'two_wheeler_loan',
  loanLabel: 'Two-Wheeler Loan',
  category: 'vehicle',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed)',
      applicableFor: ['self_employed'],
      docs: selfEmployedIncomeDocs,
    },
    {
      groupLabel: 'Vehicle Documents',
      applicableFor: [],
      docs: [
        {
          id: 'tw_proforma',
          name: 'Proforma Invoice / Quotation from Dealer',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
      ],
    },
  ],
};

const evLoanDocSet: LoanDocSet = {
  loanCode: 'ev_loan',
  loanLabel: 'EV Loan (Electric Vehicle)',
  category: 'specialized',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
    {
      groupLabel: 'Income Documents (Self-employed)',
      applicableFor: ['self_employed', 'business_owner'],
      docs: selfEmployedIncomeDocs,
    },
    {
      groupLabel: 'EV-specific Documents',
      applicableFor: [],
      docs: [
        {
          id: 'ev_invoice',
          name: 'EV Proforma Invoice (OEM / dealer)',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
        {
          id: 'fame_subsidy_proof',
          name: 'FAME-II Subsidy Eligibility Document (if applicable)',
          mandatory: false,
          acceptedFormats: ['pdf'],
          maxSizeMB: 5,
        },
      ],
    },
  ],
};

const educationLoanDocSet: LoanDocSet = {
  loanCode: 'education_loan',
  loanLabel: 'Domestic Education Loan',
  category: 'education',
  docGroups: [
    { groupLabel: 'KYC Documents (Student / Co-applicant)', applicableFor: [], docs: kycDocs },
    {
      groupLabel: 'Academic & Admission Documents',
      applicableFor: [],
      docs: [
        {
          id: 'admission_letter',
          name: 'Admission / Offer Letter from Institution',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 5,
        },
        {
          id: 'fee_structure',
          name: 'Official Fee Structure / Course Cost Breakup',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 5,
        },
        {
          id: 'academic_records',
          name: 'Academic Records (10th, 12th, last qualifying exam marksheets)',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 10,
        },
        {
          id: 'entrance_result',
          name: 'Entrance Exam Score Card (JEE / NEET / GMAT / GRE, if applicable)',
          mandatory: false,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
      ],
    },
    {
      groupLabel: 'Co-applicant Income Documents (Parent / Guardian)',
      applicableFor: ['salaried'],
      docs: salariedIncomeDocs,
    },
    {
      groupLabel: 'Co-applicant Income Documents (Self-employed)',
      applicableFor: ['self_employed'],
      docs: selfEmployedIncomeDocs,
    },
  ],
};

const goldLoanDocSet: LoanDocSet = {
  loanCode: 'gold_loan',
  loanLabel: 'Gold Loan',
  category: 'gold_securities',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    {
      groupLabel: 'Gold / Collateral Documents',
      applicableFor: [],
      docs: [
        {
          id: 'gold_purity_cert',
          name: 'Gold Purity Certificate (from lender appraiser)',
          description: 'Typically done at branch — submit any prior certificate if available',
          mandatory: false,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
        {
          id: 'purchase_receipt',
          name: 'Original Purchase Receipt / Invoice of Gold (if available)',
          mandatory: false,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
      ],
    },
  ],
};

const builderFinanceDocSet: LoanDocSet = {
  loanCode: 'builder_finance',
  loanLabel: 'Builder Finance',
  category: 'real_estate',
  docGroups: [
    { groupLabel: 'KYC Documents (Promoter / Director)', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Business Entity Documents', applicableFor: ['business_owner'], docs: businessEntityDocs },
    { groupLabel: 'Financial Documents', applicableFor: ['business_owner'], docs: selfEmployedIncomeDocs },
    {
      groupLabel: 'Project & Regulatory Documents',
      applicableFor: [],
      docs: [
        {
          id: 'rera_reg',
          name: 'RERA Registration Certificate',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 10,
        },
        {
          id: 'approved_layout',
          name: 'Approved Layout Plan / Sanction Plan',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 20,
        },
        {
          id: 'land_title_builder',
          name: 'Clear Title of Land (Sale Deed / Lease Deed)',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 20,
        },
        {
          id: 'project_report',
          name: 'Detailed Project Report (DPR)',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 20,
        },
        {
          id: 'cost_estimate',
          name: 'Construction Cost Estimate from Architect / Approved Valuer',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
        {
          id: 'env_clearance',
          name: 'Environmental Clearance (for projects > 20,000 sq m)',
          mandatory: false,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
      ],
    },
  ],
};

const constructionFinanceDocSet: LoanDocSet = {
  loanCode: 'construction_finance',
  loanLabel: 'Construction Finance',
  category: 'real_estate',
  docGroups: [
    { groupLabel: 'KYC Documents (Promoter / Director)', applicableFor: [], docs: kycDocs },
    { groupLabel: 'Business Entity Documents', applicableFor: ['business_owner'], docs: businessEntityDocs },
    { groupLabel: 'Financial Documents', applicableFor: ['business_owner'], docs: selfEmployedIncomeDocs },
    {
      groupLabel: 'Construction & Land Documents',
      applicableFor: [],
      docs: [
        {
          id: 'land_deed_cf',
          name: 'Land Ownership Documents (Sale Deed / Lease)',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 20,
        },
        {
          id: 'building_sanction_cf',
          name: 'Building Sanction / Municipal Approval',
          mandatory: true,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 10,
        },
        {
          id: 'construction_estimate_cf',
          name: 'Construction Cost Estimate & Plan',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
      ],
    },
  ],
};

const mudraDocSet: LoanDocSet = {
  loanCode: 'mudra_kishor',
  loanLabel: 'Mudra – Kishor (₹50K – ₹5L)',
  category: 'government',
  docGroups: [
    { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
    {
      groupLabel: 'Business & Income Documents',
      applicableFor: ['self_employed', 'business_owner'],
      docs: [
        ...businessEntityDocs,
        {
          id: 'mudra_application',
          name: 'Mudra Loan Application Form',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 5,
        },
        {
          id: 'bank_stmt_6m_mudra',
          name: 'Bank Statement – 6 months',
          mandatory: true,
          acceptedFormats: ['pdf'],
          maxSizeMB: 10,
        },
        {
          id: 'quotation_machinery',
          name: 'Quotation for Machinery / Equipment (if applicable)',
          mandatory: false,
          acceptedFormats: ['pdf', 'jpg'],
          maxSizeMB: 5,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Partner Document Matrices
// ---------------------------------------------------------------------------

export const partnerDocMatrices: PartnerDocMatrix[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. FREELANCER (General DSA)
  // ─────────────────────────────────────────────────────────────────────────
  {
    partnerType: 'freelancer',
    partnerLabel: 'Freelancer / General DSA',
    description:
      'Independent agents who source across all retail loan products — personal, business, home, LAP, vehicle, education, gold and government scheme loans.',
    eligibleLoanCodes: [
      'personal_loan',
      'personal_loan_self_employed',
      'professional_loan',
      'business_loan',
      'working_capital_loan',
      'gst_business_loan',
      'home_loan',
      'home_renovation_loan',
      'home_loan_bt',
      'lap',
      'plot_loan',
      'car_loan',
      'used_car_loan',
      'two_wheeler_loan',
      'education_loan',
      'gold_loan',
      'mudra_kishor',
      'ev_loan',
    ],
    loanDocSets: [
      personalLoanSalariedDocSet,
      personalLoanSelfEmpDocSet,
      professionalLoanDocSet,
      businessLoanDocSet,
      workingCapitalDocSet,
      gstBusinessLoanDocSet,
      homeLoanDocSet,
      homeRenovationDocSet,
      homeLoanBTDocSet,
      lapDocSet,
      plotLoanDocSet,
      carLoanNewDocSet,
      usedCarLoanDocSet,
      twoWheelerLoanDocSet,
      educationLoanDocSet,
      goldLoanDocSet,
      mudraDocSet,
      evLoanDocSet,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CAR DEALER (New Car)
  // ─────────────────────────────────────────────────────────────────────────
  {
    partnerType: 'car_dealer',
    partnerLabel: 'New Car Dealer',
    description:
      'Authorised new-vehicle showrooms sourcing new car loans, two-wheeler loans, and EV loans for walk-in customers.',
    eligibleLoanCodes: ['car_loan', 'two_wheeler_loan', 'ev_loan'],
    loanDocSets: [carLoanNewDocSet, twoWheelerLoanDocSet, evLoanDocSet],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. USED CAR DEALER
  // ─────────────────────────────────────────────────────────────────────────
  {
    partnerType: 'used_car_dealer',
    partnerLabel: 'Used Car Dealer',
    description:
      'Pre-owned vehicle dealers sourcing used car loans and related working capital for their business inventory.',
    eligibleLoanCodes: ['used_car_loan', 'business_loan', 'working_capital_loan'],
    loanDocSets: [
      usedCarLoanDocSet,
      {
        ...businessLoanDocSet,
        loanLabel: 'Business Loan (Dealer Inventory Finance)',
      },
      workingCapitalDocSet,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PROPERTY DEALER
  // ─────────────────────────────────────────────────────────────────────────
  {
    partnerType: 'property_dealer',
    partnerLabel: 'Property Dealer / Real-estate Agent',
    description:
      'Licensed real-estate agents sourcing home loans, LAP, plot loans, BT cases, and renovation loans for property buyers.',
    eligibleLoanCodes: [
      'home_loan',
      'home_renovation_loan',
      'home_extension_loan',
      'home_loan_bt',
      'topup_home_loan',
      'lap',
      'plot_loan',
    ],
    loanDocSets: [
      homeLoanDocSet,
      homeRenovationDocSet,
      {
        loanCode: 'home_extension_loan',
        loanLabel: 'Home Extension Loan',
        category: 'home',
        docGroups: [
          { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
          { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
          {
            groupLabel: 'Income Documents (Self-employed)',
            applicableFor: ['self_employed', 'business_owner'],
            docs: selfEmployedIncomeDocs,
          },
          {
            groupLabel: 'Property & Extension Documents',
            applicableFor: [],
            docs: [
              {
                id: 'existing_title_deed',
                name: 'Existing Property Title Deed',
                mandatory: true,
                acceptedFormats: ['pdf'],
                maxSizeMB: 20,
              },
              {
                id: 'extension_plan',
                name: 'Approved Extension Plan from Municipal Authority',
                mandatory: true,
                acceptedFormats: ['pdf', 'jpg'],
                maxSizeMB: 10,
              },
              {
                id: 'extension_estimate',
                name: 'Extension Cost Estimate from Architect',
                mandatory: true,
                acceptedFormats: ['pdf'],
                maxSizeMB: 10,
              },
              {
                id: 'property_tax_ext',
                name: 'Property Tax Receipt (latest)',
                mandatory: true,
                acceptedFormats: ['pdf', 'jpg'],
                maxSizeMB: 5,
              },
            ],
          },
        ],
      },
      homeLoanBTDocSet,
      {
        loanCode: 'topup_home_loan',
        loanLabel: 'Top-Up Home Loan',
        category: 'home',
        docGroups: [
          { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
          { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
          {
            groupLabel: 'Income Documents (Self-employed)',
            applicableFor: ['self_employed', 'business_owner'],
            docs: selfEmployedIncomeDocs,
          },
          {
            groupLabel: 'Existing Loan Documents',
            applicableFor: [],
            docs: [
              {
                id: 'original_sanction',
                name: 'Original Home Loan Sanction Letter',
                mandatory: true,
                acceptedFormats: ['pdf'],
                maxSizeMB: 10,
              },
              {
                id: 'loan_stmt_24m',
                name: 'Loan Account Statement (24 months)',
                mandatory: true,
                acceptedFormats: ['pdf'],
                maxSizeMB: 10,
              },
            ],
          },
        ],
      },
      lapDocSet,
      plotLoanDocSet,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. BUILDER
  // ─────────────────────────────────────────────────────────────────────────
  {
    partnerType: 'builder',
    partnerLabel: 'Builder / Real-estate Developer',
    description:
      'RERA-registered developers sourcing construction finance, builder finance, plot + construction loans and end-user home loans for their project buyers.',
    eligibleLoanCodes: [
      'builder_finance',
      'construction_finance',
      'plot_construction_loan',
      'home_loan',
      'pmay_home_loan',
    ],
    loanDocSets: [
      builderFinanceDocSet,
      constructionFinanceDocSet,
      {
        loanCode: 'plot_construction_loan',
        loanLabel: 'Plot + Construction Loan',
        category: 'real_estate',
        docGroups: [
          { groupLabel: 'KYC Documents (Applicant)', applicableFor: [], docs: kycDocs },
          { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
          {
            groupLabel: 'Income Documents (Self-employed)',
            applicableFor: ['self_employed', 'business_owner'],
            docs: selfEmployedIncomeDocs,
          },
          { groupLabel: 'Plot Documents', applicableFor: [], docs: [...plotLoanDocSet.docGroups[3].docs] },
          {
            groupLabel: 'Construction Documents',
            applicableFor: [],
            docs: [
              {
                id: 'building_plan_pc',
                name: 'Approved Building Plan',
                mandatory: true,
                acceptedFormats: ['pdf', 'jpg'],
                maxSizeMB: 20,
              },
              {
                id: 'construction_estimate_pc',
                name: 'Construction Cost Estimate from Approved Architect',
                mandatory: true,
                acceptedFormats: ['pdf'],
                maxSizeMB: 10,
              },
            ],
          },
        ],
      },
      {
        ...homeLoanDocSet,
        loanLabel: 'Home Loan (End-user – Builder Project)',
        docGroups: [
          ...homeLoanDocSet.docGroups,
          {
            groupLabel: 'Builder-specific Documents',
            applicableFor: [],
            docs: [
              {
                id: 'rera_no',
                name: 'RERA Registration Number / Certificate of the Project',
                mandatory: true,
                acceptedFormats: ['pdf', 'jpg'],
                maxSizeMB: 5,
              },
              {
                id: 'builder_noc',
                name: 'NOC from Builder / Developer',
                mandatory: true,
                acceptedFormats: ['pdf'],
                maxSizeMB: 5,
              },
            ],
          },
        ],
      },
      {
        loanCode: 'pmay_home_loan',
        loanLabel: 'PMAY Subsidy-linked Home Loan',
        category: 'government',
        docGroups: [
          { groupLabel: 'KYC Documents', applicableFor: [], docs: kycDocs },
          { groupLabel: 'Income Documents (Salaried)', applicableFor: ['salaried'], docs: salariedIncomeDocs },
          {
            groupLabel: 'Income Documents (Self-employed)',
            applicableFor: ['self_employed', 'business_owner'],
            docs: selfEmployedIncomeDocs,
          },
          { groupLabel: 'Property Documents', applicableFor: [], docs: residentialPropertyDocs },
          {
            groupLabel: 'PMAY-specific Documents',
            applicableFor: [],
            docs: [
              {
                id: 'self_declaration_no_house',
                name: 'Self-declaration of No Pucca House Ownership',
                mandatory: true,
                acceptedFormats: ['pdf'],
                maxSizeMB: 2,
              },
              {
                id: 'income_cert_pmay',
                name: 'Income Certificate (EWS / LIG / MIG category proof)',
                mandatory: true,
                acceptedFormats: ['pdf', 'jpg'],
                maxSizeMB: 5,
              },
              {
                id: 'aadhar_linked_mobile',
                name: 'Aadhaar-linked Mobile Number Declaration',
                mandatory: true,
                acceptedFormats: ['pdf'],
                maxSizeMB: 2,
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. SUB-DSA
  // ─────────────────────────────────────────────────────────────────────────
  {
    partnerType: 'sub_dsa',
    partnerLabel: 'Sub-DSA',
    description:
      'DSA agents operating under a principal DSA entity. Eligible across the same broad product range as freelancers, with files logged under the parent DSA.',
    eligibleLoanCodes: [
      'personal_loan',
      'personal_loan_self_employed',
      'professional_loan',
      'business_loan',
      'working_capital_loan',
      'gst_business_loan',
      'home_loan',
      'home_renovation_loan',
      'home_loan_bt',
      'lap',
      'plot_loan',
      'car_loan',
      'used_car_loan',
      'two_wheeler_loan',
      'education_loan',
      'gold_loan',
      'mudra_kishor',
      'ev_loan',
    ],
    loanDocSets: [
      personalLoanSalariedDocSet,
      personalLoanSelfEmpDocSet,
      professionalLoanDocSet,
      businessLoanDocSet,
      workingCapitalDocSet,
      gstBusinessLoanDocSet,
      homeLoanDocSet,
      homeRenovationDocSet,
      homeLoanBTDocSet,
      lapDocSet,
      plotLoanDocSet,
      carLoanNewDocSet,
      usedCarLoanDocSet,
      twoWheelerLoanDocSet,
      educationLoanDocSet,
      goldLoanDocSet,
      mudraDocSet,
      evLoanDocSet,
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Get the document matrix for a specific partner type */
export function getPartnerDocMatrix(partnerType: PartnerType): PartnerDocMatrix | undefined {
  return partnerDocMatrices.find((m) => m.partnerType === partnerType);
}

/** Get doc sets for a specific loan type within a partner's matrix */
export function getLoanDocSet(partnerType: PartnerType, loanCode: string): LoanDocSet | undefined {
  return getPartnerDocMatrix(partnerType)?.loanDocSets.find((ds) => ds.loanCode === loanCode);
}

/** Get all mandatory documents for a particular partner + loan combination */
export function getMandatoryDocs(partnerType: PartnerType, loanCode: string): DocumentRequirement[] {
  const docSet = getLoanDocSet(partnerType, loanCode);
  if (!docSet) return [];
  return docSet.docGroups.flatMap((g) => g.docs.filter((d) => d.mandatory));
}

/**
 * Get all required documents for a loan code without needing a partner type.
 * Searches across all partner matrices and returns the first matching doc set.
 * Returns a deduplicated flat list of document requirements (mandatory first).
 */
export function getRequiredDocsForLoanCode(loanCode: string): DocumentRequirement[] {
  for (const matrix of partnerDocMatrices) {
    const docSet = matrix.loanDocSets.find((ds) => ds.loanCode === loanCode);
    if (docSet) {
      const seen = new Set<string>();
      const allDocs: DocumentRequirement[] = [];
      // Mandatory first, then optional
      for (const mandatory of [true, false]) {
        for (const group of docSet.docGroups) {
          for (const doc of group.docs) {
            if (doc.mandatory === mandatory && !seen.has(doc.id)) {
              seen.add(doc.id);
              allDocs.push(doc);
            }
          }
        }
      }
      return allDocs;
    }
  }
  // Fallback: standard KYC + income docs for unknown loan types
  return [
    { id: 'pan', name: 'PAN Card', mandatory: true, acceptedFormats: ['pdf', 'jpg', 'png'], maxSizeMB: 5 },
    { id: 'aadhaar', name: 'Aadhaar Card', mandatory: true, acceptedFormats: ['pdf', 'jpg', 'png'], maxSizeMB: 5 },
    { id: 'bank_stmt_6m', name: 'Bank Statement (Last 6 Months)', mandatory: true, acceptedFormats: ['pdf'], maxSizeMB: 15 },
    { id: 'income_proof', name: 'Income Proof (Salary Slip / ITR)', mandatory: true, acceptedFormats: ['pdf', 'jpg'], maxSizeMB: 10 },
    { id: 'address_proof', name: 'Address Proof', mandatory: true, acceptedFormats: ['pdf', 'jpg', 'png'], maxSizeMB: 5 },
    { id: 'photo', name: 'Passport-size Photograph', mandatory: false, acceptedFormats: ['jpg', 'png'], maxSizeMB: 2 },
  ];
}

/** Get doc sets filtered by applicant profile */
export function getDocSetForProfile(
  partnerType: PartnerType,
  loanCode: string,
  profile: ApplicantProfile
): DocGroup[] {
  const docSet = getLoanDocSet(partnerType, loanCode);
  if (!docSet) return [];
  return docSet.docGroups.filter(
    (g) => g.applicableFor.length === 0 || g.applicableFor.includes(profile)
  );
}
