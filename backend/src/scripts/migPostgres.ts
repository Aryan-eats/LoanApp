/**
 * MongoDB to PostgreSQL Migration Script
 * Migrates all data from MongoDB collections to PostgreSQL tables via Prisma
 */

import 'dotenv/config';
import { MongoClient, ObjectId, Db } from 'mongodb';
import { PrismaClient, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Initialize Prisma with pg adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in environment');
  process.exit(1);
}

// ID mapping from MongoDB ObjectId to PostgreSQL UUID
const idMap = {
  users: new Map<string, string>(),
  leads: new Map<string, string>(),
};

// Helper to convert MongoDB ObjectId to deterministic UUID
function objectIdToUuid(objectId: string): string {
  // Pad the 24-char ObjectId to 32 chars and format as UUID
  const padded = objectId.padEnd(32, '0');
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}

// Helper to safely parse date
function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(value as string);
  return isNaN(date.getTime()) ? null : date;
}

// Helper to safely parse decimal
function parseDecimal(value: unknown): Prisma.Decimal | null {
  if (value === null || value === undefined) return null;
  try {
    return new Prisma.Decimal(String(value));
  } catch {
    return null;
  }
}

// Map MongoDB enum values to Prisma enums
function mapUserRole(role: string): 'admin' | 'partner' {
  return role === 'admin' ? 'admin' : 'partner';
}

function mapPartnerType(type: string | null): 'freelancer' | 'used_car_dealer' | 'property_dealer' | 'builder' | 'sub_dsa' | null {
  const mapping: Record<string, 'freelancer' | 'used_car_dealer' | 'property_dealer' | 'builder' | 'sub_dsa'> = {
    freelancer: 'freelancer',
    'used-car-dealer': 'used_car_dealer',
    used_car_dealer: 'used_car_dealer',
    'property-dealer': 'property_dealer',
    property_dealer: 'property_dealer',
    builder: 'builder',
    'sub-dsa': 'sub_dsa',
    sub_dsa: 'sub_dsa',
  };
  return type ? mapping[type] || null : null;
}

function mapOnboardingStatus(status: string | null): 'pending' | 'approved' | 'rejected' | null {
  const mapping: Record<string, 'pending' | 'approved' | 'rejected'> = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
  };
  return status ? mapping[status] || 'pending' : null;
}

function mapKycStatus(status: string | null): 'pending' | 'verified' | 'rejected' | null {
  const mapping: Record<string, 'pending' | 'verified' | 'rejected'> = {
    pending: 'pending',
    verified: 'verified',
    rejected: 'rejected',
  };
  return status ? mapping[status] || 'pending' : null;
}

function mapLeadStatus(status: string): 'draft' | 'submitted' | 'docs_pending' | 'docs_uploaded' | 'bank_processing' | 'approved' | 'disbursed' | 'rejected' {
  const mapping: Record<string, 'draft' | 'submitted' | 'docs_pending' | 'docs_uploaded' | 'bank_processing' | 'approved' | 'disbursed' | 'rejected'> = {
    draft: 'draft',
    submitted: 'submitted',
    'docs-pending': 'docs_pending',
    docs_pending: 'docs_pending',
    'docs-uploaded': 'docs_uploaded',
    docs_uploaded: 'docs_uploaded',
    'bank-processing': 'bank_processing',
    bank_processing: 'bank_processing',
    approved: 'approved',
    disbursed: 'disbursed',
    rejected: 'rejected',
  };
  return mapping[status] || 'submitted';
}

function mapEmploymentType(type: string | null): 'salaried' | 'self_employed' | 'business_owner' | 'professional' | null {
  const mapping: Record<string, 'salaried' | 'self_employed' | 'business_owner' | 'professional'> = {
    salaried: 'salaried',
    'self-employed': 'self_employed',
    self_employed: 'self_employed',
    'business-owner': 'business_owner',
    business_owner: 'business_owner',
    professional: 'professional',
  };
  return type ? mapping[type] || null : null;
}

