import dotenv from 'dotenv';
import prisma from '../src/shared/db/prisma.js';
import { hashPassword } from '../src/services/userService.js';

dotenv.config();

const createPartner = async () => {
  try {
    const partnerEmail = process.env.PARTNER_EMAIL || 'partner@loanapp.com';
    const partnerPassword = process.env.PARTNER_PASSWORD;

    if (!partnerPassword) {
      throw new Error('PARTNER_PASSWORD is required');
    }

    const existingPartner = await prisma.user.findUnique({
      where: { email: partnerEmail },
    });
    if (existingPartner) {
      console.log('Partner user already exists!');
      console.log(`Email: ${partnerEmail}`);
      return;
    }

    await prisma.user.create({
      data: {
        email: partnerEmail,
        password: await hashPassword(partnerPassword),
        firstName: 'Demo',
        lastName: 'Partner',
        phone: '8888888888',
        role: 'partner',
        isActive: true,
        isEmailVerified: true,
      },
    });

    console.log('Partner user created successfully.');
    console.log(`Email: ${partnerEmail}`);
    console.log('Password configured from PARTNER_PASSWORD.');
  } catch (error) {
    console.error('Error creating partner:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

createPartner();
