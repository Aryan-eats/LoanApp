import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import prisma from '../config/prisma.js';
import { Prisma, LeadStatus, AuditEventType } from '@prisma/client';

type AnyDoc = Record<string, any>;

type MigrationOptions = {
  dryRun: boolean;
  validate: boolean;
  allowNonEmpty: boolean;
  limit?: number;
  batchSize: number;
  mappingPath: string;
  fallbackPartnerId?: string;
  skipAudit: boolean;
};

type MappingOutput = {
  users: Array<{ mongoId: string; uuid: string }>;
  leads: Array<{ mongoId: string; uuid: string }>;
};

const DEFAULT_BATCH_SIZE = 250;
const DEFAULT_MAPPING_PATH = path.join('migration-output', 'mongo-id-map.json');

const parseArgs = (): MigrationOptions => {
  const args = new Set(process.argv.slice(2));
  const getArgValue = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    for (const arg of process.argv.slice(2)) {
      if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    }
    return undefined;
  };

  const limitRaw = getArgValue('limit') || process.env.MIGRATION_LIMIT;
  const batchRaw = getArgValue('batch') || process.env.MIGRATION_BATCH_SIZE;
  const mappingPath = getArgValue('mapping') || process.env.MIGRATION_MAPPING_PATH;
  const allowNonEmpty =
    args.has('--allow-nonempty') || process.env.MIGRATION_ALLOW_NONEMPTY === 'true';
  const fallbackPartnerId = process.env.MIGRATION_FALLBACK_PARTNER_ID;

  return {
    dryRun: args.has('--dry-run') || process.env.MIGRATION_DRY_RUN === 'true',
    validate: args.has('--validate') || process.env.MIGRATION_VALIDATE === 'true',
    allowNonEmpty,
    limit: limitRaw ? Number(limitRaw) : undefined,
    batchSize: batchRaw ? Number(batchRaw) : DEFAULT_BATCH_SIZE,
    mappingPath: mappingPath || DEFAULT_MAPPING_PATH,
    fallbackPartnerId: fallbackPartnerId || undefined,
    skipAudit: args.has('--skip-audit') || process.env.MIGRATION_SKIP_AUDIT === 'true',
  };
};

const getEnv = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
};

const getPath = (obj: AnyDoc, pathValue: string): any => {
  return pathValue.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
};

const pickValue = (obj: AnyDoc, paths: string[]): any => {
  for (const pathValue of paths) {
    const value = getPath(obj, pathValue);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const toStringValue = (value: any): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value.toString) return value.toString();
  return undefined;
};

const toBooleanValue = (value: any): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
};

const toNumberValue = (value: any): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toDateValue = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
};

const toIdString = (value: any): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return value.toString();
};

const asEnum = <T extends string>(value: any, allowed: readonly T[], fallback?: T): T | undefined => {
  const str = toStringValue(value);
  if (!str) return fallback;
  if (allowed.includes(str as T)) return str as T;
  return fallback;
};

const USER_ROLES = ['admin', 'partner'] as const;
const PARTNER_TYPES = ['freelancer', 'used_car_dealer', 'property_dealer', 'builder', 'sub_dsa'] as const;
const ONBOARDING_STATUSES = ['pending', 'approved', 'rejected'] as const;
const KYC_STATUSES = ['pending', 'verified', 'rejected'] as const;
const LEAD_STATUSES = [
  'draft',
  'submitted',
  'docs_pending',
  'docs_uploaded',
  'bank_processing',
  'approved',
  'disbursed',
  'rejected',
] as const;
const EMPLOYMENT_TYPES = ['salaried', 'self_employed', 'business_owner', 'professional'] as const;
const DOCUMENT_STATUSES = ['pending', 'uploaded', 'verified', 'rejected'] as const;
const COMMISSION_STATUSES = ['pending', 'processing', 'paid'] as const;

const resolveCollectionName = (names: string[], available: Set<string>): string | undefined => {
  for (const name of names) {
    if (available.has(name)) return name;
  }
  return undefined;
};

const loadCollectionNames = async (db: mongoose.mongo.Db): Promise<Set<string>> => {
  const collections = await db.listCollections().toArray();
  return new Set(collections.map((collection) => collection.name));
};

