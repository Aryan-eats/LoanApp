# External API Integrations Required for Production

> GPS India Loan Portal - API Integration Guide
> Generated: January 2026

---

## Current Status Summary

| Feature | Current Implementation | Production Ready? | Priority |
|---------|----------------------|-------------------|----------|
| EMI Calculator | RapidAPI (configured) | Partial - needs API key | Low |
| OTP/SMS | Placeholder (logged to console) | **NO** | **P0** |
| Email (Password Reset) | Placeholder | **NO** | **P0** |
| Document Storage | Not implemented | **NO** | **P1** |
| KYC Verification | Manual status update | **NO** | **P1** |
| Credit Check | Mock data (hardcoded) | **NO** | **P2** |

---

## Phase 1: MVP Required (P0)

### 1. OTP/SMS Gateway

**Current State:** OTP is generated and logged to console in development

```typescript
// backend/src/controllers/authController.ts:849
// TODO: Integrate with SMS service (Twilio, etc.) or email service
console.log(`[DEV ONLY] OTP for ${phone || email}: ${otp}`);
```

**Required for:**
- Partner phone verification during onboarding
- Password reset via OTP
- Transaction notifications (future)

#### Integration Options

| Provider | Cost per SMS | India Coverage | Best For |
|----------|--------------|----------------|----------|
| **MSG91** | ~₹0.15-0.20 | Excellent (India-focused) | Indian market, DLT compliant |
| **Twilio** | ~₹0.60 | Good | Global reach, reliability |
| **Kaleyra** | ~₹0.20-0.25 | Excellent | Enterprise India |
| **AWS SNS** | ~₹0.50 | Good | AWS ecosystem |

#### Recommended: MSG91 (India-focused)

**Why MSG91?**
- Pre-registered with Indian DLT (Distributed Ledger Technology) - required by TRAI
- Cheapest for India
- Good API documentation
- Template-based OTP (required by regulations)

**Environment Variables:**
```env
# Add to backend/.env
MSG91_AUTH_KEY=your-auth-key
MSG91_TEMPLATE_ID=your-otp-template-id
MSG91_SENDER_ID=GPSIND
```

**Implementation Code:**
```typescript
// backend/src/services/smsService.ts
import axios from 'axios';

interface SendOTPResponse {
  success: boolean;
  message: string;
  request_id?: string;
}

export const sendOTP = async (phone: string, otp: string): Promise<SendOTPResponse> => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID || 'GPSIND';

  if (!authKey || !templateId) {
    throw new Error('SMS configuration missing');
  }

  try {
    const response = await axios.post(
      'https://control.msg91.com/api/v5/otp',
      {
        template_id: templateId,
        mobile: `91${phone}`, // Add country code
        authkey: authKey,
        otp: otp,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: response.data.type === 'success',
      message: response.data.message,
      request_id: response.data.request_id,
    };
  } catch (error) {
    console.error('SMS send error:', error);
    return {
      success: false,
      message: 'Failed to send OTP',
    };
  }
};
```

**Update authController.ts:**
```typescript
// Replace the console.log with actual SMS sending
import { sendOTP as sendSMS } from '../services/smsService.js';

// In sendOTP function (line ~846-852)
if (process.env.NODE_ENV === 'production') {
  const smsResult = await sendSMS(phone, otp);
  if (!smsResult.success) {
    throw new Error('Failed to send OTP via SMS');
  }
} else {
  console.log(`[DEV ONLY] OTP for ${phone || email}: ${otp}`);
}
```

#### Alternative: Twilio

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**Implementation Code:**
```typescript
// backend/src/services/twilioService.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendOTP = async (phone: string, otp: string): Promise<boolean> => {
  try {
    await client.messages.create({
      body: `Your GPS India Finance OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`,
    });
    return true;
  } catch (error) {
    console.error('Twilio error:', error);
    return false;
  }
};
```

**Package to install:**
```bash
cd backend && npm install twilio
```

---

### 2. Email Service

**Current State:** Password reset emails are not sent (only URL logged)

```typescript
// backend/src/controllers/authController.ts:698
console.log(`Password reset URL: ${resetUrl}`);
```

**Required for:**
- Password reset emails
- Welcome emails
- Lead status notifications
- Commission notifications

#### Integration Options

| Provider | Free Tier | Paid | Best For |
|----------|-----------|------|----------|
| **SendGrid** | 100/day | $14.95/mo for 40K | Best API, reliability |
| **AWS SES** | 62K/mo (EC2) | $0.10/1000 | AWS ecosystem |
| **Resend** | 3K/mo | $20/mo for 50K | Modern DX |
| **Mailgun** | 5K/mo (3 mo) | $35/mo for 50K | Transactional focus |

