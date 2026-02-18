import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

const uniqueEmail = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const hashEmail = (email: string): string =>
  crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

if (!process.env.FIELD_ENCRYPTION_KEY) {
  process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString('base64');
}

describe('PostgreSQL DB operations', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates and reads a user', async () => {
    const email = uniqueEmail('db-test-user');
    const created = await prisma.user.create({
      data: {
        email,
        password: 'hashed-password',
        firstName: 'DB',
        lastName: 'Tester',
        role: 'partner',
      },
    });

    const found = await prisma.user.findUnique({ where: { email } });
    expect(found?.id).toBe(created.id);
    expect(found?.firstName).toBe('DB');
  });

  it('enforces unique email constraint', async () => {
    const email = uniqueEmail('db-unique');
    await prisma.user.create({
      data: {
        email,
        password: 'hashed-password',
        firstName: 'DB',
        lastName: 'Tester',
        role: 'partner',
      },
    });

    let errorCode: string | undefined;
    try {
      await prisma.user.create({
        data: {
          email,
          password: 'another-hash',
          firstName: 'Duplicate',
          lastName: 'User',
          role: 'partner',
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        errorCode = err.code;
      }
    }

    expect(errorCode).toBe('P2002');
  });

  it('creates related records (lead, docs, timeline)', async () => {
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail('db-related'),
        password: 'hashed-password',
        firstName: 'Lead',
        lastName: 'Owner',
        role: 'partner',
      },
    });

    const lead = await prisma.lead.create({
      data: {
        clientFullName: 'Customer One',
        clientPhone: '9999999999',
        clientEmail: 'customer@example.com',
        loanType: 'home-loan',
        loanAmount: '500000',
        partnerId: user.id,
        partnerName: 'Partner Name',
        status: 'submitted',
      },
    });

    const doc = await prisma.leadDocument.create({
      data: {
        leadId: lead.id,
        type: 'aadhaar',
        fileName: 'aadhaar.pdf',
        status: 'uploaded',
      },
    });

    const timeline = await prisma.leadTimeline.create({
      data: {
        leadId: lead.id,
        status: 'submitted',
        updatedBy: user.id,
        note: 'Initial submit',
      },
    });

    expect(doc.leadId).toBe(lead.id);
    expect(timeline.leadId).toBe(lead.id);
  });

  it('creates active sessions with unique device fingerprint', async () => {
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail('db-session'),
        password: 'hashed-password',
        firstName: 'Session',
        lastName: 'Owner',
        role: 'partner',
      },
    });

    await prisma.activeSession.create({
      data: {
        userId: user.id,
        deviceFingerprint: 'device-123',
        ip: '127.0.0.1',
      },
    });

    let errorCode: string | undefined;
    try {
      await prisma.activeSession.create({
        data: {
          userId: user.id,
          deviceFingerprint: 'device-123',
          ip: '127.0.0.1',
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        errorCode = err.code;
      }
    }

    expect(errorCode).toBe('P2002');
  });

  it('writes audit logs and queries by event', async () => {
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail('db-audit'),
        password: 'hashed-password',
        firstName: 'Audit',
        lastName: 'Owner',
        role: 'partner',
      },
    });

    await prisma.auditLog.create({
      data: {
        event: 'LOGIN_SUCCESS',
        userId: user.id,
        hashedEmail: hashEmail(user.email),
        ip: '127.0.0.1',
        success: true,
      },
    });

    const logs = await prisma.auditLog.findMany({
      where: { event: 'LOGIN_SUCCESS' },
    });

    expect(logs.length).toBe(1);
    expect(logs[0]?.userId).toBe(user.id);
  });

  it('encrypts sensitive fields for users and leads', async () => {
    const aadhaar = '123412341234';
    const pan = 'ABCDE1234F';
    const gst = '22ABCDE1234F1Z5';
    const ifsc = 'HDFC0001234';
    const upi = 'partner@upi';

    const user = await prisma.user.create({
      data: {
        email: uniqueEmail('pii-user'),
        password: 'hashed-password',
        firstName: 'PII',
        lastName: 'User',
        role: 'partner',
        aadhaarNumber: aadhaar,
        panNumber: pan,
        gstNumber: gst,
        accountNumber: '1234567890',
        ifscCode: ifsc,
        upiId: upi,
      },
    });

    const fetched = await prisma.user.findUnique({ where: { id: user.id } });
    expect(fetched?.aadhaarNumber).toBe(aadhaar);
    expect(fetched?.panNumber).toBe(pan);
    expect(fetched?.gstNumber).toBe(gst);
    expect(fetched?.ifscCode).toBe(ifsc);
    expect(fetched?.upiId).toBe(upi);

    const storedUsers = await prisma.$queryRaw<
      {
        aadhaarNumber: string | null;
        panNumber: string | null;
        gstNumber: string | null;
        accountNumber: string | null;
        ifscCode: string | null;
        upiId: string | null;
      }[]
    >`SELECT aadhaar_number as "aadhaarNumber",
             pan_number as "panNumber",
             gst_number as "gstNumber",
             account_number as "accountNumber",
             ifsc_code as "ifscCode",
             upi_id as "upiId"
      FROM users WHERE id = ${user.id}`;

    expect(storedUsers[0]?.aadhaarNumber).not.toBe(aadhaar);
    expect(storedUsers[0]?.panNumber).not.toBe(pan);
    expect(storedUsers[0]?.gstNumber).not.toBe(gst);
    expect(storedUsers[0]?.ifscCode).not.toBe(ifsc);
    expect(storedUsers[0]?.upiId).not.toBe(upi);
    expect(storedUsers[0]?.aadhaarNumber?.startsWith('enc:v1:')).toBe(true);

    const lead = await prisma.lead.create({
      data: {
        clientFullName: 'Customer Two',
        clientPhone: '8888888888',
        clientEmail: 'customer2@example.com',
        clientDateOfBirth: '1990-01-01',
        clientPanNumber: pan,
        clientAadhaar: aadhaar,
        loanType: 'home-loan',
        loanAmount: '400000',
        partnerId: user.id,
        partnerName: 'Partner Name',
        status: 'submitted',
      },
    });

    const fetchedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(fetchedLead?.clientDateOfBirth).toBe('1990-01-01');
    expect(fetchedLead?.clientPanNumber).toBe(pan);
    expect(fetchedLead?.clientAadhaar).toBe(aadhaar);

    const storedLeads = await prisma.$queryRaw<
      { clientDateOfBirth: string | null; clientPanNumber: string | null; clientAadhaar: string | null }[]
    >`SELECT client_date_of_birth as "clientDateOfBirth", client_pan_number as "clientPanNumber", client_aadhaar as "clientAadhaar"
      FROM leads WHERE id = ${lead.id}`;

    expect(storedLeads[0]?.clientDateOfBirth).not.toBe('1990-01-01');
    expect(storedLeads[0]?.clientPanNumber).not.toBe(pan);
    expect(storedLeads[0]?.clientAadhaar).not.toBe(aadhaar);
    expect(storedLeads[0]?.clientPanNumber?.startsWith('enc:v1:')).toBe(true);
  });
});
