import crypto from 'crypto';
import express from 'express';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../shared/db/prisma.js', () => ({
  default: {
    lead: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../services/bankMatchingService.js', () => ({
  matchLeadOffers: vi.fn(),
}));

const LEAD_TOKEN_SECRET = 'test-lead-token-secret';
const SYSTEM_PARTNER_ID = '11111111-1111-4111-8111-111111111111';
const LEAD_ID = '22222222-2222-4222-8222-222222222222';
type JsonObject = Record<string, any>;

process.env.LEAD_TOKEN_SECRET = LEAD_TOKEN_SECRET;
process.env.SYSTEM_PARTNER_ID = SYSTEM_PARTNER_ID;

const prisma = (await import('../shared/db/prisma.js')).default as unknown as {
  lead: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const { matchLeadOffers } = await import('../services/bankMatchingService.js') as {
  matchLeadOffers: ReturnType<typeof vi.fn>;
};
const leadsRoutes = (await import('../routes/leadsRoutes.js')).default;

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/leads', leadsRoutes);
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ success: false, message: err.message });
  });
  return app;
};

const requestJson = async (
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address() as AddressInfo;

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json() as JsonObject;
    return { response, json };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
};

const leadTokenFor = (leadId: string) =>
  crypto.createHmac('sha256', LEAD_TOKEN_SECRET).update(leadId).digest('hex');

describe('public lead routes', () => {
  beforeEach(() => {
    process.env.LEAD_TOKEN_SECRET = LEAD_TOKEN_SECRET;
    process.env.SYSTEM_PARTNER_ID = SYSTEM_PARTNER_ID;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.LEAD_TOKEN_SECRET = LEAD_TOKEN_SECRET;
    process.env.SYSTEM_PARTNER_ID = SYSTEM_PARTNER_ID;
  });

  it('submits a valid public lead and returns a signed lead token', async () => {
    const createdLead = {
      id: LEAD_ID,
      clientFullName: 'Asha Kumar',
      clientPhone: '9876543210',
      clientEmail: 'asha@example.com',
      loanType: 'Personal Loans',
      loanAmount: 500000,
      createdAt: new Date(),
    };
    prisma.lead.create.mockResolvedValue(createdLead);

    const { response, json } = await requestJson('POST', '/api/leads', {
      fullName: 'Asha Kumar',
      phone: '9876543210',
      email: 'asha@example.com',
      city: 'Mumbai',
      loanType: 'Personal Loans',
      loanAmount: '5,00,000',
      employmentType: 'salaried',
    });

    expect(response.status).toBe(201);
    expect(json).toMatchObject({
      success: true,
      message: 'Lead submitted successfully',
      data: {
        lead: {
          ...createdLead,
          createdAt: createdLead.createdAt.toISOString(),
        },
      },
    });
    expect(json.data.leadToken).toBe(leadTokenFor(LEAD_ID));
    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientFullName: 'Asha Kumar',
        clientPhone: '9876543210',
        clientEmail: 'asha@example.com',
        clientCity: 'Mumbai',
        clientEmployment: 'salaried',
        loanType: 'Personal Loans',
        loanAmount: 500000,
        status: 'submitted',
        partnerId: SYSTEM_PARTNER_ID,
        partnerName: 'Website Direct',
        encryptionVersion: 1,
      }),
    });
  });

  it('rejects invalid public lead payloads before writing to the database', async () => {
    const { response, json } = await requestJson('POST', '/api/leads', {
      fullName: 'A',
      phone: '123',
      loanType: '',
      loanAmount: '-10',
    });

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Validation failed');
    expect(prisma.lead.create).not.toHaveBeenCalled();
  });

  it('matches offers for valid loan criteria', async () => {
    const matchResult = {
      resolvedLoanTypes: ['personal_loan'],
      offers: [
        {
          id: 'bank-1',
          name: 'Test Bank',
          code: 'TEST',
          interestRateMin: 10,
          interestRateMax: 12,
        },
      ],
    };
    matchLeadOffers.mockResolvedValue(matchResult);

    const { response, json } = await requestJson('POST', '/api/leads/match-offers', {
      loanType: 'Personal Loans',
      loanAmount: 500000,
    });

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, data: matchResult });
    expect(matchLeadOffers).toHaveBeenCalledWith({
      loanType: 'Personal Loans',
      loanSubType: undefined,
      loanAmount: 500000,
    });
  });

  it('rejects offer matching requests without a loan type or subtype', async () => {
    const { response, json } = await requestJson('POST', '/api/leads/match-offers', {
      loanAmount: 500000,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({
      success: false,
      message: 'loanType or loanSubType is required',
    });
    expect(matchLeadOffers).not.toHaveBeenCalled();
  });

  it('rejects preferred bank updates without a valid lead token', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: LEAD_ID,
      createdAt: new Date(),
    });

    const { response, json } = await requestJson('PATCH', `/api/leads/${LEAD_ID}/preferred-bank`, {
      preferredBank: 'Test Bank',
    });

    expect(response.status).toBe(403);
    expect(json).toEqual({
      success: false,
      message: 'Invalid or missing lead token',
    });
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('updates preferred bank with a valid signed lead token inside the one-hour window', async () => {
    const updatedLead = {
      id: LEAD_ID,
      preferredBank: 'Test Bank',
      createdAt: new Date(),
    };
    prisma.lead.findUnique.mockResolvedValue({
      id: LEAD_ID,
      createdAt: new Date(),
    });
    prisma.lead.update.mockResolvedValue(updatedLead);

    const { response, json } = await requestJson(
      'PATCH',
      `/api/leads/${LEAD_ID}/preferred-bank`,
      { preferredBank: 'Test Bank' },
      { 'x-lead-token': leadTokenFor(LEAD_ID) },
    );

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      message: 'Preferred bank updated successfully',
      data: {
        lead: {
          ...updatedLead,
          createdAt: updatedLead.createdAt.toISOString(),
        },
      },
    });
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: LEAD_ID },
      data: { preferredBank: 'Test Bank' },
    });
  });

  it('rejects preferred bank updates after the one-hour window', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: LEAD_ID,
      createdAt: new Date(Date.now() - 61 * 60 * 1000),
    });

    const { response, json } = await requestJson(
      'PATCH',
      `/api/leads/${LEAD_ID}/preferred-bank`,
      { preferredBank: 'Test Bank' },
      { 'x-lead-token': leadTokenFor(LEAD_ID) },
    );

    expect(response.status).toBe(403);
    expect(json).toEqual({
      success: false,
      message: 'Preferred bank can only be set within 1 hour of lead submission. Please contact support.',
    });
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
});
