import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createPartner = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if partner already exists
    const existingPartner = await User.findOne({ email: 'partner@loanapp.com' });
    if (existingPartner) {
      console.log('Partner user already exists!');
      console.log('Email: partner@loanapp.com');
      process.exit(0);
    }

    // Create partner user
    const partner = await User.create({
      email: 'partner@loanapp.com',
      password: 'Partner@123456',
      firstName: 'Demo',
      lastName: 'Partner',
      phone: '8888888888',
      role: 'partner',
      isActive: true,
      isEmailVerified: true,
    });

    console.log('✅ Partner user created successfully!');
    console.log('Email: partner@loanapp.com');
    console.log('Password: Partner@123456');
    console.log('\n⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating partner:', error);
    process.exit(1);
  }
};

createPartner();
