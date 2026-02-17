import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { hashPassword } from '../services/userService.js';

dotenv.config();

const createPartner = async () => {
  try {
    const existingPartner = await prisma.user.findUnique({
      where: { email: 'partner@loanapp.com' },
    });
    if (existingPartner) {
      console.log('Partner user already exists!');
      console.log('Email: partner@loanapp.com');
      process.exit(0);
    }

    await prisma.user.create({
      data: {
        email: 'partner@loanapp.com',
        password: await hashPassword('Partner@123456'),
        firstName: 'Demo',
        lastName: 'Partner',
        phone: '8888888888',
        role: 'partner',
        isActive: true,
        isEmailVerified: true,
      },
    });

    console.log('Partner user created successfully.');
    console.log('Email: partner@loanapp.com');
    console.log('Password: Partner@123456');
    console.log('\nPlease change the password after first login.');

    process.exit(0);
  } catch (error) {
    console.error('Error creating partner:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

createPartner();
