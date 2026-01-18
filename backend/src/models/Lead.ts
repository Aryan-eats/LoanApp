import mongoose, { Document, Schema } from 'mongoose';

// Lead status types matching frontend - partner-dashboard.ts
export type LeadStatus = 'draft' | 'submitted' | 'docs_pending' | 'docs_uploaded' | 'bank_processing' | 'approved' | 'disbursed' | 'rejected';

// Employment type
export type EmploymentType = 'salaried' | 'self_employed' | 'business_owner' | 'professional';

// Loan types - matching frontend loan product codes
export type LoanType = string; // Flexible to support all loan types from frontend

// Client interface matching frontend Client type
export interface IClient {
  id?: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  employmentType?: EmploymentType;
  monthlyIncome?: number;
  companyName?: string;
  workExperience?: number;
  city?: string;
  pincode?: string;
}

// Timeline event interface
export interface ILeadTimelineEvent {
  _id?: mongoose.Types.ObjectId;
  status: LeadStatus;
  timestamp: Date;
  note?: string;
  updatedBy: string;
}

// Lead document interface matching frontend
export interface ILeadDocument {
  _id?: mongoose.Types.ObjectId;
  type: string;
  fileName: string;
  fileSize?: string;
  fileUrl?: string;
  uploadedAt?: Date;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  rejectionReason?: string;
}

// Commission interface matching frontend LeadCommission
export interface ILeadCommission {
  amount?: number;
  rate?: number;
  status: 'pending' | 'processing' | 'paid';
  paidAt?: Date;
}

// Eligibility result interface
export interface IEligibilityResult {
  isEligible: boolean;
  maxLoanAmount?: number;
  minLoanAmount?: number;
  estimatedEMI?: number;
  checkedAt?: Date;
}

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Client details (nested object matching frontend)
  client: IClient;
  
  // Loan details
  loanType: LoanType;
  loanAmount: number;
  tenure?: number; // in months
  
  // Loan processing results
  sanctionedAmount?: number;
  disbursedAmount?: number;
  interestRate?: number;
  emi?: number;
  
  // Status tracking
  status: LeadStatus;
  
  // Bank assignment
  bankAssigned?: string;
  bankLogo?: string;
  
  // Partner assignment
  partnerId: mongoose.Types.ObjectId;
  partnerName: string;
  
  // Documents
  documents: ILeadDocument[];
  
  // Timeline
  timeline: ILeadTimelineEvent[];
  
  // Eligibility
  eligibilityResult?: IEligibilityResult;
  
  // Commission (populated when loan is disbursed)
  commission?: ILeadCommission;
  
  // Notes
  internalNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Client sub-schema
const clientSchema = new Schema<IClient>(
  {
    fullName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    dateOfBirth: String,
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    aadhaarNumber: String,
    employmentType: {
      type: String,
      enum: ['salaried', 'self_employed', 'business_owner', 'professional'],
    },
    monthlyIncome: Number,
    companyName: String,
    workExperience: Number,
    city: String,
    pincode: String,
  },
  { _id: false }
);

const leadTimelineEventSchema = new Schema<ILeadTimelineEvent>(
  {
    status: {
      type: String,
      required: true,
      enum: ['draft', 'submitted', 'docs_pending', 'docs_uploaded', 'bank_processing', 'approved', 'disbursed', 'rejected'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
  },
  { _id: true }
);

const leadDocumentSchema = new Schema<ILeadDocument>(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: String,
    fileUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'uploaded', 'verified', 'rejected'],
      default: 'pending',
    },
    rejectionReason: String,
  },
  { _id: true }
);

const leadCommissionSchema = new Schema<ILeadCommission>(
  {
    amount: Number,
    rate: Number,
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid'],
      default: 'pending',
    },
    paidAt: Date,
  },
  { _id: false }
);

const eligibilityResultSchema = new Schema<IEligibilityResult>(
  {
    isEligible: Boolean,
    maxLoanAmount: Number,
    minLoanAmount: Number,
    estimatedEMI: Number,
    checkedAt: Date,
  },
  { _id: false }
);

const leadSchema = new Schema<ILead>(
  {
    // Client details (nested object)
    client: {
      type: clientSchema,
      required: [true, 'Client details are required'],
    },

    // Loan details
    loanType: {
      type: String,
      required: [true, 'Loan type is required'],
      trim: true,
    },
    loanAmount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [0, 'Loan amount must be positive'],
    },
    tenure: {
      type: Number,
      min: [1, 'Tenure must be at least 1 month'],
    },

    // Loan processing results
    sanctionedAmount: Number,
    disbursedAmount: Number,
    interestRate: Number,
    emi: Number,

    // Status tracking
    status: {
      type: String,
      required: true,
      enum: ['draft', 'submitted', 'docs_pending', 'docs_uploaded', 'bank_processing', 'approved', 'disbursed', 'rejected'],
      default: 'submitted',
      index: true,
    },

    // Bank assignment
    bankAssigned: String,
    bankLogo: String,

    // Partner assignment
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Partner ID is required'],
      index: true,
    },
    partnerName: {
      type: String,
      required: [true, 'Partner name is required'],
      trim: true,
    },

    // Documents
    documents: {
      type: [leadDocumentSchema],
      default: [],
    },

    // Timeline
    timeline: {
      type: [leadTimelineEventSchema],
      default: [],
    },

    // Eligibility
    eligibilityResult: eligibilityResultSchema,

    // Commission
    commission: leadCommissionSchema,

    // Notes
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
leadSchema.index({ partnerId: 1, status: 1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ 'client.phone': 1 });
leadSchema.index({ createdAt: -1 });

// Virtual for generating a customer-friendly lead ID
leadSchema.virtual('leadId').get(function () {
  return `L${this._id.toString().slice(-8).toUpperCase()}`;
});

// Ensure virtuals are included in JSON output
leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

// Pre-save middleware to add initial timeline event
leadSchema.pre('save', function () {
  if (this.isNew && this.timeline.length === 0) {
    this.timeline.push({
      status: 'submitted',
      timestamp: new Date(),
      updatedBy: 'System',
      note: 'Lead submitted',
    });
  }
});

const Lead = mongoose.model<ILead>('Lead', leadSchema);

export default Lead;
