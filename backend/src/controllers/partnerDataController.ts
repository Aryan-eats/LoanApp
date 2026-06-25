import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../shared/db/prisma.js';
import { grantAccess } from '../services/consent.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { formatLeadResponse } from '../utils/leadHelpers.js';
import {
  computeLeadScore,
  deriveCustomerIdentity,
  matchesCustomerIdentity,
  scoreBandForLeadScore,
  summarizeConsentGrants,
  type ConsentGrantLike,
} from '../utils/crmHelpers.js';

type StoredClientWithRelations = Prisma.PartnerDataGetPayload<{
  include: { documents: true; consentGrants: true };
}>;

type LeadWithRelations = Prisma.LeadGetPayload<{
  include: { documents: true; timeline: true; consentGrants: true };
}>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatEntry(e: {
  id: string;
  partnerId: string;
  localStatus: string;
  notes: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  panNumber: string | null;
  employmentType: string | null;
  monthlyIncome: unknown;
  companyName: string | null;
  designation: string | null;
  workExperience: string | null;
  city: string | null;
  pincode: string | null;
  state: string | null;
  currentAddress: string | null;
  residenceType: string | null;
  loanCategory: string | null;
  loanType: string;
  loanAmount: unknown;
  tenure: number | null;
  loanPurpose: string | null;
  preferredBank: string | null;
  consentGrants?: ConsentGrantLike[] | null;
  documents?: Array<{
    id: string;
    type: string;
    displayName: string;
    description: string | null;
    mandatory: boolean;
    acceptedFormats: string[];
    maxSizeMB: number;
    sortOrder: number;
    fileName: string;
    fileSize: string | null;
    fileUrl: string | null;
    mimeType: string | null;
    uploadedBy: string | null;
    uploadedAt: Date;
    status: string;
    rejectionReason: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}) {
  const customerIdentity = deriveCustomerIdentity({
    id: e.id,
    partnerId: e.partnerId,
    phone: e.phone,
    email: e.email,
    panNumber: e.panNumber,
  });
  const consentSummary = summarizeConsentGrants(e.consentGrants ?? null);
  const leadScore = computeLeadScore({
    id: e.id,
    partnerId: e.partnerId,
    phone: e.phone,
    email: e.email,
    panNumber: e.panNumber,
    employmentType: e.employmentType,
    monthlyIncome: e.monthlyIncome,
    companyName: e.companyName,
    city: e.city,
    pincode: e.pincode,
    documentsCount: e.documents?.length ?? 0,
    consentGrants: e.consentGrants ?? null,
  });

  return {
    id: e.id,
    partnerId: e.partnerId,
    customerId: customerIdentity.customerId,
    customerKey: customerIdentity.customerKey,
    leadSource: 'manual',
    leadScore,
    scoreBand: scoreBandForLeadScore(leadScore),
    consentSummary,
    localStatus: e.localStatus,
    notes: e.notes ?? undefined,
    fullName: e.fullName,
    customerName: e.fullName,
    phone: e.phone,
    customerPhone: e.phone,
    email: e.email ?? undefined,
    customerEmail: e.email ?? undefined,
    dateOfBirth: e.dateOfBirth ?? undefined,
    gender: e.gender ?? undefined,
    panNumber: e.panNumber ?? undefined,
    employmentType: e.employmentType ?? undefined,
    monthlyIncome: e.monthlyIncome ? Number(e.monthlyIncome) : undefined,
    companyName: e.companyName ?? undefined,
    designation: e.designation ?? undefined,
    workExperience: e.workExperience ?? undefined,
    city: e.city ?? undefined,
    pincode: e.pincode ?? undefined,
    state: e.state ?? undefined,
    currentAddress: e.currentAddress ?? undefined,
    residenceType: e.residenceType ?? undefined,
    loanCategory: e.loanCategory ?? undefined,
    loanType: e.loanType,
    loanAmount: Number(e.loanAmount),
    tenure: e.tenure ?? undefined,
    loanPurpose: e.loanPurpose ?? undefined,
    preferredBank: e.preferredBank ?? undefined,
    documents: (e.documents || []).map((doc) => ({
      id: doc.id,
      type: doc.type,
      displayName: doc.displayName,
      description: doc.description ?? undefined,
      mandatory: doc.mandatory,
      acceptedFormats: doc.acceptedFormats,
      maxSizeMB: doc.maxSizeMB,
      sortOrder: doc.sortOrder,
      fileName: doc.fileName || undefined,
      fileSize: doc.fileSize ?? undefined,
      fileUrl: doc.fileUrl ?? undefined,
      mimeType: doc.mimeType ?? undefined,
      uploadedBy: doc.uploadedBy ?? undefined,
      uploadedAt: doc.uploadedAt?.toISOString(),
      status: doc.status,
      rejectionReason: doc.rejectionReason ?? undefined,
    })),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function isMissingPartnerDataDocumentsTableError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2021' &&
    typeof error.meta?.table === 'string' &&
    error.meta.table.includes('partner_data_documents')
  );
}

const storedClientInclude = {
  documents: {
    orderBy: [{ sortOrder: 'asc' as const }, { displayName: 'asc' as const }],
  },
  consentGrants: true,
};

const leadInclude = {
  documents: true,
  timeline: true,
  consentGrants: true,
} as const;

const toStoredClientIdentity = (entry: StoredClientWithRelations) => ({
  id: entry.id,
  partnerId: entry.partnerId,
  phone: entry.phone,
  email: entry.email,
  panNumber: entry.panNumber,
  fullName: entry.fullName,
});

const toLeadIdentity = (lead: LeadWithRelations) => ({
  id: lead.id,
  partnerId: lead.partnerId,
  sourcePartnerDataId: lead.sourcePartnerDataId,
  phone: lead.clientPhone,
  email: lead.clientEmail,
  panNumber: lead.clientPanNumber,
  fullName: lead.clientFullName,
});

type CustomerActivityItem = {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  customerId: string;
  customerKey: string;
  leadId?: string;
  metadata?: Record<string, unknown>;
};

const buildCustomerActivity = (
  storedClient: StoredClientWithRelations | null,
  leads: LeadWithRelations[],
  customerId: string,
  customerKey: string
): CustomerActivityItem[] => {
  const items: CustomerActivityItem[] = [];

  if (storedClient) {
    items.push({
      id: `stored-client-created:${storedClient.id}`,
      type: 'stored_client_created',
      title: 'Stored client created',
      description: storedClient.notes ? storedClient.notes : storedClient.fullName,
      timestamp: storedClient.createdAt.toISOString(),
      customerId,
      customerKey,
    });

    if (storedClient.updatedAt.getTime() !== storedClient.createdAt.getTime()) {
      items.push({
        id: `stored-client-updated:${storedClient.id}`,
        type: 'stored_client_updated',
        title: 'Stored client updated',
        timestamp: storedClient.updatedAt.toISOString(),
        customerId,
        customerKey,
      });
    }

    for (const grant of storedClient.consentGrants ?? []) {
      const grantTimestamp = grant.revokedAt ?? grant.grantedAt ?? storedClient.createdAt;
      items.push({
        id: `stored-client-consent:${grant.id}`,
        type: grant.revokedAt ? 'consent_revoked' : 'consent_granted',
        title: grant.revokedAt ? 'Consent revoked' : 'Consent granted',
        description: grant.grantedTo,
        timestamp: (grantTimestamp instanceof Date ? grantTimestamp : new Date(grantTimestamp)).toISOString(),
        customerId,
        customerKey,
        metadata: {
          partnerDataId: storedClient.id,
          grantedTo: grant.grantedTo,
        },
      });
    }
  }

  for (const lead of leads) {
    items.push({
      id: `lead-created:${lead.id}`,
      type: 'lead_created',
      title: 'Lead submitted',
      description: `${lead.loanType} - ${Number(lead.loanAmount)}`,
      timestamp: lead.createdAt.toISOString(),
      customerId,
      customerKey,
      leadId: lead.id,
      metadata: {
        leadSource: lead.sourcePartnerDataId ? 'stored_client' : 'manual',
      },
    });

    for (const event of lead.timeline ?? []) {
      items.push({
        id: `lead-timeline:${event.id}`,
        type: 'lead_timeline',
        title: `Lead status: ${event.status}`,
        description: event.note ?? undefined,
        timestamp: event.timestamp.toISOString(),
        customerId,
        customerKey,
        leadId: lead.id,
        metadata: {
          status: event.status,
          updatedBy: event.updatedBy,
        },
      });
    }

    for (const grant of lead.consentGrants ?? []) {
      const grantTimestamp = grant.revokedAt ?? grant.grantedAt ?? lead.createdAt;
      items.push({
        id: `lead-consent:${grant.id}`,
        type: grant.revokedAt ? 'consent_revoked' : 'consent_granted',
        title: grant.revokedAt ? 'Consent revoked' : 'Consent granted',
        description: grant.grantedTo,
        timestamp: (grantTimestamp instanceof Date ? grantTimestamp : new Date(grantTimestamp)).toISOString(),
        customerId,
        customerKey,
        leadId: lead.id,
        metadata: {
          partnerDataId: grant.partnerDataId ?? undefined,
          grantedTo: grant.grantedTo,
        },
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

const resolveCustomerContext = async (partnerOrgId: string, requestedId: string) => {
  const [storedClients, leads] = await Promise.all([
    prisma.partnerData.findMany({
      where: { partnerOrgId },
      orderBy: { createdAt: 'desc' },
      include: storedClientInclude,
    }) as Promise<StoredClientWithRelations[]>,
    prisma.lead.findMany({
      where: { partnerOrgId },
      orderBy: { createdAt: 'desc' },
      include: leadInclude,
    }) as Promise<LeadWithRelations[]>,
  ]);

  const requestedStoredClient = storedClients.find((entry) => entry.id === requestedId) ?? null;
  const requestedLead = leads.find((entry) => entry.id === requestedId) ?? null;

  let storedClient = requestedStoredClient;
  if (!storedClient && requestedLead?.sourcePartnerDataId) {
    storedClient =
      storedClients.find((entry) => entry.id === requestedLead.sourcePartnerDataId) ?? null;
  }
  if (!storedClient && requestedLead) {
    storedClient =
      storedClients.find((entry) =>
        matchesCustomerIdentity(toStoredClientIdentity(entry), toLeadIdentity(requestedLead))
      ) ?? null;
  }

  const referenceLead = requestedLead ?? null;
  const referenceStoredClient = storedClient;

  if (!referenceStoredClient && !referenceLead) {
    return null;
  }

  const relatedLeads = leads.filter((lead) => {
    if (referenceStoredClient) {
      return (
        lead.sourcePartnerDataId === referenceStoredClient.id ||
        matchesCustomerIdentity(toLeadIdentity(lead), toStoredClientIdentity(referenceStoredClient))
      );
    }

    if (referenceLead) {
      return (
        lead.id === referenceLead.id ||
        (referenceLead.sourcePartnerDataId && lead.sourcePartnerDataId === referenceLead.sourcePartnerDataId) ||
        matchesCustomerIdentity(toLeadIdentity(lead), toLeadIdentity(referenceLead))
      );
    }

    return false;
  });

  const primaryLead = referenceLead ?? relatedLeads[0] ?? null;
  const customerIdentity = deriveCustomerIdentity({
    id: referenceStoredClient?.id ?? primaryLead?.id ?? requestedId,
    partnerId: partnerOrgId,
    sourcePartnerDataId: referenceStoredClient?.id ?? primaryLead?.sourcePartnerDataId ?? null,
    phone: referenceStoredClient?.phone ?? primaryLead?.clientPhone ?? null,
    email: referenceStoredClient?.email ?? primaryLead?.clientEmail ?? null,
    panNumber: referenceStoredClient?.panNumber ?? primaryLead?.clientPanNumber ?? null,
  });
  const leadScore = referenceStoredClient
    ? computeLeadScore({
        id: referenceStoredClient.id,
        partnerId: referenceStoredClient.partnerId,
        phone: referenceStoredClient.phone,
        email: referenceStoredClient.email,
        panNumber: referenceStoredClient.panNumber,
        employmentType: referenceStoredClient.employmentType,
        monthlyIncome: referenceStoredClient.monthlyIncome,
        companyName: referenceStoredClient.companyName,
        city: referenceStoredClient.city,
        pincode: referenceStoredClient.pincode,
        documentsCount: referenceStoredClient.documents?.length ?? 0,
        consentGrants: referenceStoredClient.consentGrants ?? null,
      })
    : computeLeadScore({
        id: primaryLead?.id ?? requestedId,
        partnerId: partnerOrgId,
        sourcePartnerDataId: primaryLead?.sourcePartnerDataId ?? null,
        phone: primaryLead?.clientPhone ?? null,
        email: primaryLead?.clientEmail ?? null,
        panNumber: primaryLead?.clientPanNumber ?? null,
        employmentType: primaryLead?.clientEmployment ?? null,
        monthlyIncome: primaryLead?.clientIncome ?? null,
        companyName: primaryLead?.clientCompany ?? null,
        city: primaryLead?.clientCity ?? null,
        pincode: primaryLead?.clientPincode ?? null,
        documentsCount: primaryLead?.documents?.length ?? 0,
        consentGrants: primaryLead?.consentGrants ?? null,
      });
  const consentSummary = summarizeConsentGrants([
    ...(referenceStoredClient?.consentGrants ?? []),
    ...relatedLeads.flatMap((lead) => lead.consentGrants ?? []),
  ]);

  return {
    storedClient: referenceStoredClient,
    leads: relatedLeads,
    primaryLead,
    customerId: customerIdentity.customerId,
    customerKey: customerIdentity.customerKey,
    leadSource: relatedLeads.some((lead) => lead.sourcePartnerDataId) ? 'stored_client' : 'manual',
    leadScore,
    scoreBand: scoreBandForLeadScore(leadScore),
    consentSummary,
    activity: buildCustomerActivity(referenceStoredClient, relatedLeads, customerIdentity.customerId, customerIdentity.customerKey),
  };
};

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * GET /api/partner/stored-clients
 * Returns all PartnerData rows that belong to the authenticated partner.
 */
export const getStoredClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }

    let entries: Array<Parameters<typeof formatEntry>[0]> = [];

    try {
      entries = await prisma.partnerData.findMany({
        where: { partnerOrgId },
        orderBy: { createdAt: 'desc' },
        include: storedClientInclude,
      });
    } catch (error) {
      if (!isMissingPartnerDataDocumentsTableError(error)) {
        throw error;
      }

      console.warn('getStoredClients fallback: partner_data_documents table is missing, returning stored clients without documents');
      entries = await prisma.partnerData.findMany({
        where: { partnerOrgId },
        orderBy: { createdAt: 'desc' },
        include: { consentGrants: true },
      });
    }

    res.json({ success: true, data: entries.map(formatEntry) });
  } catch (err) {
    console.error('getStoredClients error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stored clients' });
  }
};

/**
 * POST /api/partner/stored-clients
 * Creates a new PartnerData entry for the authenticated partner.
 */
export const createStoredClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.user!.id;
    const partnerOrgId = req.partnerOrgId;

    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }

    const {
      fullName, phone, email, dateOfBirth, gender, panNumber,
      employmentType, monthlyIncome, companyName, designation,
      workExperience, city, pincode, state, currentAddress, residenceType,
      loanCategory, loanType, loanAmount, tenure, loanPurpose,
      localStatus, notes, preferredBank,
    } = req.body;

    if (!fullName || !phone || !loanType || !loanAmount) {
      res.status(400).json({ success: false, message: 'fullName, phone, loanType and loanAmount are required' });
      return;
    }

    const parsedAmount = Number(loanAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ success: false, message: 'loanAmount must be a positive number' });
      return;
    }

    const entry = await prisma.partnerData.create({
      data: {
        partnerId,
        partnerOrgId,
        fullName,
        phone,
        email: email || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        panNumber: panNumber || null,
        employmentType: employmentType || null,
        monthlyIncome: monthlyIncome != null ? Number(monthlyIncome) : null,
        companyName: companyName || null,
        designation: designation || null,
        workExperience: workExperience || null,
        city: city || null,
        pincode: pincode || null,
        state: state || null,
        currentAddress: currentAddress || null,
        residenceType: residenceType || null,
        loanCategory: loanCategory || null,
        loanType,
        loanAmount: parsedAmount,
        tenure: tenure ? Number(tenure) : null,
        loanPurpose: loanPurpose || null,
        preferredBank: preferredBank || null,
        localStatus: localStatus || 'new',
        notes: notes || null,
        encryptionVersion: 1,
      },
    });

    res.status(201).json({ success: true, data: formatEntry(entry) });
  } catch (err) {
    console.error('createStoredClient error:', err);
    res.status(500).json({ success: false, message: 'Failed to create stored client' });
  }
};