#### Recommended: SendGrid

**Environment Variables:**
```env
# Add to backend/.env
SENDGRID_API_KEY=SG.your-api-key
FROM_EMAIL=noreply@gpsindiafinance.com
FROM_NAME=GPS India Finance
```

**Implementation Code:**
```typescript
// backend/src/services/emailService.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    await sgMail.send({
      to: options.to,
      from: {
        email: process.env.FROM_EMAIL || 'noreply@gpsindiafinance.com',
        name: process.env.FROM_NAME || 'GPS India Finance',
      },
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });
    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetUrl: string,
  userName: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hello ${userName},</p>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #666; font-size: 14px;">
        This link expires in 10 minutes. If you didn't request this, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">
        GPS India Financial Services<br>
        This is an automated message, please do not reply.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset - GPS India Finance',
    text: `Reset your password using this link: ${resetUrl}. This link expires in 10 minutes.`,
    html,
  });
};

export const sendWelcomeEmail = async (
  email: string,
  userName: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to GPS India Finance!</h2>
      <p>Hello ${userName},</p>
      <p>Thank you for registering as a partner. Your account is now under review.</p>
      <p>Once approved, you'll be able to:</p>
      <ul>
        <li>Submit loan leads</li>
        <li>Track application status</li>
        <li>Earn commissions on disbursed loans</li>
      </ul>
      <p>We'll notify you once your KYC is verified.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px;">
        GPS India Financial Services
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to GPS India Finance Partner Program',
    text: `Welcome ${userName}! Your partner account is under review. We'll notify you once approved.`,
    html,
  });
};
```

**Package to install:**
```bash
cd backend && npm install @sendgrid/mail
npm install --save-dev @types/sendgrid
```

---

## Phase 2: Core Functionality (P1)

### 3. Document Storage (AWS S3)

**Required for:**
- KYC document uploads (PAN, Aadhaar, etc.)
- Income proof documents
- Bank statements
- Partner onboarding documents

**Environment Variables:**
```env
# Add to backend/.env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=gps-india-documents
```

**Implementation Code:**
```typescript
// backend/src/services/s3Service.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'gps-india-documents';

interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export const uploadDocument = async (
  file: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = 'documents'
): Promise<UploadResult> => {
  try {
    // Generate unique key
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const key = `${folder}/${uniqueId}-${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: mimeType,
        // Encrypt at rest
        ServerSideEncryption: 'AES256',
      })
    );

    return {
      success: true,
      key,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: 'Failed to upload document',
    };
  }
};

export const getSignedDownloadUrl = async (
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('S3 signed URL error:', error);
    return null;
  }
};

export const deleteDocument = async (key: string): Promise<boolean> => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    return false;
  }
};

// Generate presigned URL for direct upload from frontend
export const getPresignedUploadUrl = async (
  fileName: string,
  mimeType: string,
  folder: string = 'documents'
): Promise<{ uploadUrl: string; key: string } | null> => {
  try {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const key = `${folder}/${uniqueId}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min

    return { uploadUrl, key };
  } catch (error) {
    console.error('S3 presigned URL error:', error);
    return null;
  }
};
```

**Packages to install:**
```bash
cd backend && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

### 4. PAN Verification API

**Required for:**
- Partner KYC verification
- Customer identity verification

#### Recommended: Karza

**Environment Variables:**
```env
KARZA_API_KEY=your-api-key
KARZA_BASE_URL=https://api.karza.in
```

**Implementation Code:**
```typescript
// backend/src/services/kycService.ts
import axios from 'axios';

interface PANVerificationResult {
  success: boolean;
  verified: boolean;
  name?: string;
  nameMatch?: boolean;
  error?: string;
}

export const verifyPAN = async (
  panNumber: string,
  expectedName: string
): Promise<PANVerificationResult> => {
  try {
    const response = await axios.post(
      `${process.env.KARZA_BASE_URL}/v2/pan`,
      {
        pan: panNumber.toUpperCase(),
        consent: 'Y',
      },
      {
        headers: {
          'x-karza-key': process.env.KARZA_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status_code === 101) {
      const registeredName = response.data.result.name;
      // Fuzzy name matching (simple version)
      const nameMatch = registeredName
        .toLowerCase()
        .includes(expectedName.toLowerCase().split(' ')[0]);

      return {
        success: true,
        verified: true,
        name: registeredName,
        nameMatch,
      };
    }

    return {
      success: true,
      verified: false,
      error: 'PAN not found or invalid',
    };
  } catch (error) {
    console.error('PAN verification error:', error);
    return {
      success: false,
      verified: false,
      error: 'Verification service unavailable',
    };
  }
};

// Bank account verification via penny drop
export const verifyBankAccount = async (
  accountNumber: string,
  ifscCode: string,
  accountHolderName: string
): Promise<{ success: boolean; verified: boolean; registeredName?: string }> => {
  try {
    const response = await axios.post(
      `${process.env.KARZA_BASE_URL}/v2/bankacc`,
      {
        accountNumber,
        ifsc: ifscCode,
        consent: 'Y',
      },
      {
        headers: {
          'x-karza-key': process.env.KARZA_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status_code === 101) {
      return {
        success: true,
        verified: true,
        registeredName: response.data.result.accountName,
      };
    }

    return { success: true, verified: false };
  } catch (error) {
    console.error('Bank verification error:', error);
    return { success: false, verified: false };
  }
};
```

