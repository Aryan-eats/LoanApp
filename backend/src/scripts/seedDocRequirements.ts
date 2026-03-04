/**
 * Seed script – populates lender_doc_requirements from static DocsReq data.
 * Safe to run multiple times (upsert).
 *
 * Usage:
 *   npx tsx src/scripts/seedDocRequirements.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import { basePrisma as prisma } from '../config/prisma.js';

// -- Bank / NBFC catalogue (mirrors mockBanks.ts) -----------------------------
const banks = [
  {
    code: 'HDFC',
    name: 'HDFC Bank',
    loanTypes: ['home_loan', 'personal_loan', 'car_loan', 'lap', 'lrd', 'overdraft', 'business_loan', 'gold_loan'],
  },
  {
    code: 'ICICI',
    name: 'ICICI Bank',
    loanTypes: ['home_loan', 'personal_loan', 'business_loan', 'car_loan', 'two_wheeler_loan', 'education_loan'],
  },
  {
    code: 'AXIS',
    name: 'Axis Bank',
    loanTypes: ['home_loan', 'personal_loan', 'business_loan', 'working_capital_loan', 'invoice_financing'],
  },
  {
    code: 'BAJAJ',
    name: 'Bajaj Finserv',
    loanTypes: ['personal_loan', 'business_loan', 'consumer_durable_loan', 'emi_card_loan'],
  },
  {
    code: 'TATA',
    name: 'Tata Capital',
    loanTypes: ['personal_loan', 'business_loan', 'car_loan', 'used_car_loan', 'commercial_vehicle_loan'],
  },
  {
    code: 'SBI',
    name: 'SBI',
    loanTypes: [
      'home_loan', 'personal_loan', 'education_loan', 'kcc', 'tractor_loan',
      'mudra_shishu', 'mudra_kishor', 'mudra_tarun', 'pmay_home_loan', 'solar_panel_loan',
    ],
  },
  {
    code: 'MUTHOOT',
    name: 'Muthoot Finance',
    loanTypes: ['gold_loan', 'loan_against_fd', 'personal_loan'],
  },
  {
    code: 'HERO',
    name: 'Hero FinCorp',
    loanTypes: ['two_wheeler_loan', 'personal_loan', 'ev_loan'],
  },
  {
    code: 'KOTAK',
    name: 'Kotak Mahindra Bank',
    loanTypes: ['home_loan', 'personal_loan', 'business_loan'],
  },
];

// -- Reusable document blocks --------------------------------------------------
const kycDocs = [
  { id: 'aadhaar',      name: 'Aadhaar Card',                   description: 'Front and back copy',                                                   mandatory: true,  formats: ['pdf', 'jpg', 'png'], mb: 5  },
  { id: 'pan',          name: 'PAN Card',                        description: undefined,                                                               mandatory: true,  formats: ['pdf', 'jpg', 'png'], mb: 5  },
  { id: 'photo',        name: 'Passport-size Photograph',        description: undefined,                                                               mandatory: true,  formats: ['jpg', 'png'],         mb: 2  },
  { id: 'address_proof',name: 'Address Proof',                   description: 'Utility bill / rent agreement / voter ID (not older than 3 months)',    mandatory: true,  formats: ['pdf', 'jpg', 'png'], mb: 5  },
];
const salariedIncomeDocs = [
  { id: 'salary_slip_3m',   name: 'Last 3 Months Salary Slips',                description: undefined, mandatory: true,  formats: ['pdf', 'jpg'], mb: 10 },
  { id: 'bank_stmt_6m',     name: 'Bank Statement (6 months – salary account)', description: undefined, mandatory: true,  formats: ['pdf'],         mb: 10 },
  { id: 'form16',           name: 'Form 16 / ITR (last 2 years)',                description: undefined, mandatory: true,  formats: ['pdf'],         mb: 10 },
  { id: 'employment_letter',name: 'Employment Letter / Offer Letter',            description: undefined, mandatory: false, formats: ['pdf'],         mb: 5  },
];
const selfEmpIncomeDocs = [
  { id: 'itr_2y',          name: 'ITR with Computation (last 2 years)',                       description: undefined, mandatory: true,  formats: ['pdf'],        mb: 10 },
  { id: 'pl_bs_2y',        name: 'Audited P&L and Balance Sheet (last 2 years)',              description: undefined, mandatory: true,  formats: ['pdf'],        mb: 10 },
  { id: 'bank_stmt_12m',   name: 'Bank Statement (12 months – current/savings account)',      description: undefined, mandatory: true,  formats: ['pdf'],        mb: 15 },
  { id: 'gst_returns_6m',  name: 'GST Returns (last 6 months)',                               description: undefined, mandatory: false, formats: ['pdf'],        mb: 10 },
];
const businessEntityDocs = [
  { id: 'business_reg', name: 'Business Registration Certificate', description: 'Sole prop declaration / partnership deed / MOA-AOA / COI', mandatory: true,  formats: ['pdf', 'jpg'], mb: 5 },
  { id: 'gst_reg',      name: 'GST Registration Certificate',      description: undefined,                                                  mandatory: false, formats: ['pdf', 'jpg'], mb: 5 },
  { id: 'udyam_reg',    name: 'Udyam / MSME Registration Certificate', description: undefined,                                              mandatory: false, formats: ['pdf', 'jpg'], mb: 5 },
  { id: 'trade_licence',name: 'Trade Licence / Shops & Establishment Certificate', description: undefined,                                  mandatory: false, formats: ['pdf', 'jpg'], mb: 5 },
];
const residentialPropertyDocs = [
  { id: 'sale_deed',           name: 'Sale Deed / Agreement to Sell',             description: undefined, mandatory: true,  formats: ['pdf'],         mb: 20 },
  { id: 'title_chain',         name: 'Chain of Title Documents (last 30 years)',  description: undefined, mandatory: true,  formats: ['pdf'],         mb: 30 },
  { id: 'approved_plan',       name: 'Approved Building Plan',                    description: undefined, mandatory: true,  formats: ['pdf', 'jpg'],  mb: 20 },
  { id: 'property_tax_receipt',name: 'Latest Property Tax Receipt',               description: undefined, mandatory: true,  formats: ['pdf', 'jpg'],  mb: 5  },
  { id: 'encumbrance_cert',    name: 'Encumbrance Certificate (EC)',               description: undefined, mandatory: true,  formats: ['pdf'],         mb: 10 },
  { id: 'noc_society',         name: 'NOC from Society / Builder',                description: undefined, mandatory: false, formats: ['pdf'],         mb: 5  },
  { id: 'oc_cc',               name: 'Occupancy Certificate / Completion Certificate', description: undefined, mandatory: false, formats: ['pdf', 'jpg'], mb: 10 },
];

type DocEntry = { id: string; name: string; description?: string; mandatory: boolean; formats: string[]; mb: number };

// -- Loan → docs mapping -------------------------------------------------------
function getDocsForLoan(loanCode: string): DocEntry[] {
  const seen = new Set<string>();
  const add = (docs: DocEntry[]) => docs.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });

  switch (loanCode) {
    case 'home_loan':
    case 'pmay_home_loan':
      return [
        ...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs),
        ...add(residentialPropertyDocs),
        ...add([
          { id: 'allotment_letter', name: 'Builder Allotment Letter / Possession Letter', mandatory: false, formats: ['pdf'], mb: 10 },
          { id: 'cost_breakup',     name: 'Cost Breakup / Builder Agreement',              mandatory: true,  formats: ['pdf'], mb: 10 },
        ]),
      ];
    case 'home_renovation_loan':
      return [
        ...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs),
        ...add([
          { id: 'ownership_proof',     name: 'Property Ownership Proof (title deed / sale deed)', mandatory: true,  formats: ['pdf'],         mb: 20 },
          { id: 'renovation_estimate', name: 'Renovation Cost Estimate / Contractor Quote',         mandatory: true,  formats: ['pdf', 'jpg'],  mb: 10 },
          { id: 'property_tax_receipt',name: 'Property Tax Receipt (latest)',                        mandatory: true,  formats: ['pdf', 'jpg'],  mb: 5  },
        ]),
      ];
    case 'home_loan_bt':
      return [
        ...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs),
        ...add(residentialPropertyDocs),
        ...add([
          { id: 'existing_sanction_letter', name: 'Existing Home Loan Sanction Letter',  mandatory: true, formats: ['pdf'], mb: 10 },
          { id: 'loan_account_stmt',        name: 'Loan Account Statement (24 months)',  mandatory: true, formats: ['pdf'], mb: 10 },
          { id: 'foreclosure_letter',       name: 'Foreclosure / Outstanding Amount Letter', mandatory: true, formats: ['pdf'], mb: 5 },
        ]),
      ];
    case 'lap':
      return [...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs), ...add(residentialPropertyDocs)];
    case 'personal_loan':
    case 'personal_loan_self_employed':
      return [...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs)];
    case 'professional_loan':
      return [
        ...add(kycDocs),
        ...add([
          { id: 'professional_cert', name: 'Professional Degree / Registration Certificate', description: 'ICAI / MCI / COA registration', mandatory: true,  formats: ['pdf', 'jpg'], mb: 5  },
          { id: 'practice_proof',    name: 'Proof of Practice',                               description: undefined,                        mandatory: false, formats: ['pdf', 'jpg', 'png'], mb: 10 },
        ]),
        ...add(selfEmpIncomeDocs),
      ];
    case 'business_loan':
    case 'working_capital_loan':
    case 'gst_business_loan':
    case 'invoice_financing':
      return [
        ...add(kycDocs), ...add(businessEntityDocs), ...add(selfEmpIncomeDocs),
        ...(loanCode === 'working_capital_loan' ? add([
          { id: 'stock_statement',     name: 'Stock Statement (last 3 months)',              mandatory: true,  formats: ['pdf', 'xlsx'], mb: 10 },
          { id: 'debtor_creditor_stmt',name: 'Debtors & Creditors Statement',                mandatory: false, formats: ['pdf', 'xlsx'], mb: 10 },
          { id: 'existing_banking',    name: 'Existing Banking Facility Sanction Letter',    mandatory: false, formats: ['pdf'],          mb: 10 },
        ]) : []),
        ...(loanCode === 'gst_business_loan' || loanCode === 'invoice_financing' ? add([
          { id: 'gst_returns_12m',    name: 'GST Returns (GSTR-1 & GSTR-3B) – last 12 months', mandatory: true,  formats: ['pdf'], mb: 20 },
          { id: 'bank_stmt_12m_gst',  name: 'Bank Statement – 12 months',                         mandatory: true,  formats: ['pdf'], mb: 15 },
          { id: 'itr_gst',            name: 'ITR – last 1-2 years (if available)',                 mandatory: false, formats: ['pdf'], mb: 10 },
        ]) : []),
      ];
    case 'car_loan':
      return [
        ...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs),
        ...add([
          { id: 'car_proforma_invoice', name: 'Proforma Invoice from Dealer',              mandatory: true, formats: ['pdf', 'jpg'], mb: 5 },
          { id: 'car_quotation',        name: 'Vehicle Quotation (on-road price breakup)', mandatory: true, formats: ['pdf'],         mb: 5 },
        ]),
      ];
    case 'used_car_loan':
    case 'commercial_vehicle_loan':
      return [
        ...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs),
        ...add([
          { id: 'rc_book',          name: 'Registration Certificate (RC Book)',                   mandatory: true,  formats: ['pdf', 'jpg'], mb: 5 },
          { id: 'vehicle_insurance',name: 'Comprehensive Vehicle Insurance Policy',               mandatory: true,  formats: ['pdf', 'jpg'], mb: 5 },
          { id: 'vehicle_valuation',name: 'Vehicle Valuation Report (from certified valuer)',     mandatory: true,  formats: ['pdf'],         mb: 5 },
          { id: 'form_29_30',       name: 'Form 29 & 30 (Transfer of Ownership)',                 mandatory: true,  formats: ['pdf', 'jpg'], mb: 5 },
          { id: 'noc_seller',       name: 'NOC from Seller / Previous Owner',                    mandatory: false, formats: ['pdf', 'jpg'], mb: 3 },
        ]),
      ];
    case 'two_wheeler_loan':
      return [
        ...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs),
        ...add([{ id: 'tw_proforma', name: 'Proforma Invoice / Quotation from Dealer', mandatory: true, formats: ['pdf', 'jpg'], mb: 5 }]),
      ];
    case 'ev_loan':
      return [
        ...add(kycDocs), ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs),
        ...add([
          { id: 'ev_invoice',      name: 'EV Proforma Invoice (OEM / dealer)',             mandatory: true,  formats: ['pdf', 'jpg'], mb: 5 },
          { id: 'fame_subsidy_proof', name: 'FAME-II Subsidy Eligibility Document',         mandatory: false, formats: ['pdf'],         mb: 5 },
        ]),
      ];
    case 'education_loan':
      return [
        ...add(kycDocs),
        ...add([
          { id: 'admission_letter',name: 'Admission / Offer Letter from Institution', mandatory: true,  formats: ['pdf'],         mb: 5  },
          { id: 'fee_structure',   name: 'Official Fee Structure / Course Cost Breakup', mandatory: true,  formats: ['pdf'],         mb: 5  },
          { id: 'academic_records',name: 'Academic Records (10th, 12th, marksheets)',   mandatory: true,  formats: ['pdf', 'jpg'],  mb: 10 },
          { id: 'entrance_result', name: 'Entrance Exam Score Card (JEE / NEET / GMAT / GRE)', mandatory: false, formats: ['pdf', 'jpg'], mb: 5 },
        ]),
        ...add(salariedIncomeDocs), ...add(selfEmpIncomeDocs),
      ];
    case 'gold_loan':
      return [
        ...add(kycDocs),
        ...add([
          { id: 'gold_purity_cert', name: 'Gold Purity Certificate (from lender appraiser)', mandatory: false, formats: ['pdf', 'jpg'], mb: 5 },
        ]),
      ];
    case 'loan_against_fd':
      return [...add(kycDocs), ...add([{ id: 'fd_certificate', name: 'Fixed Deposit Certificate', mandatory: true, formats: ['pdf', 'jpg'], mb: 5 }])];
    case 'kcc':
    case 'tractor_loan':
    case 'mudra_shishu':
    case 'mudra_kishor':
    case 'mudra_tarun':
      return [
        ...add(kycDocs),
        ...add([
          { id: 'land_record', name: 'Land Records / Khasra / Khatauni', mandatory: true, formats: ['pdf', 'jpg'], mb: 10 },
          { id: 'bank_stmt_6m', name: 'Bank Statement (6 months)', mandatory: true, formats: ['pdf'], mb: 10 },
        ]),
      ];
    case 'solar_panel_loan':
      return [
        ...add(kycDocs), ...add(salariedIncomeDocs),
        ...add([{ id: 'solar_quotation', name: 'Solar Installation Quotation', mandatory: true, formats: ['pdf'], mb: 5 }]),
      ];
    case 'overdraft':
    case 'lrd':
      return [...add(kycDocs), ...add(selfEmpIncomeDocs), ...add(businessEntityDocs), ...add(residentialPropertyDocs)];
    case 'consumer_durable_loan':
    case 'emi_card_loan':
      return [
        ...add(kycDocs),
        ...add([{ id: 'product_invoice', name: 'Product Invoice / Quotation', mandatory: true, formats: ['pdf', 'jpg'], mb: 5 }]),
      ];
    default:
      // Generic fallback
      return [
        ...add(kycDocs),
        ...add([
          { id: 'bank_stmt_6m', name: 'Bank Statement (Last 6 Months)', mandatory: true, formats: ['pdf'], mb: 15 },
          { id: 'income_proof', name: 'Income Proof (Salary Slip / ITR)', mandatory: true, formats: ['pdf', 'jpg'], mb: 10 },
        ]),
      ];
  }
}

// -- Main seed -----------------------------------------------------------------
async function seed() {
  let total = 0;

  for (const bank of banks) {
    for (const loanCode of bank.loanTypes) {
      const docs = getDocsForLoan(loanCode);

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        await prisma.lenderDocRequirement.upsert({
          where: {
            lenderCode_loanCode_docId: {
              lenderCode: bank.code,
              loanCode,
              docId: doc.id,
            },
          },
          update: {
            docName: doc.name,
            description: doc.description ?? null,
            mandatory: doc.mandatory,
            acceptedFormats: doc.formats,
            maxSizeMB: doc.mb,
            sortOrder: i,
          },
          create: {
            lenderCode: bank.code,
            lenderName: bank.name,
            loanCode,
            docId: doc.id,
            docName: doc.name,
            description: doc.description ?? null,
            mandatory: doc.mandatory,
            acceptedFormats: doc.formats,
            maxSizeMB: doc.mb,
            sortOrder: i,
          },
        });
        total++;
      }
    }
  }

  console.log(`✅ Seeded ${total} document requirements across ${banks.length} lenders.`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