/**
 * PATCH /api/partner/stored-clients/:id/status
 * Updates localStatus for a PartnerData entry.
 */
export const updateStoredClientStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }
    const id = req.params.id as string;
    const { localStatus } = req.body;

    if (!localStatus) {
      res.status(400).json({ success: false, message: 'localStatus is required' });
      return;
    }

    const entry = await prisma.partnerData.updateMany({
      where: { id, partnerOrgId },
      data: { localStatus, updatedAt: new Date() },
    });

    if (entry.count === 0) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('updateStoredClientStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

/**
 * PATCH /api/partner/stored-clients/:id/notes
 * Updates notes for a PartnerData entry.
 */
export const updateStoredClientNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }
    const id = req.params.id as string;
    const { notes } = req.body;

    const entry = await prisma.partnerData.updateMany({
      where: { id, partnerOrgId },
      data: { notes: notes ?? null, updatedAt: new Date() },
    });

    if (entry.count === 0) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('updateStoredClientNotes error:', err);
    res.status(500).json({ success: false, message: 'Failed to update notes' });
  }
};

/**
 * PATCH /api/partner/stored-clients/:id/preferred-bank
 * Updates preferredBank for a PartnerData entry.
 */
export const updateStoredClientPreferredBank = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }
    const id = req.params.id as string;
    const { preferredBank } = req.body;

    const entry = await prisma.partnerData.updateMany({
      where: { id, partnerOrgId },
      data: { preferredBank: preferredBank ?? null, updatedAt: new Date() },
    });

    if (entry.count === 0) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('updateStoredClientPreferredBank error:', err);
    res.status(500).json({ success: false, message: 'Failed to update preferred bank' });
  }
};