function mapDocumentStatus(status: string): 'pending' | 'uploaded' | 'verified' | 'rejected' {
  const mapping: Record<string, 'pending' | 'uploaded' | 'verified' | 'rejected'> = {
    pending: 'pending',
    uploaded: 'uploaded',
    verified: 'verified',
    rejected: 'rejected',
  };
  return mapping[status] || 'pending';
}

function mapCommissionStatus(status: string | null): 'pending' | 'processing' | 'paid' | null {
  const mapping: Record<string, 'pending' | 'processing' | 'paid'> = {
    pending: 'pending',
    processing: 'processing',
    paid: 'paid',
  };
  return status ? mapping[status] || null : null;
}

function mapAuditEventType(event: string): 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_SUCCESS' | 'PASSWORD_CHANGE' | 'OTP_SENT' | 'OTP_VERIFIED' | 'ACCOUNT_LOCKED' | 'TOKEN_REFRESH' | 'SUSPICIOUS_ACTIVITY' {
  const mapping: Record<string, 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_SUCCESS' | 'PASSWORD_CHANGE' | 'OTP_SENT' | 'OTP_VERIFIED' | 'ACCOUNT_LOCKED' | 'TOKEN_REFRESH' | 'SUSPICIOUS_ACTIVITY'> = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    OTP_SENT: 'OTP_SENT',
    OTP_VERIFIED: 'OTP_VERIFIED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    TOKEN_REFRESH: 'TOKEN_REFRESH',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  };
  return mapping[event] || 'SUSPICIOUS_ACTIVITY';
}

const hashEmail = (email: string): string =>
  crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

async function migrateUsers(db: Db) {
  console.log('\n📦 Migrating Users...');
  const users = await db.collection('users').find({}).toArray();
  console.log(`   Found ${users.length} users in MongoDB`);

  let migrated = 0;
  for (const user of users) {
    const mongoId = user._id.toString();
    const uuid = objectIdToUuid(mongoId);
    idMap.users.set(mongoId, uuid);

    const userData = {
      id: uuid,
      email: user.email,
      password: user.password || null,
      firstName: user.firstName || user.first_name || 'Unknown',
      lastName: user.lastName || user.last_name || 'User',
      phone: user.phone || null,
      role: mapUserRole(user.role),
      isActive: user.isActive ?? user.is_active ?? true,
      isEmailVerified: user.isEmailVerified ?? user.is_email_verified ?? false,
      isPhoneVerified: user.isPhoneVerified ?? user.is_phone_verified ?? false,
      lastLogin: parseDate(user.lastLogin || user.last_login),
      resetPasswordToken: user.resetPasswordToken || user.reset_password_token || null,
      resetPasswordExpires: parseDate(user.resetPasswordExpires || user.reset_password_expires),
      otpHash: user.otp || null,
      otpExpires: parseDate(user.otpExpires || user.otp_expires),
      failedLoginAttempts: user.failedLoginAttempts ?? user.failed_login_attempts ?? 0,
      lockUntil: parseDate(user.lockUntil || user.lock_until),
      refreshToken: (user.refreshToken || user.refresh_token)
        ? hashToken(String(user.refreshToken || user.refresh_token))
        : null,
      refreshTokenExpires: parseDate(user.refreshTokenExpires || user.refresh_token_expires),
      partnerType: mapPartnerType(user.partnerType || user.partner_type),
      city: user.city || null,
      state: user.state || null,
      pincode: user.pincode || null,
      aadhaarNumber: user.aadhaarNumber || user.aadhaar_number || null,
      businessName: user.businessName || user.business_name || null,
      businessAddress: user.businessAddress || user.business_address || null,
      yearsInOperation: user.yearsInOperation || user.years_in_operation || null,
      panNumber: user.panNumber || user.pan_number || null,
      gstNumber: user.gstNumber || user.gst_number || null,
      hasExperience: user.hasExperience || user.has_experience || null,
      expectedLeads: user.expectedLeads || user.expected_leads || null,
      accountHolderName: user.accountHolderName || user.account_holder_name || null,
      bankName: user.bankName || user.bank_name || null,
      accountNumber: user.accountNumber || user.account_number || null,
      ifscCode: user.ifscCode || user.ifsc_code || null,
      upiId: user.upiId || user.upi_id || null,
      consentDataShare: user.consentDataShare ?? user.consent_data_share ?? false,
      consentCommission: user.consentCommission ?? user.consent_commission ?? false,
      declarationNotEmployed: user.declarationNotEmployed ?? user.declaration_not_employed ?? false,
      consentPrivacyPolicy: user.consentPrivacyPolicy ?? user.consent_privacy_policy ?? false,
      onboardingStatus: mapOnboardingStatus(user.onboardingStatus || user.onboarding_status),
      onboardingCompletedAt: parseDate(user.onboardingCompletedAt || user.onboarding_completed_at),
      kycStatus: mapKycStatus(user.kycStatus || user.kyc_status),
      kycRejectionReason: user.kycRejectionReason || user.kyc_rejection_reason || null,
      internalNotes: user.internalNotes || user.internal_notes || null,
      createdAt: parseDate(user.createdAt || user.created_at) || new Date(),
      updatedAt: parseDate(user.updatedAt || user.updated_at) || new Date(),
    };

    if (!DRY_RUN) {
      await prisma.user.upsert({
        where: { id: uuid },
        update: userData,
        create: userData,
      });
    }
    migrated++;
  }
  console.log(`   ✅ Migrated ${migrated} users`);
}