---

## Phase 3: Enhanced Features (P2)

### 5. Credit Score / Eligibility Check API

**Current State:** Uses mock data in `CreditCheckPage.tsx`

```typescript
// src/partner/pages/CreditCheckPage.tsx:139-140
await new Promise((resolve) => setTimeout(resolve, 2000));
setResult(mockEligibilityResult);  // Hardcoded fake data
```

#### Integration Options

| Provider | Type | Features | Pricing |
|----------|------|----------|---------|
| **Perfios** | Aggregator | Multi-bureau, bank statement analysis | Per inquiry |
| **Finbox** | Aggregator | Credit + income verification | Per inquiry |
| **CRIF High Mark** | Bureau (direct) | Credit score, report | Per inquiry |
| **Experian** | Bureau (direct) | Credit score, fraud check | Per inquiry |

#### Recommended: Perfios (for soft pull)

**Environment Variables:**
```env
PERFIOS_CLIENT_ID=your-client-id
PERFIOS_CLIENT_SECRET=your-client-secret
PERFIOS_BASE_URL=https://api.perfios.com
```

**Implementation Code:**
```typescript
// backend/src/services/creditService.ts
import axios from 'axios';

interface CreditCheckResult {
  success: boolean;
  eligible: boolean;
  score?: number;
  maxLoanAmount?: number;
  factors?: Array<{
    factor: string;
    status: 'positive' | 'neutral' | 'negative';
    description: string;
  }>;
  error?: string;
}

export const checkCreditEligibility = async (
  phone: string,
  panNumber: string,
  monthlyIncome: number,
  loanAmount: number,
  loanType: string
): Promise<CreditCheckResult> => {
  try {
    // Step 1: Get access token
    const tokenResponse = await axios.post(
      `${process.env.PERFIOS_BASE_URL}/oauth/token`,
      {
        client_id: process.env.PERFIOS_CLIENT_ID,
        client_secret: process.env.PERFIOS_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Initiate soft credit check
    const creditResponse = await axios.post(
      `${process.env.PERFIOS_BASE_URL}/v1/credit-check/soft`,
      {
        pan: panNumber,
        mobile: phone,
        consent: true,
        loan_type: loanType,
        loan_amount: loanAmount,
        monthly_income: monthlyIncome,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = creditResponse.data;

    return {
      success: true,
      eligible: data.eligible,
      score: data.credit_score,
      maxLoanAmount: data.max_eligible_amount,
      factors: data.factors,
    };
  } catch (error) {
    console.error('Credit check error:', error);
    return {
      success: false,
      eligible: false,
      error: 'Credit check service unavailable',
    };
  }
};
```

**Note:** Credit bureau integrations typically require:
- Enterprise agreement/contract
- Compliance certifications
- Minimum volume commitments

---

### 6. Aadhaar eKYC (DigiLocker)

**Required for:**
- Full KYC verification
- Address verification
- Photo verification

**Note:** Aadhaar verification requires:
- ASA (Authentication Service Agency) license OR
- Integration via licensed provider (Karza, Signzy, etc.)
- User consent flow (OTP-based)

```typescript
// backend/src/services/aadhaarService.ts
// This is a simplified example - actual implementation requires licensed provider

export const initiateAadhaarVerification = async (
  aadhaarNumber: string,
  userId: string
): Promise<{ success: boolean; requestId: string }> => {
  // 1. Generate consent request
  // 2. Send OTP to Aadhaar-linked mobile
  // 3. Return request ID for OTP verification

  // Implementation depends on your KYC provider (Karza, Signzy, etc.)
  throw new Error('Implement with licensed KYC provider');
};

export const verifyAadhaarOTP = async (
  requestId: string,
  otp: string
): Promise<{
  success: boolean;
  name?: string;
  address?: string;
  photo?: string; // Base64 encoded
}> => {
  // Verify OTP and fetch eKYC data
  throw new Error('Implement with licensed KYC provider');
};
```