const ensureMappingDir = async (mappingPath: string): Promise<void> => {
  const dir = path.dirname(mappingPath);
  await fs.mkdir(dir, { recursive: true });
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const mapUserDoc = (doc: AnyDoc) => {
  const email = toStringValue(pickValue(doc, ['email', 'emailAddress']))?.toLowerCase();
  const password = toStringValue(pickValue(doc, ['password', 'passwordHash', 'hashedPassword']));
  const firstName = toStringValue(pickValue(doc, ['firstName', 'first_name', 'name.first'])) || '';
  const lastName = toStringValue(pickValue(doc, ['lastName', 'last_name', 'name.last'])) || '';
  const phone = toStringValue(pickValue(doc, ['phone', 'mobileNumber', 'mobile']));

  return {
    email,
    password,
    firstName,
    lastName,
    phone,
    role: asEnum(pickValue(doc, ['role']), [...USER_ROLES], 'partner'),
    isActive: toBooleanValue(pickValue(doc, ['isActive', 'active'])) ?? true,
    isEmailVerified: toBooleanValue(pickValue(doc, ['isEmailVerified', 'emailVerified'])) ?? false,
    isPhoneVerified: toBooleanValue(pickValue(doc, ['isPhoneVerified', 'phoneVerified'])) ?? false,
    lastLogin: toDateValue(pickValue(doc, ['lastLogin', 'last_login'])),
    resetPasswordToken: toStringValue(pickValue(doc, ['resetPasswordToken', 'reset_password_token'])),
    resetPasswordExpires: toDateValue(
      pickValue(doc, ['resetPasswordExpires', 'reset_password_expires'])
    ),
    otp: toStringValue(pickValue(doc, ['otp'])),
    otpExpires: toDateValue(pickValue(doc, ['otpExpires', 'otp_expires'])),
    failedLoginAttempts: toNumberValue(
      pickValue(doc, ['failedLoginAttempts', 'failed_login_attempts'])
    ),
    lockUntil: toDateValue(pickValue(doc, ['lockUntil', 'lock_until'])),
    refreshToken: toStringValue(pickValue(doc, ['refreshToken', 'refresh_token'])),
    refreshTokenExpires: toDateValue(
      pickValue(doc, ['refreshTokenExpires', 'refresh_token_expires'])
    ),
    partnerType: asEnum(pickValue(doc, ['partnerType', 'partner_type']), [...PARTNER_TYPES]),
    city: toStringValue(pickValue(doc, ['city'])),
    state: toStringValue(pickValue(doc, ['state'])),
    pincode: toStringValue(pickValue(doc, ['pincode', 'pinCode'])),
    aadhaarNumber: toStringValue(pickValue(doc, ['aadhaarNumber', 'aadhaar_number'])),
    businessName: toStringValue(pickValue(doc, ['businessName', 'business_name'])),
    businessAddress: toStringValue(pickValue(doc, ['businessAddress', 'business_address'])),
    yearsInOperation: toStringValue(pickValue(doc, ['yearsInOperation', 'years_in_operation'])),
    panNumber: toStringValue(pickValue(doc, ['panNumber', 'pan_number'])),
    gstNumber: toStringValue(pickValue(doc, ['gstNumber', 'gst_number'])),
    hasExperience: toStringValue(pickValue(doc, ['hasExperience', 'has_experience'])),
    expectedLeads: toStringValue(pickValue(doc, ['expectedLeads', 'expected_leads'])),
    accountHolderName: toStringValue(
      pickValue(doc, ['accountHolderName', 'account_holder_name'])
    ),
    bankName: toStringValue(pickValue(doc, ['bankName', 'bank_name'])),
    accountNumber: toStringValue(pickValue(doc, ['accountNumber', 'account_number'])),
    ifscCode: toStringValue(pickValue(doc, ['ifscCode', 'ifsc_code'])),
    upiId: toStringValue(pickValue(doc, ['upiId', 'upi_id'])),
    consentDataShare: toBooleanValue(
      pickValue(doc, ['consentDataShare', 'consent_data_share'])
    ),
    consentCommission: toBooleanValue(
      pickValue(doc, ['consentCommission', 'consent_commission'])
    ),
    declarationNotEmployed: toBooleanValue(
      pickValue(doc, ['declarationNotEmployed', 'declaration_not_employed'])
    ),
    consentPrivacyPolicy: toBooleanValue(
      pickValue(doc, ['consentPrivacyPolicy', 'consent_privacy_policy'])
    ),
    onboardingStatus: asEnum(
      pickValue(doc, ['onboardingStatus', 'onboarding_status']),
      [...ONBOARDING_STATUSES]
    ),
    onboardingCompletedAt: toDateValue(
      pickValue(doc, ['onboardingCompletedAt', 'onboarding_completed_at'])
    ),
    kycStatus: asEnum(pickValue(doc, ['kycStatus', 'kyc_status']), [...KYC_STATUSES]),
    kycRejectionReason: toStringValue(
      pickValue(doc, ['kycRejectionReason', 'kyc_rejection_reason'])
    ),
    internalNotes: toStringValue(pickValue(doc, ['internalNotes', 'internal_notes'])),
    createdAt: toDateValue(pickValue(doc, ['createdAt', 'created_at'])) || new Date(),
    updatedAt: toDateValue(pickValue(doc, ['updatedAt', 'updated_at'])) || new Date(),
    passwordHistory: Array.isArray(doc.passwordHistory) ? doc.passwordHistory : [],
    activeSessions: Array.isArray(doc.activeSessions) ? doc.activeSessions : [],
  };
};

const mapLeadDoc = (doc: AnyDoc) => {
  const client = doc.client || {};
  const clientFullName =
    toStringValue(pickValue(doc, ['clientFullName', 'client_full_name'])) ||
    toStringValue(pickValue(client, ['fullName', 'full_name', 'name'])) ||
    'Unknown';

  return {
    clientFullName,
    clientPhone:
      toStringValue(pickValue(doc, ['clientPhone', 'client_phone'])) ||
      toStringValue(pickValue(client, ['phone', 'mobile'])) ||
      '',
    clientEmail:
      toStringValue(pickValue(doc, ['clientEmail', 'client_email'])) ||
      toStringValue(pickValue(client, ['email'])) ||
      '',
    clientDateOfBirth:
      toStringValue(pickValue(doc, ['clientDateOfBirth', 'client_date_of_birth'])) ||
      toStringValue(pickValue(client, ['dateOfBirth', 'dob'])),
    clientPanNumber:
      toStringValue(pickValue(doc, ['clientPanNumber', 'client_pan_number'])) ||
      toStringValue(pickValue(client, ['panNumber', 'pan'])),
    clientAadhaar:
      toStringValue(pickValue(doc, ['clientAadhaar', 'client_aadhaar'])) ||
      toStringValue(pickValue(client, ['aadhaarNumber', 'aadhaar'])),
    clientEmployment: asEnum(
      pickValue(doc, ['clientEmployment', 'client_employment', 'employmentType']),
      [...EMPLOYMENT_TYPES]
    ),
    clientIncome: toNumberValue(
      pickValue(doc, ['clientIncome', 'client_income', 'monthlyIncome'])
    ),
    clientCompany:
      toStringValue(pickValue(doc, ['clientCompany', 'client_company'])) ||
      toStringValue(pickValue(client, ['companyName', 'company'])),
    clientExperience: toNumberValue(
      pickValue(doc, ['clientExperience', 'client_experience', 'workExperience'])
    ),
    clientCity:
      toStringValue(pickValue(doc, ['clientCity', 'client_city'])) ||
      toStringValue(pickValue(client, ['city'])),
    clientPincode:
      toStringValue(pickValue(doc, ['clientPincode', 'client_pincode'])) ||
      toStringValue(pickValue(client, ['pincode', 'pinCode'])),
    loanType: toStringValue(pickValue(doc, ['loanType', 'loan_type'])) || 'unknown',
    loanAmount: toNumberValue(pickValue(doc, ['loanAmount', 'loan_amount'])) ?? 0,
    tenure: toNumberValue(pickValue(doc, ['tenure'])),
    sanctionedAmount: toNumberValue(pickValue(doc, ['sanctionedAmount', 'sanctioned_amount'])),
    disbursedAmount: toNumberValue(pickValue(doc, ['disbursedAmount', 'disbursed_amount'])),
    interestRate: toNumberValue(pickValue(doc, ['interestRate', 'interest_rate'])),
    emi: toNumberValue(pickValue(doc, ['emi'])),
    status: asEnum(pickValue(doc, ['status']), [...LEAD_STATUSES], 'submitted'),
    bankAssigned: toStringValue(pickValue(doc, ['bankAssigned', 'bank_assigned'])),
    bankLogo: toStringValue(pickValue(doc, ['bankLogo', 'bank_logo'])),
    preferredBank: toStringValue(pickValue(doc, ['preferredBank', 'preferred_bank'])),
    partnerId: toIdString(pickValue(doc, ['partnerId', 'partner_id', 'partner'])),
    partnerName: toStringValue(pickValue(doc, ['partnerName', 'partner_name'])) || 'Website Direct',
    isEligible: toBooleanValue(pickValue(doc, ['isEligible', 'is_eligible'])),
    maxLoanAmount: toNumberValue(pickValue(doc, ['maxLoanAmount', 'max_loan_amount'])),
    minLoanAmount: toNumberValue(pickValue(doc, ['minLoanAmount', 'min_loan_amount'])),
    estimatedEMI: toNumberValue(pickValue(doc, ['estimatedEMI', 'estimated_emi'])),
    eligibilityCheckedAt: toDateValue(
      pickValue(doc, ['eligibilityCheckedAt', 'eligibility_checked_at'])
    ),
    commissionAmount: toNumberValue(pickValue(doc, ['commissionAmount', 'commission_amount'])),
    commissionRate: toNumberValue(pickValue(doc, ['commissionRate', 'commission_rate'])),
    commissionStatus: asEnum(
      pickValue(doc, ['commissionStatus', 'commission_status']),
      [...COMMISSION_STATUSES]
    ),
    commissionPaidAt: toDateValue(pickValue(doc, ['commissionPaidAt', 'commission_paid_at'])),
    internalNotes: toStringValue(pickValue(doc, ['internalNotes', 'internal_notes'])),
    createdAt: toDateValue(pickValue(doc, ['createdAt', 'created_at'])) || new Date(),
    updatedAt: toDateValue(pickValue(doc, ['updatedAt', 'updated_at'])) || new Date(),
    documents: Array.isArray(doc.documents) ? doc.documents : [],
    timeline: Array.isArray(doc.timeline) ? doc.timeline : [],
  };
};

const mapAuditDoc = (doc: AnyDoc) => {
  return {
    event: toStringValue(pickValue(doc, ['event', 'eventType', 'type'])),
    userId: toIdString(pickValue(doc, ['userId', 'user_id'])),
    email: toStringValue(pickValue(doc, ['email'])),
    ip: toStringValue(pickValue(doc, ['ip', 'ipAddress', 'ip_address'])),
    userAgent: toStringValue(pickValue(doc, ['userAgent', 'user_agent'])),
    deviceFingerprint: toStringValue(pickValue(doc, ['deviceFingerprint', 'device_fingerprint'])),
    metadata: pickValue(doc, ['metadata', 'meta']) ?? undefined,
    success: toBooleanValue(pickValue(doc, ['success'])) ?? true,
    failureReason: toStringValue(pickValue(doc, ['failureReason', 'failure_reason'])),
    createdAt: toDateValue(pickValue(doc, ['createdAt', 'created_at'])) || new Date(),
  };
};

const buildUserCreate = (mapped: ReturnType<typeof mapUserDoc>, id: string) => ({
  id,
  email: mapped.email || `unknown-${id}@example.com`,
  password: mapped.password || null,
  firstName: mapped.firstName,
  lastName: mapped.lastName,
  phone: mapped.phone || null,
  role: mapped.role,
  isActive: mapped.isActive,
  isEmailVerified: mapped.isEmailVerified,
  isPhoneVerified: mapped.isPhoneVerified,
  lastLogin: mapped.lastLogin || null,
  resetPasswordToken: mapped.resetPasswordToken || null,
  resetPasswordExpires: mapped.resetPasswordExpires || null,
  otp: mapped.otp || null,
  otpExpires: mapped.otpExpires || null,
  failedLoginAttempts: mapped.failedLoginAttempts ?? 0,
  lockUntil: mapped.lockUntil || null,
  refreshToken: mapped.refreshToken || null,
  refreshTokenExpires: mapped.refreshTokenExpires || null,
  partnerType: mapped.partnerType || null,
  city: mapped.city || null,
  state: mapped.state || null,
  pincode: mapped.pincode || null,
  aadhaarNumber: mapped.aadhaarNumber || null,
  businessName: mapped.businessName || null,
  businessAddress: mapped.businessAddress || null,
  yearsInOperation: mapped.yearsInOperation || null,
  panNumber: mapped.panNumber || null,
  gstNumber: mapped.gstNumber || null,
  hasExperience: mapped.hasExperience || null,
  expectedLeads: mapped.expectedLeads || null,
  accountHolderName: mapped.accountHolderName || null,
  bankName: mapped.bankName || null,
  accountNumber: mapped.accountNumber || null,
  ifscCode: mapped.ifscCode || null,
  upiId: mapped.upiId || null,
  consentDataShare: mapped.consentDataShare ?? false,
  consentCommission: mapped.consentCommission ?? false,
  declarationNotEmployed: mapped.declarationNotEmployed ?? false,
  consentPrivacyPolicy: mapped.consentPrivacyPolicy ?? false,
  onboardingStatus: mapped.onboardingStatus || null,
  onboardingCompletedAt: mapped.onboardingCompletedAt || null,
  kycStatus: mapped.kycStatus || null,
  kycRejectionReason: mapped.kycRejectionReason || null,
  internalNotes: mapped.internalNotes || null,
  createdAt: mapped.createdAt,
  updatedAt: mapped.updatedAt,
});

const buildLeadCreate = (mapped: ReturnType<typeof mapLeadDoc>, id: string, partnerId: string) => ({
  id,
  clientFullName: mapped.clientFullName,
  clientPhone: mapped.clientPhone,
  clientEmail: mapped.clientEmail,
  clientDateOfBirth: mapped.clientDateOfBirth || null,
  clientPanNumber: mapped.clientPanNumber || null,
  clientAadhaar: mapped.clientAadhaar || null,
  clientEmployment: mapped.clientEmployment || null,
  clientIncome: mapped.clientIncome ?? null,
  clientCompany: mapped.clientCompany || null,
  clientExperience: mapped.clientExperience ?? null,
  clientCity: mapped.clientCity || null,
  clientPincode: mapped.clientPincode || null,
  loanType: mapped.loanType,
  loanAmount: mapped.loanAmount,
  tenure: mapped.tenure ?? null,
  sanctionedAmount: mapped.sanctionedAmount ?? null,
  disbursedAmount: mapped.disbursedAmount ?? null,
  interestRate: mapped.interestRate ?? null,
  emi: mapped.emi ?? null,
  status: mapped.status,
  bankAssigned: mapped.bankAssigned || null,
  bankLogo: mapped.bankLogo || null,
  preferredBank: mapped.preferredBank || null,
  partnerId,
  partnerName: mapped.partnerName,
  isEligible: mapped.isEligible ?? null,
  maxLoanAmount: mapped.maxLoanAmount ?? null,
  minLoanAmount: mapped.minLoanAmount ?? null,
  estimatedEMI: mapped.estimatedEMI ?? null,
  eligibilityCheckedAt: mapped.eligibilityCheckedAt ?? null,
  commissionAmount: mapped.commissionAmount ?? null,
  commissionRate: mapped.commissionRate ?? null,
  commissionStatus: mapped.commissionStatus ?? null,
  commissionPaidAt: mapped.commissionPaidAt ?? null,
  internalNotes: mapped.internalNotes || null,
  createdAt: mapped.createdAt,
  updatedAt: mapped.updatedAt,
});

const migrateUsers = async (
  usersCollection: mongoose.mongo.Collection,
  options: MigrationOptions,
  mappings: MappingOutput
) => {
  const cursor = usersCollection.find();
  if (options.limit) cursor.limit(options.limit);

  const usersBatch: Prisma.UserCreateManyInput[] = [];
  const passwordHistoryBatch: Prisma.PasswordHistoryCreateManyInput[] = [];
  const activeSessionsBatch: Prisma.ActiveSessionCreateManyInput[] = [];
  let total = 0;

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as AnyDoc;
    if (!doc) break;

    const mongoId = toIdString(doc._id);
    if (!mongoId) continue;
    const uuid = crypto.randomUUID();

    const mapped = mapUserDoc(doc);
    mappings.users.push({ mongoId, uuid });
    usersBatch.push(buildUserCreate(mapped, uuid));

    for (const history of mapped.passwordHistory) {
      const hash = toStringValue(history?.hash || history?.password || history);
      if (!hash) continue;
      passwordHistoryBatch.push({
        userId: uuid,
        hash,
        changedAt: toDateValue(history?.changedAt || history?.createdAt) || new Date(),
      });
    }

    for (const session of mapped.activeSessions) {
      const deviceFingerprint = toStringValue(
        session?.deviceFingerprint || session?.device || session?.fingerprint
      );
      if (!deviceFingerprint) continue;
      activeSessionsBatch.push({
        userId: uuid,
        deviceFingerprint,
        lastActive: toDateValue(session?.lastActive || session?.updatedAt) || new Date(),
        userAgent: toStringValue(session?.userAgent || session?.ua) || null,
        ip: toStringValue(session?.ip || session?.ipAddress) || null,
      });
    }

    total += 1;

    if (usersBatch.length >= options.batchSize) {
      if (!options.dryRun) {
        await prisma.user.createMany({ data: usersBatch });
        if (passwordHistoryBatch.length > 0) {
          await prisma.passwordHistory.createMany({ data: passwordHistoryBatch });
        }
        if (activeSessionsBatch.length > 0) {
          await prisma.activeSession.createMany({ data: activeSessionsBatch, skipDuplicates: true });
        }
      }
      usersBatch.length = 0;
      passwordHistoryBatch.length = 0;
      activeSessionsBatch.length = 0;
    }
  }

  if (usersBatch.length > 0) {
    if (!options.dryRun) {
      await prisma.user.createMany({ data: usersBatch });
      if (passwordHistoryBatch.length > 0) {
        await prisma.passwordHistory.createMany({ data: passwordHistoryBatch });
      }
      if (activeSessionsBatch.length > 0) {
        await prisma.activeSession.createMany({ data: activeSessionsBatch, skipDuplicates: true });
      }
    }
  }

  console.log(`Users processed: ${total}`);
};