async function migrateLeads(db: Db) {
  console.log('\n📦 Migrating Leads...');
  const leads = await db.collection('leads').find({}).toArray();
  console.log(`   Found ${leads.length} leads in MongoDB`);

  let migrated = 0;
  let skipped = 0;
  for (const lead of leads) {
    const mongoId = lead._id.toString();
    const uuid = objectIdToUuid(mongoId);
    idMap.leads.set(mongoId, uuid);

    // Get partner UUID from mapping
    const partnerMongoId = lead.partnerId?.toString() || lead.partner_id?.toString();
    const partnerUuid = partnerMongoId ? idMap.users.get(partnerMongoId) : null;

    if (!partnerUuid) {
      console.log(`   ⚠️ Skipping lead ${mongoId}: partner not found`);
      skipped++;
      continue;
    }

    const leadData = {
      id: uuid,
      clientFullName: lead.clientFullName || lead.client_full_name || lead.customerName || lead.customer_name || 'Unknown',
      clientPhone: lead.clientPhone || lead.client_phone || lead.customerPhone || lead.customer_phone || '',
      clientEmail: lead.clientEmail || lead.client_email || lead.customerEmail || lead.customer_email || '',
      clientDateOfBirth: lead.clientDateOfBirth || lead.client_date_of_birth || lead.customerDateOfBirth || lead.customer_date_of_birth || null,
      clientPanNumber: lead.clientPanNumber || lead.client_pan_number || lead.customerPanNumber || lead.customer_pan_number || null,
      clientAadhaar: lead.clientAadhaar || lead.client_aadhaar || lead.customerAadhaar || lead.customer_aadhaar || null,
      clientEmployment: mapEmploymentType(lead.clientEmployment || lead.client_employment || lead.customerEmployment || lead.customer_employment),
      clientIncome: parseDecimal(lead.clientIncome || lead.client_income || lead.customerIncome || lead.customer_income),
      clientCompany: lead.clientCompany || lead.client_company || lead.customerCompany || lead.customer_company || null,
      clientExperience: lead.clientExperience ?? lead.client_experience ?? lead.customerExperience ?? lead.customer_experience ?? null,
      clientCity: lead.clientCity || lead.client_city || lead.customerCity || lead.customer_city || null,
      clientPincode: lead.clientPincode || lead.client_pincode || lead.customerPincode || lead.customer_pincode || null,
      loanType: lead.loanType || lead.loan_type || 'personal',
      loanAmount: parseDecimal(lead.loanAmount || lead.loan_amount) || new Prisma.Decimal(0),
      tenure: lead.tenure ?? null,
      sanctionedAmount: parseDecimal(lead.sanctionedAmount || lead.sanctioned_amount),
      disbursedAmount: parseDecimal(lead.disbursedAmount || lead.disbursed_amount),
      interestRate: parseDecimal(lead.interestRate || lead.interest_rate),
      emi: parseDecimal(lead.emi),
      status: mapLeadStatus(lead.status || 'submitted'),
      bankAssigned: lead.bankAssigned || lead.bank_assigned || null,
      bankLogo: lead.bankLogo || lead.bank_logo || null,
      preferredBank: lead.preferredBank || lead.preferred_bank || null,
      partnerId: partnerUuid,
      partnerName: lead.partnerName || lead.partner_name || 'Unknown',
      isEligible: lead.isEligible ?? lead.is_eligible ?? null,
      maxLoanAmount: parseDecimal(lead.maxLoanAmount || lead.max_loan_amount),
      minLoanAmount: parseDecimal(lead.minLoanAmount || lead.min_loan_amount),
      estimatedEMI: parseDecimal(lead.estimatedEMI || lead.estimated_emi),
      eligibilityCheckedAt: parseDate(lead.eligibilityCheckedAt || lead.eligibility_checked_at),
      commissionAmount: parseDecimal(lead.commissionAmount || lead.commission_amount),
      commissionRate: parseDecimal(lead.commissionRate || lead.commission_rate),
      commissionStatus: mapCommissionStatus(lead.commissionStatus || lead.commission_status),
      commissionPaidAt: parseDate(lead.commissionPaidAt || lead.commission_paid_at),
      internalNotes: lead.internalNotes || lead.internal_notes || null,
      createdAt: parseDate(lead.createdAt || lead.created_at) || new Date(),
      updatedAt: parseDate(lead.updatedAt || lead.updated_at) || new Date(),
    };

    if (!DRY_RUN) {
      await prisma.lead.upsert({
        where: { id: uuid },
        update: leadData,
        create: leadData,
      });
    }
    migrated++;
  }
  console.log(`   ✅ Migrated ${migrated} leads (skipped ${skipped})`);
}

