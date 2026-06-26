import { Request, Response } from 'express';
import { basePrisma } from '../../shared/db/prisma.js';
import { cacheWrap, cacheInvalidatePattern } from '../../shared/utils/cache.js';

// -- Lender Document Requirements --------------------------------------------

export const listPublicDocRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanCode } = req.query;
    const lco = typeof loanCode === 'string' ? loanCode : '';
    const where: Record<string, unknown> = {};
    if (lco) where.loanCode = lco;

    const rows = await cacheWrap(
      `docs:reqdoc:public:${lco}`,
      () => basePrisma.lenderDocRequirement.findMany({
        where,
        orderBy: [{ lenderCode: 'asc' }, { loanCode: 'asc' }, { sortOrder: 'asc' }],
      }),
      600,
    );

    const byLender: Record<string, {
      lenderCode: string; lenderName: string;
      loanCodes: string[];
      docs: typeof rows;
    }> = {};

    for (const row of rows) {
      if (!byLender[row.lenderCode]) {
        byLender[row.lenderCode] = {
          lenderCode: row.lenderCode,
          lenderName: row.lenderName,
          loanCodes: [],
          docs: [],
        };
      }
      byLender[row.lenderCode].docs.push(row);
      if (!byLender[row.lenderCode].loanCodes.includes(row.loanCode)) {
        byLender[row.lenderCode].loanCodes.push(row.loanCode);
      }
    }

    res.status(200).json({ success: true, data: Object.values(byLender) });
  } catch (error) {
    console.error('Get req-docs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const listFlatDocRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanCode, lenderCode } = req.query;
    if (!loanCode || typeof loanCode !== 'string') {
      res.status(400).json({ success: false, message: 'loanCode query parameter is required' });
      return;
    }

    const lc = typeof lenderCode === 'string' ? lenderCode : '';
    const where: Record<string, string> = { loanCode };
    if (lc) where.lenderCode = lc;

    const rows = await cacheWrap(
      `docs:reqdoc:flat:${lc || 'all'}:${loanCode}`,
      () => basePrisma.lenderDocRequirement.findMany({
        where,
        orderBy: [{ mandatory: 'desc' }, { sortOrder: 'asc' }],
      }),
      600,
    );

    const seen = new Set<string>();
    const flat = rows
      .filter((row) => {
        if (seen.has(row.docId)) return false;
        seen.add(row.docId);
        return true;
      })
      .map((row) => ({
        id: row.docId,
        name: row.docName,
        description: row.description,
        mandatory: row.mandatory,
        acceptedFormats: row.acceptedFormats,
        maxSizeMB: row.maxSizeMB,
      }));

    res.status(200).json({ success: true, count: flat.length, data: flat });
  } catch (error) {
    console.error('Get req-docs/flat error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const listDocRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lenderCode, loanCode } = req.query;
    const lc = typeof lenderCode === 'string' ? lenderCode : '';
    const lco = typeof loanCode === 'string' ? loanCode : '';
    const where: Record<string, unknown> = {};
    if (lc) where.lenderCode = lc;
    if (lco) where.loanCode = lco;

    const docs = await cacheWrap(
      `docs:reqdoc:${lc}:${lco}`,
      () => basePrisma.lenderDocRequirement.findMany({
        where,
        orderBy: [{ lenderCode: 'asc' }, { loanCode: 'asc' }, { sortOrder: 'asc' }],
      }),
      600 // 10-minute TTL — reference data rarely changes
    );

    res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    console.error('Get doc requirements error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createDocRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      lenderCode, lenderName, loanCode, docId, docName,
      description, mandatory, acceptedFormats, maxSizeMB,
    } = req.body as {
      lenderCode: string; lenderName: string; loanCode: string;
      docId?: string; docName: string; description?: string;
      mandatory?: boolean; acceptedFormats?: string[]; maxSizeMB?: number;
    };

    if (!lenderCode || !lenderName || !loanCode || !docName) {
      res.status(400).json({ success: false, message: 'lenderCode, lenderName, loanCode and docName are required' });
      return;
    }

    const doc = await basePrisma.lenderDocRequirement.create({
      data: {
        lenderCode,
        lenderName,
        loanCode,
        docId:           docId ?? `custom_${Date.now()}`,
        docName,
        description:     description ?? null,
        mandatory:       mandatory ?? true,
        acceptedFormats: acceptedFormats ?? ['pdf', 'jpg', 'png'],
        maxSizeMB:       maxSizeMB ?? 5,
        createdBy:       req.user?.id ?? null,
      },
    });

    await cacheInvalidatePattern('docs:reqdoc:*');

    res.status(201).json({ success: true, data: doc });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ success: false, message: 'This document already exists for the selected lender and loan type' });
      return;
    }
    console.error('Create doc requirement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateDocRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { docName, description, mandatory, acceptedFormats, maxSizeMB } = req.body as {
      docName?: string; description?: string; mandatory?: boolean;
      acceptedFormats?: string[]; maxSizeMB?: number;
    };

    const updateData: Record<string, unknown> = {};
    if (docName         !== undefined) updateData.docName         = docName;
    if (description     !== undefined) updateData.description     = description;
    if (mandatory       !== undefined) updateData.mandatory       = mandatory;
    if (acceptedFormats !== undefined) updateData.acceptedFormats = acceptedFormats;
    if (maxSizeMB       !== undefined) updateData.maxSizeMB       = maxSizeMB;

    let doc;
    try {
      doc = await basePrisma.lenderDocRequirement.update({ where: { id }, data: updateData });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Document requirement not found' });
        return;
      }
      throw err;
    }

    await cacheInvalidatePattern('docs:reqdoc:*');
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error('Update doc requirement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteDocRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    try {
      await basePrisma.lenderDocRequirement.delete({ where: { id } });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2025') {
        res.status(404).json({ success: false, message: 'Document requirement not found' });
        return;
      }
      throw err;
    }

    await cacheInvalidatePattern('docs:reqdoc:*');
    res.status(200).json({ success: true, message: 'Document requirement removed' });
  } catch (error) {
    console.error('Delete doc requirement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

