import mongoose, { Document, Schema } from 'mongoose';

export type AuditEventType = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_CHANGE'
  | 'OTP_SENT'
  | 'OTP_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_REFRESH'
  | 'SUSPICIOUS_ACTIVITY';

export interface IAuditLog extends Document {
  event: AuditEventType;
  userId?: mongoose.Types.ObjectId;
  email?: string;
  ip?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  failureReason?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    event: {
      type: String,
      required: true,
      enum: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'REGISTER',
        'PASSWORD_RESET_REQUEST',
        'PASSWORD_RESET_SUCCESS',
        'PASSWORD_CHANGE',
        'OTP_SENT',
        'OTP_VERIFIED',
        'ACCOUNT_LOCKED',
        'TOKEN_REFRESH',
        'SUSPICIOUS_ACTIVITY',
      ],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    email: {
      type: String,
      lowercase: true,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    deviceFingerprint: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    success: {
      type: Boolean,
      default: true,
    },
    failureReason: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ event: 1, createdAt: -1 });
auditLogSchema.index({ ip: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Auto-delete logs older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