/**
 * PATCH /api/partner/stored-clients/:id/assigned-bank
 * Assigns a bank for a PartnerData entry.
 * Stored in preferredBank column for backward compatibility.
 */
export const updateStoredClientAssignedBank = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }
    const id = req.params.id as string;
    const assignedBank = (req.body.assignedBank ?? req.body.preferredBank ?? null) as string | null;

    const entry = await prisma.partnerData.updateMany({
      where: { id, partnerOrgId },
      data: { preferredBank: assignedBank, updatedAt: new Date() },
    });

    if (entry.count === 0) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('updateStoredClientAssignedBank error:', err);
    res.status(500).json({ success: false, message: 'Failed to assign bank' });
  }
};

/**
 * PUT /api/partner/stored-clients/:id/documents
 * Saves the checklist for a stored client by replacing existing document slots.
 */
export const saveStoredClientDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }
    const id = req.params.id as string;
    const { documents } = req.body as {
      documents?: Array<{
        type: string;
        displayName: string;
        description?: string;
        mandatory?: boolean;
        acceptedFormats?: string[];
        maxSizeMB?: number;
        sortOrder?: number;
      }>;
    };

    if (!Array.isArray(documents) || documents.length === 0) {
      res.status(400).json({ success: false, message: 'documents array is required' });
      return;
    }

    const entry = await prisma.partnerData.findFirst({
      where: { id, partnerOrgId },
      select: { id: true },
    });

    if (!entry) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.partnerDataDocument.deleteMany({ where: { partnerDataId: id } });
      await tx.partnerDataDocument.createMany({
        data: documents.map((doc, index) => ({
          partnerDataId: id,
          type: doc.type,
          displayName: doc.displayName,
          description: doc.description || null,
          mandatory: doc.mandatory ?? true,
          acceptedFormats: doc.acceptedFormats && doc.acceptedFormats.length > 0 ? doc.acceptedFormats : ['pdf', 'jpg', 'png'],
          maxSizeMB: doc.maxSizeMB ?? 10,
          sortOrder: doc.sortOrder ?? index,
        })),
      });
    });

    const updated = await prisma.partnerData.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
        },
        consentGrants: true,
      },
    });

    res.json({ success: true, data: updated ? formatEntry(updated) : undefined });
  } catch (err) {
    if (isMissingPartnerDataDocumentsTableError(err)) {
      res.status(503).json({
        success: false,
        message: 'Stored client documents are unavailable until the partner_data_documents table is created',
      });
      return;
    }

    console.error('saveStoredClientDocuments error:', err);
    res.status(500).json({ success: false, message: 'Failed to save stored client documents' });
  }
};

