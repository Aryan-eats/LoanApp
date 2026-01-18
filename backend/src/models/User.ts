import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export type UserRole = 'admin' | 'partner';

// Partner types
export type PartnerType = 'freelancer' | 'used-car-dealer' | 'property-dealer' | 'builder' | 'sub-dsa';
export type OnboardingStatus = 'pending' | 'approved' | 'rejected';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLogin?: Date;
  // Password reset fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // OTP fields
  otp?: string;
  otpExpires?: Date;
  // Account lockout fields
  failedLoginAttempts: number;
  lockUntil?: Date;
  // Refresh token fields
  refreshToken?: string;
  refreshTokenExpires?: Date;
  // Password history (last 5 passwords)
  passwordHistory?: Array<{ hash: string; changedAt: Date }>;
  // Active sessions tracking
  activeSessions?: Array<{
    deviceFingerprint: string;
    lastActive: Date;
    userAgent: string;
    ip: string;
  }>;
  
  // Partner-specific fields (Step 1: Basic Identity)
  partnerType?: PartnerType;
  city?: string;
  state?: string;
  pincode?: string;
  aadhaarNumber?: string;
  
  // Partner-specific fields (Step 2: Business Details)
  businessName?: string;
  businessAddress?: string;
  yearsInOperation?: string;
  panNumber?: string;
  gstNumber?: string;
  hasExperience?: string;
  expectedLeads?: string;
  
  // Partner-specific fields (Step 3: Payout Info)
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  
  // Partner-specific fields (Step 4: Consent)
  consentDataShare?: boolean;
  consentCommission?: boolean;
  declarationNotEmployed?: boolean;
  consentPrivacyPolicy?: boolean;
  
  // Onboarding status
  onboardingStatus?: OnboardingStatus;
  onboardingCompletedAt?: Date;
  
  // KYC status
  kycStatus?: 'pending' | 'verified' | 'rejected';
  kycRejectionReason?: string;
  
  // Internal notes (admin only)
  internalNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  generatePasswordResetToken(): string;
  generateOTP(): string;
  generateRefreshToken(): string;
  isPasswordReused(newPassword: string): Promise<boolean>;
  addToPasswordHistory(hashedPassword: string): Promise<void>;
  addSession(session: { deviceFingerprint: string; userAgent: string; ip: string }): Promise<void>;
  removeSession(deviceFingerprint: string): Promise<void>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password in queries by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    role: {
      type: String,
      enum: ['admin', 'partner'],
      default: 'partner',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    // OTP fields
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    // Account lockout fields
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    // Refresh token fields
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenExpires: {
      type: Date,
      select: false,
    },
    // Password history (last 5 passwords)
    passwordHistory: {
      type: [
        {
          hash: { type: String, required: true },
          changedAt: { type: Date, default: Date.now },
        },
      ],
      select: false,
      default: [],
    },
    // Active sessions tracking
    activeSessions: {
      type: [
        {
          deviceFingerprint: { type: String, required: true },
          lastActive: { type: Date, default: Date.now },
          userAgent: { type: String },
          ip: { type: String },
        },
      ],
      select: false,
      default: [],
    },
    
    // Partner-specific fields (Step 1: Basic Identity)
    partnerType: {
      type: String,
      enum: ['freelancer', 'used-car-dealer', 'property-dealer', 'builder', 'sub-dsa'],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    
    // Partner-specific fields (Step 2: Business Details)
    businessName: {
      type: String,
      trim: true,
      maxlength: [200, 'Business name cannot exceed 200 characters'],
    },
    businessAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Business address cannot exceed 500 characters'],
    },
    yearsInOperation: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number'],
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    hasExperience: {
      type: String,
      trim: true,
    },
    expectedLeads: {
      type: String,
      trim: true,
    },
    
    // Partner-specific fields (Step 3: Payout Info)
    accountHolderName: {
      type: String,
      trim: true,
      maxlength: [100, 'Account holder name cannot exceed 100 characters'],
    },
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    accountNumber: {
      type: String,
      trim: true,
      select: false, // Sensitive data
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code'],
    },
    upiId: {
      type: String,
      trim: true,
    },
    
    // Partner-specific fields (Step 4: Consent)
    consentDataShare: {
      type: Boolean,
      default: false,
    },
    consentCommission: {
      type: Boolean,
      default: false,
    },
    declarationNotEmployed: {
      type: Boolean,
      default: false,
    },
    consentPrivacyPolicy: {
      type: Boolean,
      default: false,
    },
    
    // Onboarding status
    onboardingStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    onboardingCompletedAt: {
      type: Date,
    },
    
    // Additional partner fields
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters'],
    },
    pincode: {
      type: String,
      trim: true,
      match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode'],
    },
    aadhaarNumber: {
      type: String,
      trim: true,
    },
    
    // KYC status
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    kycRejectionReason: {
      type: String,
      trim: true,
    },
    
    // Internal notes (admin only)
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token and save to database
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Token expires in 10 minutes
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  
  return resetToken;
};

// Generate OTP for phone verification
userSchema.methods.generateOTP = function (): string {
  // Generate 6-digit OTP using cryptographically secure random
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // Hash the OTP and save to database
  this.otp = crypto.createHash('sha256').update(otp).digest('hex');
  
  // OTP expires in 5 minutes
  this.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  
  return otp;
};

// Check if account is locked
userSchema.methods.isLocked = function (): boolean {
  // Check if lockUntil is set and has not expired
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
  // If previous lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < new Date()) {
    await this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
    return;
  }

  const updates: Record<string, unknown> = { $inc: { failedLoginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) };
  }
  
  await this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  await this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function (): string {
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Hash the token and save to database
  this.refreshToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');
  
  // Refresh token expires in 7 days
  this.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  return refreshToken;
};

// Check if password was used before (last 5 passwords)
userSchema.methods.isPasswordReused = async function (
  newPassword: string
): Promise<boolean> {
  if (!this.passwordHistory || this.passwordHistory.length === 0) {
    return false;
  }

  for (const entry of this.passwordHistory) {
    const isMatch = await bcrypt.compare(newPassword, entry.hash);
    if (isMatch) {
      return true;
    }
  }
  return false;
};

// Add current password to history before changing
userSchema.methods.addToPasswordHistory = async function (
  hashedPassword: string
): Promise<void> {
  const history = this.passwordHistory || [];
  
  // Add current password to history
  history.push({ hash: hashedPassword, changedAt: new Date() });
  
  // Keep only last 5 passwords
  if (history.length > 5) {
    history.shift();
  }
  
  await this.updateOne({ $set: { passwordHistory: history } });
};

// Add or update session
userSchema.methods.addSession = async function (session: {
  deviceFingerprint: string;
  userAgent: string;
  ip: string;
}): Promise<void> {
  const sessions = this.activeSessions || [];
  
  // Find existing session by fingerprint
  const existingIndex = sessions.findIndex(
    (s: { deviceFingerprint: string }) => s.deviceFingerprint === session.deviceFingerprint
  );
  
  const newSession = {
    ...session,
    lastActive: new Date(),
  };
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = newSession;
  } else {
    sessions.push(newSession);
  }
  
  // Keep only last 10 sessions
  if (sessions.length > 10) {
    sessions.shift();
  }
  
  await this.updateOne({ $set: { activeSessions: sessions } });
};

// Remove session (for logout)
userSchema.methods.removeSession = async function (
  deviceFingerprint: string
): Promise<void> {
  await this.updateOne({
    $pull: { activeSessions: { deviceFingerprint } },
  });
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