async function migrateLeadDocuments(db: Db) {
  console.log('\n📦 Migrating Lead Documents...');
  const docs = await db.collection('leaddocuments').find({}).toArray();
  console.log(`   Found ${docs.length} documents in MongoDB`);

  let migrated = 0;
  let skipped = 0;
  for (const doc of docs) {
    const mongoId = doc._id.toString();
    const uuid = objectIdToUuid(mongoId);

    const leadMongoId = doc.leadId?.toString() || doc.lead_id?.toString();
    const leadUuid = leadMongoId ? idMap.leads.get(leadMongoId) : null;

    if (!leadUuid) {
      skipped++;
      continue;
    }

    const docData = {
      id: uuid,
      leadId: leadUuid,
      type: doc.type || 'other',
      fileName: doc.fileName || doc.file_name || 'unknown',
      fileSize: doc.fileSize || doc.file_size || null,
      fileUrl: doc.fileUrl || doc.file_url || null,
      uploadedAt: parseDate(doc.uploadedAt || doc.uploaded_at) || new Date(),
      status: mapDocumentStatus(doc.status || 'pending'),
      rejectionReason: doc.rejectionReason || doc.rejection_reason || null,
    };

    if (!DRY_RUN) {
      await prisma.leadDocument.upsert({
        where: { id: uuid },
        update: docData,
        create: docData,
      });
    }
    migrated++;
  }
  console.log(`   ✅ Migrated ${migrated} documents (skipped ${skipped})`);
}

async function migrateLeadTimelines(db: Db) {
  console.log('\n📦 Migrating Lead Timelines...');
  const timelines = await db.collection('leadtimelines').find({}).toArray();
  console.log(`   Found ${timelines.length} timeline entries in MongoDB`);

  let migrated = 0;
  let skipped = 0;
  for (const tl of timelines) {
    const mongoId = tl._id.toString();
    const uuid = objectIdToUuid(mongoId);

    const leadMongoId = tl.leadId?.toString() || tl.lead_id?.toString();
    const leadUuid = leadMongoId ? idMap.leads.get(leadMongoId) : null;

    if (!leadUuid) {
      skipped++;
      continue;
    }

    const tlData = {
      id: uuid,
      leadId: leadUuid,
      status: mapLeadStatus(tl.status || 'submitted'),
      timestamp: parseDate(tl.timestamp) || new Date(),
      note: tl.note || null,
      updatedBy: tl.updatedBy || tl.updated_by || 'system',
    };

    if (!DRY_RUN) {
      await prisma.leadTimeline.upsert({
        where: { id: uuid },
        update: tlData,
        create: tlData,
      });
    }
    migrated++;
  }
  console.log(`   ✅ Migrated ${migrated} timeline entries (skipped ${skipped})`);
}