/**
 * POST /api/partner/stored-clients/:id/submit
 * Submits a stored client to GPS India via consent-driven handoff.
 */
export const submitStoredClientToGPS = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.user!.id;
    const partnerOrgId = req.partnerOrgId;
    const storedClientId = req.params.id as string;

    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }

    const {
      grantedTo,
      expiresAt,
    } = req.body as {
      grantedTo?: string;
      expiresAt?: string;
    };

    const submittedLead = await grantAccess({
      partnerDataId: storedClientId,
      partnerId,
      partnerOrgId,
      submittedBy: req.user!.id,
      grantedTo,
      expiresAt: expiresAt ?? null,
    });

    if (!submittedLead) {
      res.status(500).json({ success: false, message: 'Failed to submit stored client' });
      return;
    }

    await logAuditEvent('LEAD_SUBMITTED_TO_GPS', req, {
      userId: req.user!.id,
      entityId: submittedLead.id,
      entityType: 'lead',
      metadata: {
        partnerDataId: storedClientId,
        partnerOrgId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Stored client submitted successfully',
      data: {
        leadId: submittedLead.id,
      },
    });
  } catch (err) {
    console.error('submitStoredClientToGPS error:', err);
    if (err instanceof Error && err.message === 'Stored client not found') {
      res.status(404).json({ success: false, message: err.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to submit stored client' });
  }
};

/**
 * GET /api/partner/customers/:id
 * Returns a merged customer view combining one stored client and all related submitted leads.
 */
export const getPartnerCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }
    const requestedId = req.params.id as string;
    const context = await resolveCustomerContext(partnerOrgId, requestedId);

    if (!context) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        customer: {
          customerId: context.customerId,
          customerKey: context.customerKey,
          fullName: context.storedClient?.fullName ?? context.primaryLead?.clientFullName ?? '',
          phone: context.storedClient?.phone ?? context.primaryLead?.clientPhone ?? '',
          email: context.storedClient?.email ?? context.primaryLead?.clientEmail ?? '',
          leadSource: context.leadSource,
          leadScore: context.leadScore,
          scoreBand: context.scoreBand,
          consentSummary: context.consentSummary,
          activity: context.activity,
        },
        storedClient: context.storedClient ? formatEntry(context.storedClient) : null,
        relatedLeads: context.leads.map((lead) => formatLeadResponse(lead)),
        activity: context.activity,
      },
    });
  } catch (err) {
    console.error('getPartnerCustomerById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customer detail' });
  }
};

