import { Prisma, type UserRole } from '@prisma/client';
import prisma from '../../shared/db/prisma.js';
import {
  decryptField,
  encryptForGPSIndia,
  isEncryptedCiphertext,
} from '../../shared/security/encryption.js';
import { getNextGpsifsLeadId } from '../leads/lead.helpers.js';
import { decryptResultWithBridge } from '../../shared/security/fieldEncryption.js';

const GPS_INDIA_GRANTED_TO = 'gps_india';

const parseDate = (input: string | Date | null | undefined): Date | null => {
  if (!input) return null;
  const value = input instanceof Date ? input : new Date(input);
  return Number.isNaN(value.getTime()) ? null : value;
};

const decryptPartnerValue = async (
  partnerOrgId: string,
  value: string | null
): Promise<string | null> => {
  if (!value) return null;
  if (isEncryptedCiphertext(value)) return decryptField(partnerOrgId, value);
  return value;
};

const toEncryptedGpsValue = async (
  partnerOrgId: string,
  value: string | null
): Promise<string | null> => {
  const decrypted = await decryptPartnerValue(partnerOrgId, value);
  if (!decrypted) return null;
  return encryptForGPSIndia(decrypted);
};

const toRequiredEncryptedGpsValue = async (
  partnerOrgId: string,
  value: string | null,
  fieldName: string
): Promise<string> => {
  const encrypted = await toEncryptedGpsValue(partnerOrgId, value);
  if (!encrypted) {
    throw new Error(`Stored client ${fieldName} is required for GPS submission`);
  }
  return encrypted;
};

export type GrantAccessInput = {
  partnerDataId: string;
  partnerId: string;
  partnerOrgId: string;
  submittedBy: string;
  grantedTo?: string;
  expiresAt?: Date | string | null;
};

export type VerifyAccessInput = {
  leadId: string;
  requestingParty: string;
};

export type RevokeAccessInput = {
  consentGrantId: string;
  revokedBy: string;
};