async function migrateAuditLogs(db: Db) {
  console.log('\n📦 Migrating Audit Logs...');
  const logs = await db.collection('auditlogs').find({}).toArray();
  console.log(`   Found ${logs.length} audit logs in MongoDB`);

  let migrated = 0;
  for (const log of logs) {
    const mongoId = log._id.toString();
    const uuid = objectIdToUuid(mongoId);

    const userMongoId = log.userId?.toString() || log.user_id?.toString();
    const userUuid = userMongoId ? idMap.users.get(userMongoId) : null;

    const logData = {
      id: uuid,
      event: mapAuditEventType(log.event),
      userId: userUuid,
      hashedEmail: log.email ? hashEmail(log.email) : null,
      ip: log.ip || null,
      userAgent: log.userAgent || log.user_agent || null,
      deviceFingerprint: log.deviceFingerprint || log.device_fingerprint || null,
      metadata: log.metadata || null,
      success: log.success ?? true,
      failureReason: log.failureReason || log.failure_reason || null,
      createdAt: parseDate(log.createdAt || log.created_at) || new Date(),
    };

    if (!DRY_RUN) {
      await prisma.auditLog.upsert({
        where: { id: uuid },
        update: logData,
        create: logData,
      });
    }
    migrated++;
  }
  console.log(`   ✅ Migrated ${migrated} audit logs`);
}

async function migrateActiveSessions(db: Db) {
  console.log('\n📦 Migrating Active Sessions...');
  const sessions = await db.collection('activesessions').find({}).toArray();
  console.log(`   Found ${sessions.length} sessions in MongoDB`);

  let migrated = 0;
  let skipped = 0;
  for (const sess of sessions) {
    const mongoId = sess._id.toString();
    const uuid = objectIdToUuid(mongoId);

    const userMongoId = sess.userId?.toString() || sess.user_id?.toString();
    const userUuid = userMongoId ? idMap.users.get(userMongoId) : null;

    if (!userUuid) {
      skipped++;
      continue;
    }

    const sessData = {
      id: uuid,
      userId: userUuid,
      deviceFingerprint: sess.deviceFingerprint || sess.device_fingerprint || 'unknown',
      lastActive: parseDate(sess.lastActive || sess.last_active) || new Date(),
      userAgent: sess.userAgent || sess.user_agent || null,
      ip: sess.ip || null,
    };

    if (!DRY_RUN) {
      try {
        await prisma.activeSession.upsert({
          where: { id: uuid },
          update: sessData,
          create: sessData,
        });
        migrated++;
      } catch {
        // Skip duplicate fingerprint errors
        skipped++;
      }
    } else {
      migrated++;
    }
  }
  console.log(`   ✅ Migrated ${migrated} sessions (skipped ${skipped})`);
}

async function main() {
  console.log('🚀 MongoDB to PostgreSQL Migration');
  console.log('===================================');
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No data will be written');
  }

  const mongoClient = new MongoClient(MONGODB_URI!);

  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoClient.connect();
    const db = mongoClient.db();
    console.log('   ✅ Connected to MongoDB');

    // Test PostgreSQL connection
    console.log('\n🔌 Testing PostgreSQL connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ Connected to PostgreSQL');

    // Run migrations in order (users first for foreign keys)
    await migrateUsers(db);
    await migrateLeads(db);
    await migrateLeadDocuments(db);
    await migrateLeadTimelines(db);
    await migrateAuditLogs(db);
    await migrateActiveSessions(db);

    console.log('\n===================================');
    console.log('✅ Migration completed successfully!');
    if (DRY_RUN) {
      console.log('⚠️  This was a dry run. Run without --dry-run to persist data.');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
