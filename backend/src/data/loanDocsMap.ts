// ---------------------------------------------------------------------------
// Document requirements per loan type - used when transitioning to docs_pending
// ---------------------------------------------------------------------------
const KYC = ['PAN Card', 'Aadhaar Card', 'Address Proof', 'Passport-size Photograph'];
const SALARIED = ['Salary Slips (Last 3 Months)', 'Bank Statement (Last 6 Months)', 'Form 16 / ITR (Last 2 Years)'];
const SELF_EMP = ['ITR (Last 2 Years)', 'Bank Statement (Last 12 Months)', 'Balance Sheet & P&L (Last 2 Years)', 'GST Returns (Last 12 Months)'];
const BUSINESS = ['Business Registration / Incorporation Certificate', 'GST Registration Certificate', 'Udyam / MSME Certificate'];
const PROPERTY = ['Sale Deed / Title Deed', 'Encumbrance Certificate', 'Property Tax Receipt', 'Approved Building Plan / Layout'];

export const LOAN_DOCS_MAP: Record<string, string[]> = {
  // -- Personal --------------------------------------------------------------
  personal_loan:              [...KYC, ...SALARIED],
  personal_loan_self_employed:[...KYC, ...SELF_EMP],
  instant_personal_loan:      [...KYC, 'Bank Statement (Last 6 Months)', 'Income Proof'],
  credit_line:                [...KYC, 'Bank Statement (Last 6 Months)', 'Income Proof'],
  stdl:                       [...KYC, 'Bank Statement (Last 3 Months)'],
  consumer_durable_loan:      [...KYC, 'Salary Slip / Income Proof'],
  travel_loan:                [...KYC, 'Salary Slip (Last 3 Months)', 'Bank Statement (Last 3 Months)'],
  wedding_loan:               [...KYC, 'Salary Slip (Last 3 Months)', 'Bank Statement (Last 6 Months)'],
  medical_loan:               [...KYC, 'Salary Slip / Income Proof', 'Bank Statement (Last 3 Months)'],
  professional_loan:          [...KYC, ...SELF_EMP, 'Professional Degree / Registration Certificate'],

  // -- Business --------------------------------------------------------------
  business_loan:              [...KYC, ...SELF_EMP, ...BUSINESS],
  secured_business_loan:      [...KYC, ...SELF_EMP, ...BUSINESS, ...PROPERTY],
  working_capital_loan:       [...KYC, ...SELF_EMP, ...BUSINESS, 'Stock Statement (Last 3 Months)'],
  overdraft:                  [...KYC, ...SELF_EMP, ...BUSINESS],
  cash_credit:                [...KYC, ...SELF_EMP, ...BUSINESS],
  dropline_od:                [...KYC, ...SELF_EMP, ...BUSINESS],
  invoice_financing:          [...KYC, ...BUSINESS, 'Invoices / Bills (Last 6 Months)', 'Bank Statement (Last 6 Months)'],
  merchant_cash_advance:      [...KYC, 'POS / Payment Gateway Statement (Last 12 Months)', 'Bank Statement (Last 6 Months)'],
  gst_business_loan:          [...KYC, ...BUSINESS, 'GST Returns (Last 12 Months)', 'Bank Statement (Last 12 Months)'],
  startup_loan:               [...KYC, 'Business Plan / Pitch Deck', ...BUSINESS, 'Bank Statement (Last 6 Months)'],
  machinery_loan:             [...KYC, ...SELF_EMP, ...BUSINESS, 'Machinery Quotation / Invoice'],
  equipment_finance:          [...KYC, ...SELF_EMP, ...BUSINESS, 'Equipment Quotation / Invoice'],
  supply_chain_finance:       [...KYC, ...BUSINESS, 'Purchase Orders', 'Invoices (Last 6 Months)'],
  professional_business_loan: [...KYC, ...SELF_EMP, 'Professional Registration Certificate'],
  franchise_loan:             [...KYC, ...SELF_EMP, 'Franchise Agreement', ...BUSINESS],

  // -- Home ------------------------------------------------------------------
  home_loan:                  [...KYC, ...SALARIED, ...PROPERTY, 'Builder Allotment Letter / Cost Breakup'],
  home_construction_loan:     [...KYC, ...SALARIED, ...PROPERTY, 'Approved Building Plan', 'Construction Cost Estimate'],
  home_renovation_loan:       [...KYC, ...SALARIED, 'Property Ownership Proof', 'Renovation Cost Estimate', 'Property Tax Receipt'],
  home_extension_loan:        [...KYC, ...SALARIED, 'Existing Property Title Deed', 'Approved Extension Plan', 'Extension Cost Estimate'],
  home_loan_bt:               [...KYC, ...SALARIED, ...PROPERTY, 'Existing Loan Sanction Letter', 'Loan Account Statement (24 Months)', 'Foreclosure / Outstanding Amount Letter'],
  topup_home_loan:            [...KYC, ...SALARIED, 'Original Home Loan Sanction Letter', 'Loan Account Statement (24 Months)'],

  // -- Property --------------------------------------------------------------
  lap:                        [...KYC, ...SALARIED, ...PROPERTY],
  lap_commercial:             [...KYC, ...SELF_EMP, ...BUSINESS, 'Commercial Property Documents', 'Property Valuation Report'],
  plot_loan:                  [...KYC, ...SALARIED, 'Plot Sale Deed / Agreement', 'Chain of Title / Mutation Records', 'Survey Map / Khasra / Khatauni'],
  lrd:                        [...KYC, ...SELF_EMP, 'Registered Lease Agreement', 'Tenant KYC', ...PROPERTY],
  reverse_mortgage:           [...KYC, 'Property Ownership Proof', 'Property Tax Receipt', 'Encumbrance Certificate'],
  industrial_property_loan:   [...KYC, ...SELF_EMP, ...BUSINESS, 'Industrial Property Documents'],

  // -- Vehicle ---------------------------------------------------------------
  car_loan:                   [...KYC, ...SALARIED, 'Proforma Invoice from Dealer', 'Vehicle Quotation'],
  used_car_loan:              [...KYC, ...SALARIED, 'Registration Certificate (RC Book)', 'Vehicle Insurance Policy', 'Vehicle Valuation Report', 'Form 29 & 30 (Transfer of Ownership)'],
  two_wheeler_loan:           [...KYC, 'Salary Slip / Income Proof', 'Proforma Invoice / Quotation from Dealer'],
  commercial_vehicle_loan:    [...KYC, ...SALARIED, 'Vehicle Quotation / Proforma Invoice', 'Driving License'],
  tractor_loan:               [...KYC, 'Land Records', 'Income Proof', 'Tractor Quotation'],
  fleet_finance:              [...KYC, ...SELF_EMP, ...BUSINESS, 'Fleet Details', 'Vehicle Quotations'],

  // -- Gold & Securities -----------------------------------------------------
  gold_loan:                  [...KYC, 'Gold Purity Certificate (issued at branch)'],
  sgb_loan:                   [...KYC, 'Sovereign Gold Bond Certificate'],
  loan_against_fd:            [...KYC, 'FD Receipt / Certificate'],
  loan_against_mf:            [...KYC, 'Mutual Fund Statement (Latest)', 'Demat Account Statement'],
  loan_against_shares:        [...KYC, 'Demat Account Statement', 'List of Shares to be Pledged'],
  loan_against_insurance:     [...KYC, 'Insurance Policy Document', 'Premium Payment Receipts'],

  // -- Education -------------------------------------------------------------
  education_loan:             [...KYC, 'Admission / Offer Letter from Institution', 'Official Fee Structure', 'Academic Records (10th, 12th, Last Exam)', ...SALARIED],
  foreign_education_loan:     [...KYC, 'Admission Letter (Foreign University)', 'Visa / I-20 / CAS Letter', 'Official Fee Structure', 'Academic Records', ...SALARIED],
  secured_education_loan:     [...KYC, 'Admission Letter', 'Official Fee Structure', 'Academic Records', ...SALARIED, ...PROPERTY],
  unsecured_education_loan:   [...KYC, 'Admission Letter', 'Official Fee Structure', 'Academic Records', ...SALARIED],

  // -- Government Schemes ----------------------------------------------------
  mudra_shishu:               [...KYC, 'Mudra Loan Application Form', 'Business Proof', 'Bank Statement (Last 6 Months)'],
  mudra_kishor:               [...KYC, ...BUSINESS, 'Mudra Loan Application Form', 'Bank Statement (Last 6 Months)', 'ITR (Last 1-2 Years)'],
  mudra_tarun:                [...KYC, ...BUSINESS, 'Mudra Loan Application Form', 'Bank Statement (Last 12 Months)', ...SELF_EMP],
  pmegp:                      [...KYC, ...BUSINESS, 'PMEGP Application Form', 'Project Report', 'Bank Statement (Last 6 Months)'],
  standup_india:              [...KYC, ...BUSINESS, 'Standup India Application Form', 'Project Report', 'Bank Statement (Last 12 Months)'],
  pmay_home_loan:             [...KYC, ...SALARIED, ...PROPERTY, 'Self-declaration of No Pucca House', 'Income Certificate (EWS/LIG/MIG)', 'Aadhaar-linked Mobile Declaration'],
  cgtmse:                     [...KYC, ...SELF_EMP, ...BUSINESS, 'Project Report', 'Bank Statement (Last 12 Months)'],

  // -- Agriculture -----------------------------------------------------------
  kcc:                        [...KYC, 'Land Records (Khasra / Khatauni)', 'Crop Details', 'Bank Statement (Last 6 Months)'],
  crop_loan:                  [...KYC, 'Land Records', 'Crop Details / Sowing Certificate'],
  seed_fertilizer_loan:       [...KYC, 'Land Records', 'Quotation for Seeds / Fertilizers'],
  warehouse_receipt_finance:  [...KYC, 'Warehouse Receipt', 'Commodity Details'],
  dairy_poultry_loan:         [...KYC, 'Land Records', 'Income Proof', 'Project Report for Farm'],
  farm_equipment_loan:        [...KYC, 'Land Records', 'Equipment Quotation / Invoice'],

  // -- Consumer --------------------------------------------------------------
  emi_card_loan:              [...KYC, 'Salary Slip / Income Proof'],
  mobile_electronics_emi:     [...KYC, 'Salary Slip / Income Proof'],
  furniture_loan:             [...KYC, 'Salary Slip / Income Proof', 'Quotation from Store'],
  lifestyle_loan:             [...KYC, 'Salary Slip / Income Proof'],

  // -- Short-Term ------------------------------------------------------------
  advance_salary_loan:        [...KYC, 'Salary Slip (Last 2 Months)', 'Bank Statement (Last 3 Months)', 'Employment Letter'],
  payday_loan:                [...KYC, 'Salary Slip (Last Month)', 'Bank Statement (Last Month)'],
  revolving_loc:              [...KYC, 'Bank Statement (Last 6 Months)', 'Income Proof'],
  emergency_loan:             [...KYC, 'Income Proof', 'Bank Statement (Last 3 Months)'],

  // -- Real Estate / Builder -------------------------------------------------
  builder_finance:            [...KYC, ...BUSINESS, ...SELF_EMP, 'RERA Registration Certificate', 'Approved Layout Plan', 'Land Title Deed', 'Detailed Project Report', 'Construction Cost Estimate'],
  construction_finance:       [...KYC, ...BUSINESS, ...SELF_EMP, 'Land Ownership Documents', 'Building Sanction / Municipal Approval', 'Construction Cost Estimate & Plan'],
  plot_construction_loan:     [...KYC, ...SALARIED, 'Plot Sale Deed / Agreement', 'Approved Building Plan', 'Construction Cost Estimate'],
  bridge_loan:                [...KYC, ...SELF_EMP, ...PROPERTY, 'Existing Property Sale Agreement'],

  // -- Specialized -----------------------------------------------------------
  crypto_loan:                [...KYC, 'Crypto Wallet Statement', 'Proof of Ownership of Crypto Assets'],
  ev_loan:                    [...KYC, ...SALARIED, 'EV Proforma Invoice (OEM / Dealer)', 'FAME-II Subsidy Eligibility Document (if applicable)'],
  green_home_loan:            [...KYC, ...SALARIED, ...PROPERTY, 'Green Building / BEE Rating Certificate', 'Solar / Energy-efficient System Plan'],
  solar_panel_loan:           [...KYC, 'Income Proof', 'Solar System Quotation from Empanelled Vendor', 'Property Ownership Proof / NOC from Landlord'],
  medical_equipment_loan:     [...KYC, 'Professional Registration Certificate', 'Equipment Quotation / Invoice', ...SELF_EMP],

  // -- Corporate -------------------------------------------------------------
  term_loan:                  [...KYC, ...SELF_EMP, ...BUSINESS, 'Project Report / Business Plan'],
  project_finance:            [...KYC, ...BUSINESS, ...SELF_EMP, 'Detailed Project Report (DPR)', 'Environmental Clearance'],
  working_capital_large:      [...KYC, ...BUSINESS, ...SELF_EMP, 'Stock Statement', 'Debtors & Creditors Statement'],
  ecb:                        [...KYC, ...BUSINESS, ...SELF_EMP, 'RBI Approval / ECB Filing Documents'],
  cash_flow_lending:          [...KYC, ...SELF_EMP, ...BUSINESS, 'Projected Cash Flow Statement'],
  asset_backed_finance:       [...KYC, ...SELF_EMP, ...BUSINESS, 'Asset Valuation Report', 'Asset Ownership Proof'],
};

/** Returns the required document type names for a given loan type */
export const getRequiredDocTypes = (loanType: string): string[] => {
  return LOAN_DOCS_MAP[loanType] ?? [
    ...KYC,
    'Bank Statement (Last 6 Months)',
    'Income Proof (Salary Slip / ITR)',
  ];
};