/**
 * GET /api/partner/customers/:id/activity
 * Returns the activity feed for a merged customer view.
 */
export const getPartnerCustomerActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }
    const requestedId = req.params.id as string;
    const context = await resolveCustomerContext(partnerOrgId, requestedId);

    if (!context) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        customerId: context.customerId,
        customerKey: context.customerKey,
        activity: context.activity,
      },
    });
  } catch (err) {
    console.error('getPartnerCustomerActivity error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customer activity' });
  }
};

/**
 * DELETE /api/partner/stored-clients/:id
 * Deletes a PartnerData entry.
 */
export const deleteStoredClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerOrgId = req.partnerOrgId;
    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }
    const id = req.params.id as string;

    const entry = await prisma.partnerData.deleteMany({
      where: { id, partnerOrgId },
    });

    if (entry.count === 0) {
      res.status(404).json({ success: false, message: 'Client not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('deleteStoredClient error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete client' });
  }
};

/**
 * POST /api/partner/stored-clients/bulk
 * Creates multiple PartnerData entries in one request (used for localStorage migration).
 */
export const bulkCreateStoredClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.user!.id;
    const partnerOrgId = req.partnerOrgId;

    if (!partnerOrgId) {
      res.status(403).json({ success: false, message: 'Partner organisation not resolved' });
      return;
    }

    const { clients } = req.body as {
      clients: Array<{
        fullName: string; phone: string; email?: string; dateOfBirth?: string;
        gender?: string; panNumber?: string; employmentType?: string;
        monthlyIncome?: number; companyName?: string; designation?: string;
        workExperience?: string; city?: string; pincode?: string; state?: string;
        currentAddress?: string; residenceType?: string; loanCategory?: string;
        loanType: string; loanAmount: number; tenure?: number; loanPurpose?: string;
        preferredBank?: string; localStatus?: string; notes?: string; createdAt?: string;
      }>;
    };

    if (!Array.isArray(clients) || clients.length === 0) {
      res.status(400).json({ success: false, message: 'clients array is required' });
      return;
    }

    const now = new Date();
    const created = await prisma.$transaction(
      clients.map((c) =>
        prisma.partnerData.create({
          data: {
            partnerId,
            partnerOrgId,
            fullName: c.fullName,
            phone: c.phone,
            email: c.email || null,
            dateOfBirth: c.dateOfBirth || null,
            gender: c.gender || null,
            panNumber: c.panNumber || null,
            employmentType: c.employmentType || null,
            monthlyIncome: c.monthlyIncome != null ? Number(c.monthlyIncome) : null,
            companyName: c.companyName || null,
            designation: c.designation || null,
            workExperience: c.workExperience || null,
            city: c.city || null,
            pincode: c.pincode || null,
            state: c.state || null,
            currentAddress: c.currentAddress || null,
            residenceType: c.residenceType || null,
            loanCategory: c.loanCategory || null,
            loanType: c.loanType,
            loanAmount: Number(c.loanAmount),
            tenure: c.tenure ? Number(c.tenure) : null,
            loanPurpose: c.loanPurpose || null,
            preferredBank: c.preferredBank || null,
            localStatus: (c.localStatus as 'new' | 'contacted' | 'docs_pending' | 'docs_collected' | 'processing' | 'approved' | 'rejected' | 'closed') || 'new',
            notes: c.notes || null,
            createdAt: c.createdAt ? new Date(c.createdAt) : now,
            encryptionVersion: 1,
          },
        })
      )
    );

    res.status(201).json({ success: true, data: created.map(formatEntry) });
  } catch (err) {
    console.error('bulkCreateStoredClients error:', err);
    res.status(500).json({ success: false, message: 'Bulk create failed' });
  }
};