const migrateLeads = async (
  leadsCollection: mongoose.mongo.Collection,
  options: MigrationOptions,
  mappings: MappingOutput
) => {
  const cursor = leadsCollection.find();
  if (options.limit) cursor.limit(options.limit);

  const leadBatch: Prisma.LeadCreateManyInput[] = [];
  const documentBatch: Prisma.LeadDocumentCreateManyInput[] = [];
  const timelineBatch: Prisma.LeadTimelineCreateManyInput[] = [];
  let total = 0;
  let skipped = 0;

  const userIdMap = new Map(mappings.users.map((entry) => [entry.mongoId, entry.uuid]));

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as AnyDoc;
    if (!doc) break;

    const mongoId = toIdString(doc._id);
    if (!mongoId) continue;
    const uuid = crypto.randomUUID();

    const mapped = mapLeadDoc(doc);
    const partnerIdRaw = mapped.partnerId;
    const partnerIdMapped =
      (partnerIdRaw ? userIdMap.get(partnerIdRaw) : undefined) || options.fallbackPartnerId;

    if (!partnerIdMapped) {
      skipped += 1;
      continue;
    }

    mappings.leads.push({ mongoId, uuid });
    leadBatch.push(buildLeadCreate(mapped, uuid, partnerIdMapped));

    const documents = mapped.documents.length > 0 ? mapped.documents : [];
    for (const docItem of documents) {
      const type = toStringValue(docItem?.type || docItem?.documentType) || 'unknown';
      documentBatch.push({
        leadId: uuid,
        type,
        fileName: toStringValue(docItem?.fileName || docItem?.name || docItem?.filename) || type,
        fileSize: toStringValue(docItem?.fileSize || docItem?.size) || null,
        fileUrl: toStringValue(docItem?.fileUrl || docItem?.url) || null,
        uploadedAt: toDateValue(docItem?.uploadedAt || docItem?.createdAt) || new Date(),
        status: asEnum(docItem?.status, [...DOCUMENT_STATUSES], 'pending'),
        rejectionReason: toStringValue(docItem?.rejectionReason || docItem?.reason) || null,
      });
    }

    const timeline = mapped.timeline.length > 0 ? mapped.timeline : [];
    if (timeline.length === 0 && mapped.status) {
      timeline.push({
        status: mapped.status,
        timestamp: mapped.createdAt,
        note: 'Migrated status',
        updatedBy: 'System',
      });
    }

    for (const event of timeline) {
      timelineBatch.push({
        leadId: uuid,
        status: asEnum(event?.status, [...LEAD_STATUSES], (mapped.status as LeadStatus) || 'submitted') as LeadStatus,
        timestamp: toDateValue(event?.timestamp || event?.createdAt) || new Date(),
        note: toStringValue(event?.note || event?.comment) || null,
        updatedBy: toStringValue(event?.updatedBy || event?.user || event?.by) || 'System',
      });
    }

    total += 1;

    if (leadBatch.length >= options.batchSize) {
      if (!options.dryRun) {
        await prisma.lead.createMany({ data: leadBatch });
        if (documentBatch.length > 0) {
          await prisma.leadDocument.createMany({ data: documentBatch });
        }
        if (timelineBatch.length > 0) {
          await prisma.leadTimeline.createMany({ data: timelineBatch });
        }
      }
      leadBatch.length = 0;
      documentBatch.length = 0;
      timelineBatch.length = 0;
    }
  }

  if (leadBatch.length > 0) {
    if (!options.dryRun) {
      await prisma.lead.createMany({ data: leadBatch });
      if (documentBatch.length > 0) {
        await prisma.leadDocument.createMany({ data: documentBatch });
      }
      if (timelineBatch.length > 0) {
        await prisma.leadTimeline.createMany({ data: timelineBatch });
      }
    }
  }

  console.log(`Leads processed: ${total} (skipped: ${skipped})`);
};