---

## Optional: Build In-House

### EMI Calculator (Recommended to Build Locally)

Instead of relying on external API, build a simple local calculator:

```typescript
// src/utils/emiCalculator.ts

interface EMIResult {
  emi: number;
  totalInterest: number;
  totalPayment: number;
  amortizationSchedule?: Array<{
    month: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

export const calculateEMI = (
  principal: number,
  annualRate: number,
  tenureYears: number,
  includeSchedule: boolean = false
): EMIResult => {
  const monthlyRate = annualRate / 12 / 100;
  const tenureMonths = tenureYears * 12;

  // EMI = P × r × (1+r)^n / ((1+r)^n - 1)
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principal;

  const result: EMIResult = {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
  };

  if (includeSchedule) {
    result.amortizationSchedule = [];
    let balance = principal;

    for (let month = 1; month <= tenureMonths; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;

      result.amortizationSchedule.push({
        month,
        principal: Math.round(principalPayment),
        interest: Math.round(interestPayment),
        balance: Math.max(0, Math.round(balance)),
      });
    }
  }

  return result;
};
```

**Benefits:**
- No API costs
- No external dependency
- Instant calculation
- No rate limiting

---

## Estimated Monthly Costs

| Service | Volume | Monthly Cost (INR) |
|---------|--------|-------------------|
| SMS (MSG91) | 5,000 OTPs | ₹750-1,000 |
| Email (SendGrid) | 10,000 emails | ₹1,200 |
| AWS S3 | 50 GB storage | ₹150 |
| PAN Verification (Karza) | 500 checks | ₹2,000-4,000 |
| Bank Verification | 200 checks | ₹1,000-2,000 |
| Credit Score (soft) | 200 checks | ₹8,000-16,000 |
| **Total** | | **₹13,000-25,000/month** |

---

## Implementation Checklist

### Phase 1 (Week 1-2)
- [ ] Create MSG91 account and get DLT registration
- [ ] Implement SMS service for OTP
- [ ] Create SendGrid account
- [ ] Implement email service for password reset
- [ ] Test OTP flow end-to-end
- [ ] Test password reset flow end-to-end

### Phase 2 (Week 3-4)
- [ ] Set up AWS S3 bucket with proper IAM policies
- [ ] Implement document upload/download service
- [ ] Add document upload to partner onboarding
- [ ] Create Karza account
- [ ] Implement PAN verification
- [ ] Add PAN verification to KYC flow

### Phase 3 (Week 5-6)
- [ ] Evaluate credit score providers
- [ ] Sign enterprise agreement
- [ ] Implement credit check API
- [ ] Replace mock data in CreditCheckPage
- [ ] Implement bank account verification

### Optional
- [ ] Replace RapidAPI EMI with local calculation
- [ ] Add Aadhaar eKYC (if required)

---

## Environment Variables Summary

Add these to `backend/.env`:

```env
# ============================================
# EXTERNAL API CONFIGURATION
# ============================================

# SMS Service (MSG91 - Recommended for India)
MSG91_AUTH_KEY=your-auth-key
MSG91_TEMPLATE_ID=your-template-id
MSG91_SENDER_ID=GPSIND

# OR Twilio (Global)
# TWILIO_ACCOUNT_SID=your-account-sid
# TWILIO_AUTH_TOKEN=your-auth-token
# TWILIO_PHONE_NUMBER=+1234567890

# Email Service (SendGrid)
SENDGRID_API_KEY=SG.your-api-key
FROM_EMAIL=noreply@gpsindiafinance.com
FROM_NAME=GPS India Finance

# Document Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=gps-india-documents

# KYC Verification (Karza)
KARZA_API_KEY=your-api-key
KARZA_BASE_URL=https://api.karza.in

# Credit Check (Perfios) - Optional
# PERFIOS_CLIENT_ID=your-client-id
# PERFIOS_CLIENT_SECRET=your-client-secret
# PERFIOS_BASE_URL=https://api.perfios.com
```

---

## Security Notes

1. **Never commit API keys** - Use environment variables
2. **Encrypt PII at rest** - S3 server-side encryption enabled
3. **Use presigned URLs** - Don't expose S3 bucket publicly
4. **Log API calls** - Audit trail for compliance
5. **Rate limit external calls** - Prevent cost overruns
6. **Handle failures gracefully** - Fallback strategies for API outages