export const grantAccess = async (params: GrantAccessInput) => {
  const grantedTo = params.grantedTo ?? GPS_INDIA_GRANTED_TO;
  const expiresAt = parseDate(params.expiresAt);

  const partnerData = await prisma.partnerData.findFirst({
    where: {
      id: params.partnerDataId,
      partnerOrgId: params.partnerOrgId,
    },
    select: {
      id: true,
      partnerId: true,
      partnerOrgId: true,
      fullName: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      panNumber: true,
      loanType: true,
      loanAmount: true,
      tenure: true,
      preferredBank: true,
      notes: true,
      localStatus: true,
    },
  });

  if (!partnerData) {
    throw new Error('Stored client not found');
  }

  const submitter = await prisma.user.findUnique({
    where: { id: params.submittedBy },
    select: { firstName: true, lastName: true, email: true },
  });

  const submitterName =
    [submitter?.firstName, submitter?.lastName].filter(Boolean).join(' ').trim() ||
    submitter?.email ||
    'Unknown';

  const encryptedFullName = await toRequiredEncryptedGpsValue(
    params.partnerOrgId,
    partnerData.fullName,
    'fullName'
  );
  const encryptedPhone = await toRequiredEncryptedGpsValue(
    params.partnerOrgId,
    partnerData.phone,
    'phone'
  );
  const encryptedEmail = await toEncryptedGpsValue(params.partnerOrgId, partnerData.email);
  const encryptedDob = await toEncryptedGpsValue(params.partnerOrgId, partnerData.dateOfBirth);
  const encryptedPan = await toEncryptedGpsValue(params.partnerOrgId, partnerData.panNumber);

  let leadId: string | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const nextLeadId = await getNextGpsifsLeadId(prisma);
    try {
      const created = await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.create({
          data: {
            id: nextLeadId,
            clientFullName: encryptedFullName,
            clientPhone: encryptedPhone,
            clientEmail: encryptedEmail,
            clientDateOfBirth: encryptedDob,
            clientPanNumber: encryptedPan,
            loanType: partnerData.loanType,
            loanAmount: partnerData.loanAmount,
            tenure: partnerData.tenure ?? null,
            preferredBank: partnerData.preferredBank,
            status: 'submitted',
            partnerId: params.partnerId,
            partnerOrgId: params.partnerOrgId,
            partnerName: submitterName,
            sourcePartnerDataId: partnerData.id,
            encryptionVersion: 1,
            internalNotes: partnerData.notes,
            timeline: {
              create: {
                status: 'submitted',
                timestamp: new Date(),
                updatedBy: submitterName,
                note: 'Lead submitted from stored client via consent handoff',
              },
            },
          } as unknown as Prisma.LeadUncheckedCreateInput,
        });

        const insertedGrants = await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`
            INSERT INTO consent_grants
              (lead_id, partner_data_id, partner_id, submitted_by, granted_to, expires_at, submission_context)
            VALUES
              (
                ${lead.id}::uuid,
                ${partnerData.id}::uuid,
                ${params.partnerOrgId}::uuid,
                ${params.submittedBy}::uuid,
                ${grantedTo},
                ${expiresAt},
                ${JSON.stringify({
                  source: 'stored_client_submit',
                  localStatus: partnerData.localStatus,
                })}::jsonb
              )
            RETURNING id
          `
        );
        const grantId = insertedGrants[0]?.id;

        await tx.submissionEvent.create({
          data: {
            leadId: lead.id,
            partnerOrgId: params.partnerOrgId,
            oldStatus: null,
            newStatus: 'submitted',
            changedBy: params.submittedBy,
            changeSource: 'consent_submit',
            note: `Submitted to GPS India (${grantedTo})`,
            metadata: {
              consentGrantId: grantId ?? null,
              partnerDataId: partnerData.id,
            },
          },
        });

        await tx.partnerData.update({
          where: { id: partnerData.id },
          data: { localStatus: 'processing' },
        });

        return { lead };
      });

      leadId = created.lead.id;
      break;
    } catch (error) {
      const isUniqueIdCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        attempt < 4;

      if (!isUniqueIdCollision) {
        throw error;
      }
    }
  }

  if (!leadId) {
    throw new Error('Failed to allocate a new lead ID');
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { documents: true, timeline: true, consentGrants: true },
  });

  await decryptResultWithBridge('Lead', lead);
  return lead;
};

export const verifyAccess = async ({ leadId, requestingParty }: VerifyAccessInput): Promise<boolean> => {
  const grants = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM consent_grants
      WHERE lead_id = ${leadId}::uuid
        AND granted_to = ${requestingParty}
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY granted_at DESC
      LIMIT 1
    `
  );

  return grants.length > 0;
};

export const revokeAccess = async ({ consentGrantId, revokedBy }: RevokeAccessInput) => {
  const rows = await prisma.$queryRaw<Array<{ id: string; lead_id: string; partner_id: string }>>(
    Prisma.sql`
      SELECT id, lead_id, partner_id
      FROM consent_grants
      WHERE id = ${consentGrantId}::uuid
      LIMIT 1
    `
  );
  const existing = rows[0];
  if (!existing) {
    throw new Error('Consent grant not found');
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`UPDATE consent_grants SET revoked_at = ${now} WHERE id = ${consentGrantId}::uuid`
    );

    await tx.submissionEvent.create({
      data: {
        leadId: existing.lead_id,
        partnerOrgId: existing.partner_id,
        oldStatus: null,
        newStatus: 'submitted',
        changedBy: revokedBy,
        changeSource: 'consent_revoke',
        note: `Consent revoked for grant ${consentGrantId}`,
        metadata: { consentGrantId },
      },
    });
  });
  return { id: consentGrantId };
};

export const canViewLeadPII = async (
  leadId: string,
  userRole: UserRole
): Promise<boolean> => {
  if (!['admin', 'manager', 'super_admin'].includes(userRole)) {
    return true;
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { sourcePartnerDataId: true },
  });

  if (!lead?.sourcePartnerDataId) {
    return true;
  }

  return verifyAccess({ leadId, requestingParty: GPS_INDIA_GRANTED_TO });
};
