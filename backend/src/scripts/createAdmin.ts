import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@loanapp.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@loanapp.com');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      email: 'admin@loanapp.com',
      password: 'Admin@123456',
      firstName: 'Admin',
      lastName: 'User',
      phone: '9999999999',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@loanapp.com');
    console.log('Password: Admin@123456');
    console.log('\n⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
