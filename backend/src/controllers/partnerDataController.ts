import { Request, Response } from 'express';
import { basePrisma as prisma } from '../config/prisma.js';

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
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: e.id,
    partnerId: e.partnerId,
    localStatus: e.localStatus,
    notes: e.notes ?? undefined,
    fullName: e.fullName,
    phone: e.phone,
    email: e.email ?? undefined,
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
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * GET /api/partner/stored-clients
 * Returns all PartnerData rows that belong to the authenticated partner.
 */
export const getStoredClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.user!.id;

    const entries = await prisma.partnerData.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });

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

    const {
      fullName, phone, email, dateOfBirth, gender, panNumber,
      employmentType, monthlyIncome, companyName, designation,
      workExperience, city, pincode, state, currentAddress, residenceType,
      loanCategory, loanType, loanAmount, tenure, loanPurpose,
      localStatus, notes,
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
        localStatus: localStatus || 'new',
        notes: notes || null,
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
    const partnerId = req.user!.id;
    const id = req.params.id as string;
    const { localStatus } = req.body;

    if (!localStatus) {
      res.status(400).json({ success: false, message: 'localStatus is required' });
      return;
    }

    const entry = await prisma.partnerData.updateMany({
      where: { id, partnerId },
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
    const partnerId = req.user!.id;
    const id = req.params.id as string;
    const { notes } = req.body;

    const entry = await prisma.partnerData.updateMany({
      where: { id, partnerId },
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
 * DELETE /api/partner/stored-clients/:id
 * Deletes a PartnerData entry.
 */
export const deleteStoredClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const partnerId = req.user!.id;
    const id = req.params.id as string;

    const entry = await prisma.partnerData.deleteMany({
      where: { id, partnerId },
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
    const { clients } = req.body as {
      clients: Array<{
        fullName: string; phone: string; email?: string; dateOfBirth?: string;
        gender?: string; panNumber?: string; employmentType?: string;
        monthlyIncome?: number; companyName?: string; designation?: string;
        workExperience?: string; city?: string; pincode?: string; state?: string;
        currentAddress?: string; residenceType?: string; loanCategory?: string;
        loanType: string; loanAmount: number; tenure?: number; loanPurpose?: string;
        localStatus?: string; notes?: string; createdAt?: string;
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
            localStatus: (c.localStatus as 'new' | 'contacted' | 'docs_pending' | 'docs_collected' | 'processing' | 'approved' | 'rejected' | 'closed') || 'new',
            notes: c.notes || null,
            createdAt: c.createdAt ? new Date(c.createdAt) : now,
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
