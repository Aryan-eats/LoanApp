import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { hashPassword } from '../services/userService.js';

dotenv.config();

const createAdmin = async () => {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@loanapp.com' },
    });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      console.log('Email: admin@loanapp.com');
      return;
    }

    const admin = await prisma.user.create({
      data: {
        email: 'admin@loanapp.com',
        password: await hashPassword('Admin@123456'),
        firstName: 'Admin',
        lastName: 'User',
        phone: '9999999999',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
      },
    });

    console.log('Admin user created successfully.');
    console.log('Email: admin@loanapp.com');
    console.log(
      'Password has been set. Please reset it via the admin UI or a reset-password flow.'
    );
    process.exitCode = 0;
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

createAdmin();
