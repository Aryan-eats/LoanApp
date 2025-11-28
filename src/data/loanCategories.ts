export interface ServiceCategory {
  title: string;
  description: string;
  items: string[];
}

export const serviceCategories: ServiceCategory[] = [
  {
    title: "Personal Loans",
    description: "Unsecured, for individuals.",
    items: [
      "Personal Loan – Salaried",
      "Personal Loan – Self-employed",
      "Instant Personal Loan (Fintech)",
      "Credit Line (Slice, LazyPay, KreditBee)",
      "Small Ticket Digital Loan (STDL)",
      "Consumer Durable Loans (Electronics EMI)",
      "Travel Loan",
      "Wedding Loan",
      "Medical Loan",
      "Education Loan (Domestic)",
      "Education Loan (Abroad)",
      "Professional Loan (CA/Doctor/Architect, etc.)"
    ]
  },
  {
    title: "Business Loans",
    description: "For SMEs, MSMEs, traders, manufacturers, startups.",
    items: [
      "Unsecured Business Loan",
      "Secured Business Loan",
      "Working Capital Loan",
      "Overdraft (OD) Facility",
      "Cash Credit (CC)",
      "Dropline Overdraft",
      "Invoice Financing / Bill Discounting",
      "Merchant Cash Advance (POS-based)",
      "GST-based Business Loan",
      "Startup Loan (Standup India / Mudra)",
      "Machinery Loan",
      "Equipment Finance",
      "Supply Chain Finance",
      "Professional Business Loans (Doctors/CA/CS)",
      "Franchise Loan"
    ]
  },
  {
    title: "Home Loans",
    description: "",
    items: [
      "Home Purchase Loan",
      "Home Construction Loan",
      "Home Renovation Loan",
      "Home Extension Loan",
      "Home Loan Balance Transfer",
      "Top-Up Home Loan"
    ]
  },
  {
    title: "Property-Backed Loans",
    description: "Collateral = property.",
    items: [
      "Loan Against Property (LAP – Residential)",
      "LAP – Commercial",
      "Plot Loan",
      "Lease Rental Discounting (LRD)",
      "Reverse Mortgage Loan (for seniors)",
      "Industrial Property Loan"
    ]
  },
  {
    title: "Vehicle Loans",
    description: "",
    items: [
      "Car Loan – New",
      "Car Loan – Used",
      "Two-Wheeler Loan",
      "Commercial Vehicle Loan",
      "Tractor Loan",
      "Fleet Finance"
    ]
  },
  {
    title: "Gold & Securities Loans",
    description: "",
    items: [
      "Gold Loan",
      "Sovereign Gold Bond Loan",
      "Loan Against FD",
      "Loan Against Mutual Funds",
      "Loan Against Shares",
      "Loan Against Insurance Policy"
    ]
  },
  {
    title: "Education Loans",
    description: "",
    items: [
      "Domestic Education Loan",
      "Foreign Education Loan",
      "Secured Education Loan (Collateral)",
      "Unsecured Education Loan"
    ]
  },
  {
    title: "Corporate / Large Loans",
    description: "",
    items: [
      "Term Loan",
      "Project Finance",
      "Working Capital (Large Corp)",
      "External Commercial Borrowing (ECB)",
      "Cash Flow-based Lending",
      "Asset-Backed Finance"
    ]
  },
  {
    title: "Government Scheme Loans",
    description: "",
    items: [
      "Mudra (Shishu, Kishor, Tarun)",
      "PMEGP Loan",
      "Standup India Loan",
      "PMAY Subsidy-linked Home Loans",
      "CGTMSE Guaranteed Loans",
      "Agri Loans (KCC etc.)"
    ]
  },
  {
    title: "Agriculture Loans",
    description: "",
    items: [
      "Kisan Credit Card (KCC)",
      "Tractor Loan",
      "Crop Loan",
      "Seed/Fertilizer Loan",
      "Warehouse Receipt Finance",
      "Dairy/Poultry Farm Loan",
      "Farm Equipment Loan"
    ]
  },
  {
    title: "Consumer & Retail Loans",
    description: "",
    items: [
      "EMI Card Loans",
      "Mobile / Electronics EMI",
      "Furniture Loan",
      "Lifestyle Loan"
    ]
  },
  {
    title: "Salary & Short-Term Loans",
    description: "",
    items: [
      "Advance Salary Loan",
      "Payday Loan (Fintech)",
      "Line of Credit (Revolving)",
      "Emergency Loan"
    ]
  },
  {
    title: "Real Estate & Builder Loans",
    description: "",
    items: [
      "Builder Finance",
      "Construction Finance",
      "Plot + Construction Loan",
      "Bridge Loan"
    ]
  },
  {
    title: "Specialized Loans",
    description: "",
    items: [
      "Loan Against Cryptocurrency (very limited)",
      "EV Loan (Electric Vehicle)",
      "Green Home Loan",
      "Solar Panel Loan",
      "Medical Equipment Loan"
    ]
  }
];
