import dotenv from 'dotenv';
import prisma from '../config/prisma.js';
import { hashPassword } from '../services/userService.js';

dotenv.config();

const createAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@loanapp.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD is required');
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingAdmin) {
      console.log('Admin user already exists.');
      console.log(`Email: ${adminEmail}`);
      return;
    }

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: await hashPassword(adminPassword),
        firstName: 'Admin',
        lastName: 'User',
        phone: '9999999999',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
      },
    });

    console.log('Admin user created successfully.');
    console.log(`Email: ${admin.email}`);
    console.log('Password configured from ADMIN_PASSWORD.');
    process.exitCode = 0;
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

createAdmin();