const migrateAuditLogs = async (
  auditCollection: mongoose.mongo.Collection,
  options: MigrationOptions,
  mappings: MappingOutput
) => {
  const cursor = auditCollection.find();
  if (options.limit) cursor.limit(options.limit);

  const auditBatch: Prisma.AuditLogCreateManyInput[] = [];
  let total = 0;

  const userIdMap = new Map(mappings.users.map((entry) => [entry.mongoId, entry.uuid]));

  while (await cursor.hasNext()) {
    const doc = (await cursor.next()) as AnyDoc;
    if (!doc) break;

    const mapped = mapAuditDoc(doc);
    const mappedUserId = mapped.userId ? userIdMap.get(mapped.userId) : undefined;

    auditBatch.push({
      id: crypto.randomUUID(),
      event: (mapped.event as AuditEventType) || 'LOGIN_FAILED',
      userId: mappedUserId || null,
      email: mapped.email || null,
      ip: mapped.ip || null,
      userAgent: mapped.userAgent || null,
      deviceFingerprint: mapped.deviceFingerprint || null,
      metadata: mapped.metadata || null,
      success: mapped.success,
      failureReason: mapped.failureReason || null,
      createdAt: mapped.createdAt,
    });

    total += 1;

    if (auditBatch.length >= options.batchSize) {
      if (!options.dryRun) {
        await prisma.auditLog.createMany({ data: auditBatch });
      }
      auditBatch.length = 0;
    }
  }

  if (auditBatch.length > 0 && !options.dryRun) {
    await prisma.auditLog.createMany({ data: auditBatch });
  }

  console.log(`Audit logs processed: ${total}`);
};

const validateMigration = async () => {
  const [
    userCount,
    leadCount,
    docCount,
    timelineCount,
    passwordHistoryCount,
    activeSessionCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.lead.count(),
    prisma.leadDocument.count(),
    prisma.leadTimeline.count(),
    prisma.passwordHistory.count(),
    prisma.activeSession.count(),
  ]);

  const [
    orphanDocs,
    orphanTimeline,
    orphanPassword,
    orphanSessions,
  ] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM lead_documents d
      LEFT JOIN leads l ON d.lead_id = l.id
      WHERE l.id IS NULL
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM lead_timeline t
      LEFT JOIN leads l ON t.lead_id = l.id
      WHERE l.id IS NULL
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM password_history p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE u.id IS NULL
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM active_sessions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE u.id IS NULL
    `,
  ]);

  console.log('Postgres counts:');
  console.log(`- users: ${userCount}`);
  console.log(`- leads: ${leadCount}`);
  console.log(`- lead_documents: ${docCount}`);
  console.log(`- lead_timeline: ${timelineCount}`);
  console.log(`- password_history: ${passwordHistoryCount}`);
  console.log(`- active_sessions: ${activeSessionCount}`);
  console.log('FK integrity checks (orphan counts):');
  console.log(`- lead_documents: ${orphanDocs[0]?.count ?? 0}`);
  console.log(`- lead_timeline: ${orphanTimeline[0]?.count ?? 0}`);
  console.log(`- password_history: ${orphanPassword[0]?.count ?? 0}`);
  console.log(`- active_sessions: ${orphanSessions[0]?.count ?? 0}`);
};

const main = async () => {
  const options = parseArgs();
  const mongoUri = getEnv('MONGODB_URI') || getEnv('MONGO_URI');
  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI (or MONGO_URI).');
  }

  const mongoDbOverride = getEnv('MONGODB_DB');

  console.log('Starting migration with options:', options);

  await mongoose.connect(mongoUri, mongoDbOverride ? { dbName: mongoDbOverride } : undefined);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Failed to connect to MongoDB: db is undefined');
  }
  const availableCollections = await loadCollectionNames(db);

  const usersCollectionName =
    getEnv('MIGRATION_USERS_COLLECTION') ||
    resolveCollectionName(['users', 'user', 'app_users'], availableCollections);
  const leadsCollectionName =
    getEnv('MIGRATION_LEADS_COLLECTION') ||
    resolveCollectionName(['leads', 'lead', 'app_leads'], availableCollections);
  const auditCollectionName =
    getEnv('MIGRATION_AUDIT_COLLECTION') ||
    resolveCollectionName(
      ['audit_logs', 'auditlogs', 'auditLogs', 'audit_log'],
      availableCollections
    );

  if (!usersCollectionName || !leadsCollectionName) {
    throw new Error(
      `Missing required collections. Found: ${Array.from(availableCollections).join(', ')}`
    );
  }

  if (!options.allowNonEmpty) {
    const [userCount, leadCount] = await Promise.all([prisma.user.count(), prisma.lead.count()]);
    if (userCount > 0 || leadCount > 0) {
      throw new Error(
        `Postgres already has data (users: ${userCount}, leads: ${leadCount}). Set MIGRATION_ALLOW_NONEMPTY=true or use --allow-nonempty to continue.`
      );
    }
  }

  const usersCollection = db.collection(usersCollectionName);
  const leadsCollection = db.collection(leadsCollectionName);
  const auditCollection = auditCollectionName ? db.collection(auditCollectionName) : undefined;

  const mappings: MappingOutput = { users: [], leads: [] };

  console.log(`Mongo collections: users=${usersCollectionName}, leads=${leadsCollectionName}`);
  if (auditCollection && !options.skipAudit) {
    console.log(`Mongo collections: audit=${auditCollectionName}`);
  }

  await migrateUsers(usersCollection, options, mappings);
  await migrateLeads(leadsCollection, options, mappings);

  if (auditCollection && !options.skipAudit) {
    await migrateAuditLogs(auditCollection, options, mappings);
  }

  await ensureMappingDir(options.mappingPath);
  await fs.writeFile(options.mappingPath, JSON.stringify(mappings, null, 2), 'utf8');
  console.log(`Wrote mapping to ${options.mappingPath}`);

  if (options.validate && !options.dryRun) {
    await validateMigration();
  }
};

main()
  .then(async () => {
    await mongoose.disconnect();
    await prisma.$disconnect();
    console.log('Migration completed.');
  })
  .catch(async (error) => {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    await prisma.$disconnect();
    process.exit(1);
  });
