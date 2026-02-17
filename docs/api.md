# Loan App API Documentation

> **Base URL:** `https://your-domain.com/api`
> **Content-Type:** `application/json`
> **Authentication:** Bearer JWT + httpOnly refresh cookie

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Guide](#authentication-guide)
3. [Submitting a Loan Lead (Website)](#submitting-a-loan-lead-website)
4. [Partner Workflow](#partner-workflow)
5. [Admin Workflow](#admin-workflow)
6. [API Reference](#api-reference)
   - [Auth Endpoints](#auth-endpoints)
   - [Profile Endpoints](#profile-endpoints)
   - [Leads Endpoints (Public)](#leads-endpoints-public)
   - [Partner Endpoints](#partner-endpoints)
   - [Admin Endpoints](#admin-endpoints)
   - [Partners Management (Admin)](#partners-management-admin)
   - [Document Endpoints](#document-endpoints)
   - [Health Check](#health-check)
7. [Rate Limits](#rate-limits)
8. [Error Handling](#error-handling)
9. [Data Models & Enums](#data-models--enums)

---

## Quick Start

### 1. Register & log in (under 2 minutes)

```bash
# 1. Register a user
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Secure@123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. Log in — returns an access token + sets a refresh cookie
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john@example.com",
    "password": "Secure@123"
  }'

# 3. Use the access token for authenticated requests
curl https://your-domain.com/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### 2. Typical JavaScript integration

```js
const API = "https://your-domain.com/api";

// Login
const { data } = await fetch(`${API}/auth/login`, {
  method: "POST",
  credentials: "include",               // sends/receives httpOnly cookies
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "john@example.com", password: "Secure@123" }),
}).then(r => r.json());

const accessToken = data.accessToken;    // store in memory, NOT localStorage

// Authenticated request
const me = await fetch(`${API}/auth/me`, {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then(r => r.json());

console.log(me.data.user);
```

> **Gotcha:** The access token expires in **15 minutes** by default. Use the [refresh flow](#refresh-token) to get a new one silently — the refresh token lives in an httpOnly cookie with a 7-day TTL.

---

## Authentication Guide

### How auth works in this API

| Concept | Detail |
|---|---|
| **Access token** | Short-lived JWT (default 15m). Sent as `Authorization: Bearer <token>`. Stored **in memory only** — never in `localStorage`. |
| **Refresh token** | Long-lived JWT (default 7d). Set by the server as an `httpOnly`, `Secure`, `SameSite=Strict` cookie named `refreshToken` scoped to `/api/auth`. |
| **Token rotation** | Every refresh call issues a **new** refresh token and invalidates the old one. |
| **Blacklisting** | On logout the current access token is blacklisted (Redis-backed or in-memory fallback). |

### Getting credentials

1. **Register** via `POST /api/auth/register` (users) or `POST /api/auth/register-partner` (partners).
2. **Login** via `POST /api/auth/login` — returns `accessToken` in the response body and sets the `refreshToken` cookie automatically.
3. Use `accessToken` in the `Authorization` header for all protected endpoints.

### Token refresh

When you receive a `401` with `"code": "TOKEN_EXPIRED"`, call the refresh endpoint:

```js
// The httpOnly cookie is sent automatically with credentials: "include"
const res = await fetch(`${API}/auth/refresh-token`, {
  method: "POST",
  credentials: "include",
});
const { data } = await res.json();
// data.accessToken — new access token
// data.expiresIn  — TTL in seconds
```

> **Why not just use the access token from localStorage?**
> Storing tokens in `localStorage` exposes them to XSS. This API uses an in-memory access token + httpOnly cookie pattern for defense-in-depth.

### Logout

```js
await fetch(`${API}/auth/logout`, {
  method: "POST",
  credentials: "include",
  headers: { Authorization: `Bearer ${accessToken}` },
});
// Server blacklists the access token AND clears the refresh cookie
```

---

## Submitting a Loan Lead (Website)

This is the **unauthenticated** endpoint for website visitors to apply for a loan.

```js
const res = await fetch(`${API}/leads`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fullName: "Priya Sharma",
    phone: "9876543210",
    email: "priya@example.com",
    city: "Mumbai",
    loanType: "home_loan",
    loanAmount: 5000000,
    employmentType: "salaried"
  }),
});
```

**Response (201):**

```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "data": {
    "lead": {
      "id": "a1b2c3d4-...",
      "clientFullName": "Priya Sharma",
      "clientPhone": "9876543210",
      "loanType": "home_loan",
      "loanAmount": 5000000,
      "status": "submitted",
      "partnerName": "Website Direct"
    }
  }
}
```

**Gotchas:**
- Requires `SYSTEM_PARTNER_ID` env variable on the server. If not set, returns `500`.
- After submission, the user has **1 hour** to set a preferred bank via `PATCH /api/leads/:id/preferred-bank`.
- Email defaults to `not-provided@website.lead` if omitted.

---

## Partner Workflow

Partners are loan agents/brokers who submit leads on behalf of clients. Here's the full lifecycle:

### 1. Register as partner

```js
const res = await fetch(`${API}/auth/register-partner`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fullName: "Rahul Verma",
    mobileNumber: "9876543210",
    email: "rahul@business.com",
    password: "Secure@123",
    partnerType: "freelancer",
    city: "Delhi",
    // Business details
    businessName: "Verma Finance",
    businessAddress: "123 Main St, Delhi",
    yearsInOperation: "3-5",
    panNumber: "ABCDE1234F",
    // Payout info
    accountHolderName: "Rahul Verma",
    bankName: "HDFC Bank",
    accountNumber: "123456789012",
    ifscCode: "HDFC0001234",
    // All consent fields are required
    consentDataShare: true,
    consentCommission: true,
    declarationNotEmployed: true,
    consentPrivacyPolicy: true
  }),
});
```

> **Important:** Partner accounts start as **inactive** (`isActive: false`) with `onboardingStatus: "pending"`. An admin must approve the partner before they can log in.

### 2. Login (after admin approval)

```js
const { data } = await fetch(`${API}/auth/login`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "rahul@business.com",
    password: "Secure@123"
  }),
}).then(r => r.json());
// data.accessToken — use for subsequent requests
```

If the account is still pending:

```json
{
  "success": false,
  "message": "Your partner account is pending approval."
}
```

### 3. Submit a lead

```js
const res = await fetch(`${API}/partner/leads`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    fullName: "Amit Kumar",
    phone: "9123456789",
    email: "amit@example.com",
    loanType: "personal_loan",
    loanAmount: 500000,
    employmentType: "salaried",
    monthlyIncome: 75000,
    companyName: "TCS",
    city: "Bangalore"
  }),
});
```

### 4. View leads & stats

```js
// Get paginated leads with filters
const leads = await fetch(
  `${API}/partner/leads?page=1&limit=10&status=submitted&sortBy=createdAt&sortOrder=desc`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
).then(r => r.json());

// Get dashboard statistics
const stats = await fetch(`${API}/partner/leads/stats`, {
  headers: { Authorization: `Bearer ${accessToken}` }
}).then(r => r.json());
```

### 5. Update lead status

Partners can only set status to: `submitted`, `docs_pending`, or `docs_uploaded`.

```js
await fetch(`${API}/partner/leads/${leadId}/status`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    status: "docs_uploaded",
    note: "All documents uploaded by client"
  }),
});
```

---

## Admin Workflow

Admins manage users, approve partners, and process loan leads through to disbursement.

### Approve a partner

```js
await fetch(`${API}/partners/${partnerId}/status`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  },
  body: JSON.stringify({ status: "approved" }),
});
```

### Process a lead through the pipeline

```js
// 1. Assign a bank to the lead (auto-transitions status to "bank_processing")
await fetch(`${API}/admin/leads/${leadId}/assign-bank`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    bankName: "HDFC Bank",
    bankLogo: "https://cdn.example.com/hdfc.png",
    note: "Best rate for this profile"
  }),
});

// 2. Update status through the pipeline
for (const status of ["approved", "disbursed"]) {
  await fetch(`${API}/admin/leads/${leadId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status, note: `Lead ${status}` }),
  });
}
```

> **Edge case:** When assigning a bank to a lead with status `submitted`, `docs_uploaded`, or `docs_pending`, the status automatically transitions to `bank_processing`. Other statuses remain unchanged.

---

## API Reference

### Auth Endpoints

All auth routes are mounted at `/api/auth`.

---

#### Register User

Create a standard user account.

```
POST /api/auth/register
```

**Rate limit:** 5 requests/hour per IP (production), 50 in development.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Must be a valid email, stored lowercase |
| `password` | string | Yes | Min 8 chars. Must include: uppercase, lowercase, digit, special char (`@$!%*?&`) |
| `firstName` | string | Yes | Max 50 characters |
| `lastName` | string | Yes | Max 50 characters |
| `phone` | string | No | 10-digit number |

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": null,
      "role": "partner",
      "isActive": true,
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "createdAt": "2026-02-17T10:00:00.000Z"
    }
  }
}
```

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 400 | Missing required fields | `"Please provide email, password, firstName, and lastName"` |
| 400 | Email already exists | `"User with this email already exists"` |
| 400 | Validation failed | `errors` array with field-level messages |
| 429 | Rate limited | `"Too many accounts created from this IP"` |

---

#### Register Partner

Create a partner account with full onboarding data (4-step form).

```
POST /api/auth/register-partner
```

Also available at `POST /api/partners` (same handler).

**Rate limit:** 5 requests/hour per IP.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `fullName` | string | Yes | 2–100 chars |
| `mobileNumber` | string | Yes | 10-digit number |
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Min 8 chars with complexity requirements |
| `partnerType` | string | Yes | One of: `freelancer`, `used-car-dealer`, `property-dealer`, `builder`, `sub-dsa` |
| `city` | string | Yes | Max 100 chars |
| `phoneVerificationToken` | string | No | Token from OTP verification |
| `businessName` | string | No | Max 200 chars |
| `businessAddress` | string | No | Max 500 chars |
| `yearsInOperation` | string | No | Free text |
| `panNumber` | string | No | Format: `ABCDE1234F` |
| `gstNumber` | string | No | GST number |
| `hasExperience` | string | No | Free text |
| `expectedLeads` | string | No | Free text |
| `accountHolderName` | string | No | Max 100 chars |
| `bankName` | string | No | Max 100 chars |
| `accountNumber` | string | No | 9–18 digits |
| `ifscCode` | string | No | Format: `ABCD0123456` |
| `upiId` | string | No | Max 50 chars |
| `consentDataShare` | boolean | Yes | Must be `true` |
| `consentCommission` | boolean | Yes | Must be `true` |
| `declarationNotEmployed` | boolean | Yes | Must be `true` |
| `consentPrivacyPolicy` | boolean | Yes | Must be `true` |

**Response (201):**

```json
{
  "success": true,
  "message": "Partner registered successfully. Your application is pending approval.",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "rahul@business.com",
      "firstName": "Rahul",
      "lastName": "Verma",
      "phone": "9876543210",
      "role": "partner",
      "isActive": false,
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "createdAt": "2026-02-17T10:00:00.000Z"
    }
  }
}
```

> **Important:** `isActive` is `false` until an admin approves the partner. The `fullName` is split into `firstName` and `lastName` at the first space.

---

#### Login

```
POST /api/auth/login
```

**Rate limit:** 10 requests/15 min per IP (production). Only failed attempts count.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | User's email |
| `password` | string | Yes | User's password |

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "9876543210",
      "role": "partner",
      "isActive": true,
      "isEmailVerified": true,
      "isPhoneVerified": true,
      "createdAt": "2026-02-17T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

**Cookie set:** `refreshToken` (httpOnly, Secure in prod, SameSite=Strict, path=/api/auth, maxAge=7 days)

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 401 | Wrong email or password | `"Invalid credentials"` |
| 401 | Inactive account | `"Account has been deactivated. Please contact support."` |
| 401 | Pending partner | `"Your partner account is pending approval."` |
| 423 | Account locked | `"Account is locked. Try again in X minutes."` |
| 429 | Rate limited | `"Too many login attempts, please try again after 15 minutes"` |

**Security details:**
- After **5 failed attempts**, the account is locked for **30 minutes**.
- Login from a new device fingerprint triggers a `SUSPICIOUS_ACTIVITY` audit event.
- Each login creates/updates an active session record (max 10 sessions per user, oldest evicted).

---

#### Refresh Token

Silently obtain a new access token using the httpOnly refresh cookie.

```
POST /api/auth/refresh-token
```

No request body needed — the `refreshToken` cookie is sent automatically.

Alternatively, you can send the refresh token in the body:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `refreshToken` | string | No | If not using the cookie |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

> **Token rotation:** The old refresh token is invalidated and a new `refreshToken` cookie is set. This limits the damage if a refresh token is compromised.

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 401 | No refresh token | `"No refresh token provided"` |
| 401 | Invalid or expired | `"Invalid refresh token"` or `"Refresh token is invalid or expired"` |

---

#### Get Current User

```
GET /api/auth/me
```

**Auth required:** Yes (Bearer token)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "9876543210",
      "role": "partner",
      "isActive": true,
      "isEmailVerified": true,
      "isPhoneVerified": true,
      "createdAt": "2026-02-17T10:00:00.000Z"
    }
  }
}
```

---

#### Logout

```
POST /api/auth/logout
```

**Auth required:** Yes (Bearer token)

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

Clears the `refreshToken` cookie, blacklists the access token, removes the active session, and nullifies the stored refresh token in the database.

---

#### Forgot Password

Request a password reset code.

```
POST /api/auth/forgot-password
```

**Rate limit:** 3 requests/hour per IP.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Account email |

**Response (200):**

```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset code has been sent"
}
```

> **Security:** Always returns 200 regardless of whether the email exists (prevents email enumeration). In non-production environments, the `data.resetToken` is included in the response for testing.

The reset token expires in **10 minutes**.

---

#### Reset Password

```
POST /api/auth/reset-password
```

**Rate limit:** 3 requests/hour per IP.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Account email |
| `code` | string | Yes | Reset code from forgot-password |
| `password` | string | Yes | New password (min 8 chars) |

**Response (200):**

```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 400 | Invalid/expired code | `"Invalid or expired reset code"` |
| 400 | Password reuse | `"You cannot reuse a recent password"` |

> **Gotcha:** The API stores the last **5 password hashes** and rejects any reuse.

---

#### Send OTP

```
POST /api/auth/send-otp
```

**Rate limit:** 3 requests/10 min per IP.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `phone` | string | One required | 10-digit phone number |
| `email` | string | One required | Email address |

Provide either `phone` or `email`, not both. If the user doesn't exist and `phone` is given, an `OtpChallenge` record is created (used during partner onboarding).

**Response (200):**

```json
{
  "success": true,
  "message": "Verification code sent to mobile number"
}
```

> In non-production environments, `data.otp` is included for testing. OTP expires in **5 minutes**.

---

#### Verify OTP

```
POST /api/auth/verify-otp
```

**Rate limit:** 3 requests/10 min per IP.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `phone` | string | One required | Phone number |
| `email` | string | One required | Email address |
| `otp` | string | Yes | 6-digit code |

**Response for existing user (200):**

```json
{
  "success": true,
  "message": "Verification successful",
  "data": {
    "user": { "id": "...", "isPhoneVerified": true, "..." : "..." }
  }
}
```

**Response for new phone during onboarding (200):**

```json
{
  "success": true,
  "message": "Verification successful",
  "data": {
    "verificationToken": "abc123..."
  }
}
```

> The `verificationToken` should be passed as `phoneVerificationToken` during partner registration.

---

#### MSG91 OTP Endpoints

These use the MSG91 SMS gateway for production OTP delivery.

**Send OTP:**
```
POST /api/auth/otp/send
Body: { "mobile": "9876543210" }
Response: { "success": true, "message": "...", "data": { "requestId": "..." } }
```

**Verify OTP:**
```
POST /api/auth/otp/verify
Body: { "mobile": "9876543210", "otp": "123456" }
Response: { "success": true, "message": "...", "data": { "verificationToken": "verified" } }
```

**Resend OTP:**
```
POST /api/auth/otp/resend
Body: { "mobile": "9876543210", "retryType": "text" }
Response: { "success": true, "message": "...", "data": { "requestId": "..." } }
```

> `retryType` can be `"text"` (default) or `"voice"`.

---

### Profile Endpoints

All profile routes require authentication. Mounted at `/api/profile`.

---

#### Get Profile

```
GET /api/profile
```

**Auth required:** Yes

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "9876543210",
      "role": "partner",
      "isActive": true,
      "isEmailVerified": true,
      "isPhoneVerified": true,
      "createdAt": "2026-02-17T10:00:00.000Z",
      "updatedAt": "2026-02-17T12:00:00.000Z"
    }
  }
}
```

---

#### Update Profile

```
PUT /api/profile
```

**Auth required:** Yes

| Parameter | Type | Required | Description |
|---|---|---|---|
| `firstName` | string | No | Max 50 chars |
| `lastName` | string | No | Max 50 chars |
| `phone` | string | No | Must be exactly 10 digits |

**Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": { "...": "updated user object" }
  }
}
```

---

#### Update Password

```
PUT /api/profile/password
```

**Auth required:** Yes

| Parameter | Type | Required | Description |
|---|---|---|---|
| `currentPassword` | string | Yes | Current password |
| `newPassword` | string | Yes | Min 8 chars with complexity (uppercase, lowercase, digit, special char) |

**Response (200):**

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 400 | Wrong current password | `"Current password is incorrect"` |
| 400 | Password reuse (last 5) | `"Cannot reuse a recent password"` |

---

#### Delete Account

Soft-deletes the account (sets `isActive: false`).

```
DELETE /api/profile
```

**Auth required:** Yes

| Parameter | Type | Required | Description |
|---|---|---|---|
| `password` | string | Yes | Confirm with current password |

**Response (200):**

```json
{
  "success": true,
  "message": "Account has been deactivated successfully"
}
```

---

### Leads Endpoints (Public)

These endpoints are **unauthenticated** and designed for website lead capture. Mounted at `/api/leads`.

---

#### Submit Public Lead

```
POST /api/leads
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `fullName` | string | Yes | Client's full name |
| `phone` | string | Yes | Client's phone |
| `email` | string | No | Defaults to `not-provided@website.lead` |
| `city` | string | No | Client's city |
| `loanType` | string | Yes | Type of loan (e.g., `home_loan`, `personal_loan`) |
| `loanAmount` | number | Yes | Must be a positive number |
| `employmentType` | string | No | One of: `salaried`, `self_employed`, `business_owner`, `professional` |

**Response (201):**

```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "data": {
    "lead": {
      "id": "uuid-here",
      "clientFullName": "Priya Sharma",
      "clientPhone": "9876543210",
      "loanType": "home_loan",
      "loanAmount": 5000000,
      "status": "submitted",
      "partnerId": "system-partner-uuid",
      "partnerName": "Website Direct"
    }
  }
}
```

> **Gotcha:** Requires `SYSTEM_PARTNER_ID` environment variable. Returns `500` if not configured.

---

#### Update Preferred Bank

```
PATCH /api/leads/:id/preferred-bank
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `preferredBank` | string | Yes | Bank name |

**Response (200):**

```json
{
  "success": true,
  "message": "Preferred bank updated successfully",
  "data": { "lead": { "...": "..." } }
}
```

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 403 | More than 1 hour since submission | `"Preferred bank can only be set within 1 hour of lead submission."` |
| 404 | Lead not found | `"Lead not found"` |

---

### Partner Endpoints

All routes require authentication + `partner` role. Mounted at `/api/partner`.

---

#### Get Lead Stats (Dashboard)

```
GET /api/partner/leads/stats
```

**Auth required:** Yes (Partner)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 42,
      "totalAmount": 15000000,
      "byStatus": {
        "submitted": 10,
        "docs_pending": 5,
        "docs_uploaded": 8,
        "bank_processing": 7,
        "approved": 6,
        "disbursed": 4,
        "rejected": 2
      },
      "byLoanType": [
        { "type": "home_loan", "count": 20 },
        { "type": "personal_loan", "count": 15 }
      ],
      "recentLeads": 5
    }
  }
}
```

> `recentLeads` counts leads created in the last 7 days.

---

#### Create Lead

```
POST /api/partner/leads
```

**Auth required:** Yes (Partner)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `fullName` | string | Yes | Client name |
| `phone` | string | Yes | Client phone |
| `email` | string | Yes | Client email |
| `dateOfBirth` | string | No | Date of birth |
| `panNumber` | string | No | PAN card number |
| `aadhaarNumber` | string | No | Aadhaar number |
| `employmentType` | string | No | `salaried`, `self_employed`, `business_owner`, `professional` |
| `monthlyIncome` | number | No | Monthly income |
| `companyName` | string | No | Employer name |
| `workExperience` | number | No | Years of experience |
| `city` | string | No | Client city |
| `pincode` | string | No | Client pincode |
| `loanType` | string | Yes | Loan category |
| `loanAmount` | number | Yes | Requested amount |
| `tenure` | number | No | Loan tenure in months |

**Response (201):**

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "lead": {
      "id": "uuid-here",
      "client": {
        "id": "uuid-here",
        "fullName": "Amit Kumar",
        "phone": "9123456789",
        "email": "amit@example.com",
        "employmentType": "salaried",
        "monthlyIncome": 75000,
        "companyName": "TCS",
        "city": "Bangalore"
      },
      "loanType": "personal_loan",
      "loanAmount": 500000,
      "status": "submitted",
      "partnerId": "partner-uuid",
      "partnerName": "Rahul Verma",
      "documents": [],
      "timeline": [
        {
          "id": "timeline-uuid",
          "status": "submitted",
          "timestamp": "2026-02-17T10:00:00.000Z",
          "note": "Lead submitted",
          "updatedBy": "System"
        }
      ],
      "createdAt": "2026-02-17",
      "updatedAt": "2026-02-17"
    }
  }
}
```

---

#### Get Leads (Paginated)

```
GET /api/partner/leads
```

**Auth required:** Yes (Partner — returns own leads only)

| Query Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | string | — | Filter by status |
| `loanType` | string | — | Filter by loan type |
| `search` | string | — | Search by client name, phone, or email (case-insensitive) |
| `sortBy` | string | `createdAt` | One of: `createdAt`, `updatedAt`, `loanAmount`, `status`, `loanType` |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "leads": [ "...array of lead objects..." ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}
```

---

#### Get Lead By ID

```
GET /api/partner/leads/:id
```

**Auth required:** Yes (Partner — only own leads)

Returns `403` if trying to access another partner's lead.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "lead": {
      "id": "uuid-here",
      "client": { "...": "..." },
      "loanType": "home_loan",
      "loanAmount": 5000000,
      "tenure": 240,
      "status": "bank_processing",
      "bankAssigned": "HDFC Bank",
      "bankLogo": "https://...",
      "partnerId": "partner-uuid",
      "partnerName": "Rahul Verma",
      "documents": [],
      "timeline": [
        { "status": "submitted", "timestamp": "...", "updatedBy": "System", "note": "Lead submitted" },
        { "status": "bank_processing", "timestamp": "...", "updatedBy": "Admin Name", "note": "Bank assigned: HDFC Bank" }
      ],
      "eligibilityResult": {
        "isEligible": true,
        "maxLoanAmount": 7500000,
        "estimatedEMI": 45000,
        "checkedAt": "2026-02-17T12:00:00.000Z"
      },
      "commission": {
        "amount": 25000,
        "rate": 0.5,
        "status": "pending"
      },
      "createdAt": "2026-02-15",
      "updatedAt": "2026-02-17"
    }
  }
}
```

---

#### Update Lead

```
PUT /api/partner/leads/:id
```

**Auth required:** Yes (Partner)

Partners can only update: `loanAmount`, `tenure`.

| Parameter | Type | Description |
|---|---|---|
| `loanAmount` | number | Updated loan amount |
| `tenure` | number | Updated tenure |

**Response (200):**

```json
{
  "success": true,
  "message": "Lead updated successfully",
  "data": { "lead": { "...": "..." } }
}
```

---

#### Update Lead Status

```
PATCH /api/partner/leads/:id/status
```

**Auth required:** Yes (Partner)

**Partner-allowed statuses:** `submitted`, `docs_pending`, `docs_uploaded`

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | New status |
| `note` | string | No | Timeline note |

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 403 | Partner trying to set unauthorized status | `"Partners can only update status to docs_pending, submitted, or docs_uploaded"` |
| 403 | Not own lead | `"Not authorized to update this lead"` |

---

### Admin Endpoints

All routes require authentication + `admin` role. Mounted at `/api/admin`.

---

#### Get Admin Stats

```
GET /api/admin/stats
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 150,
      "activeUsers": 120,
      "partners": 80,
      "admins": 5,
      "verifiedUsers": 130,
      "newUsersThisWeek": 12
    }
  }
}
```

---

#### List Users

```
GET /api/admin/users
```

**Response (200):**

```json
{
  "success": true,
  "count": 150,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "partner",
        "isActive": true,
        "createdAt": "2026-02-17T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### Create Admin User

```
POST /api/admin/users
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | User email |
| `password` | string | Yes | Password |
| `firstName` | string | Yes | First name |
| `lastName` | string | Yes | Last name |
| `role` | string | Yes | One of: `super_admin`, `admin`, `manager`, `agent`, `viewer` |

> **Important:** Cannot create users with the `partner` role through this endpoint. Use the partner registration flow instead.

**Response (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": { "user": { "...": "..." } }
}
```

---

#### Get User By ID

```
GET /api/admin/users/:id
```

**Response (200):**

```json
{
  "success": true,
  "data": { "user": { "...": "full user object" } }
}
```

---

#### Update User

```
PUT /api/admin/users/:id
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `firstName` | string | No | Updated first name |
| `lastName` | string | No | Updated last name |
| `phone` | string | No | Updated phone |
| `role` | string | No | Updated role |
| `isActive` | boolean | No | Activate/deactivate |
| `isEmailVerified` | boolean | No | Override email verification |
| `isPhoneVerified` | boolean | No | Override phone verification |

**Response (200):**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": { "user": { "...": "..." } }
}
```

---

#### Delete User

```
DELETE /api/admin/users/:id
```

Hard-deletes the user record.

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 400 | Trying to delete yourself | `"You cannot delete your own account from here"` |
| 404 | User not found | `"User not found"` |

**Response (200):**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

#### List Partners (Admin View)

```
GET /api/admin/partners
```

| Query Param | Type | Description |
|---|---|---|
| `status` | string | Filter: `approved` (active) or other (inactive) |

**Response (200):**

```json
{
  "success": true,
  "count": 80,
  "data": {
    "partners": [
      {
        "id": "uuid",
        "fullName": "Rahul Verma",
        "email": "rahul@business.com",
        "phone": "9876543210",
        "partnerType": "freelancer",
        "city": "Delhi",
        "status": "approved",
        "leadsSubmitted": 15,
        "joinedDate": "2026-01-15",
        "panNumber": "ABCDE1234F",
        "businessName": "Verma Finance"
      }
    ]
  }
}
```

---

#### Get Lead Stats (Admin)

```
GET /api/admin/leads/stats
```

Same response shape as partner lead stats, but across **all** leads.

---

#### List Leads (Admin)

```
GET /api/admin/leads
```

Same query parameters as partner leads endpoint, but returns **all** leads across all partners.

---

#### Create Lead (Admin)

```
POST /api/admin/leads
```

Same parameters as partner lead creation.

---

#### Get Lead By ID (Admin)

```
GET /api/admin/leads/:id
```

No ownership check — admins can view any lead.

---

#### Update Lead (Admin)

```
PUT /api/admin/leads/:id
```

Admins can update additional fields beyond partner-allowed fields:

| Parameter | Type | Description |
|---|---|---|
| `loanAmount` | number | Loan amount |
| `tenure` | number | Tenure |
| `status` | string | Lead status |
| `bankAssigned` | string | Assigned bank |
| `bankLogo` | string | Bank logo URL |
| `sanctionedAmount` | number | Sanctioned amount |
| `disbursedAmount` | number | Disbursed amount |
| `interestRate` | number | Interest rate |
| `emi` | number | EMI amount |
| `internalNotes` | string | Internal notes |

If `status` is changed, a timeline entry is automatically created.

---

#### Update Lead Status (Admin)

```
PATCH /api/admin/leads/:id/status
```

Admins can set **any** valid status.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | One of: `draft`, `submitted`, `docs_pending`, `docs_uploaded`, `bank_processing`, `approved`, `disbursed`, `rejected` |
| `note` | string | No | Timeline note (defaults to `"Status updated to {status}"`) |

---

#### Assign Bank to Lead

```
PATCH /api/admin/leads/:id/assign-bank
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `bankName` | string | Yes | Bank name |
| `bankLogo` | string | No | Bank logo URL |
| `note` | string | No | Timeline note |

**Response (200):**

```json
{
  "success": true,
  "message": "Bank \"HDFC Bank\" assigned to lead successfully",
  "data": { "lead": { "...": "..." } }
}
```

> **Auto-transition:** If the lead status is `submitted`, `docs_uploaded`, or `docs_pending`, it automatically moves to `bank_processing`.

---

#### Delete Lead

```
DELETE /api/admin/leads/:id
```

**Response (200):**

```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

---

### Partners Management (Admin)

Full partner lifecycle management. Requires authentication + `admin` role. Mounted at `/api/partners`.

> **Note:** `POST /api/partners` is the **only** unauthenticated endpoint in this group (partner registration).

---

#### Get Partner Stats

```
GET /api/partners/stats
```

**Auth required:** Yes (Admin)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 80,
      "active": 60,
      "pending": 20,
      "byType": [
        { "type": "freelancer", "count": 30 },
        { "type": "property_dealer", "count": 25 },
        { "type": "sub_dsa", "count": 15 },
        { "type": "builder", "count": 10 }
      ]
    }
  }
}
```

---

#### List Partners

```
GET /api/partners
```

**Auth required:** Yes (Admin)

| Query Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `status` | string | `approved`, `pending`, or `rejected` |
| `partnerType` | string | Filter by partner type |
| `city` | string | Filter by city (case-insensitive partial match) |
| `search` | string | Search by name, email, or phone |

**Response (200):**

```json
{
  "success": true,
  "count": 20,
  "data": {
    "partners": [
      {
        "id": "uuid",
        "fullName": "Rahul Verma",
        "firstName": "Rahul",
        "lastName": "Verma",
        "email": "rahul@business.com",
        "phone": "9876543210",
        "partnerType": "freelancer",
        "city": "Delhi",
        "status": "approved",
        "isActive": true,
        "kycStatus": "verified",
        "leadsSubmitted": 15,
        "joinedDate": "2026-01-15",
        "panNumber": "ABCDE1234F",
        "businessName": "Verma Finance",
        "businessAddress": "123 Main St",
        "gstNumber": "07ABCDE1234F1Z5",
        "accountHolderName": "Rahul Verma",
        "bankName": "HDFC Bank",
        "accountNumber": "123456789012",
        "ifscCode": "HDFC0001234"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 80,
      "pages": 4
    }
  }
}
```

---

#### Get Partner By ID

```
GET /api/partners/:id
```

**Auth required:** Yes (Admin)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "partner": { "...": "full partner object with lead count" }
  }
}
```

---

#### Update Partner

```
PUT /api/partners/:id
```

**Auth required:** Yes (Admin)

Updatable fields: `firstName`, `lastName`, `phone`, `city`, `state`, `pincode`, `partnerType`, `businessName`, `businessAddress`, `gstNumber`, `panNumber`, `aadhaarNumber`, `accountHolderName`, `bankName`, `accountNumber`, `ifscCode`, `isActive`, `internalNotes`.

---

#### Update Partner Status

```
PATCH /api/partners/:id/status
```

**Auth required:** Yes (Admin)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | `approved`, `rejected`, `suspended`, or `pending` |
| `reason` | string | No | Reason (stored as `internalNotes` for rejections) |

**Side effects:**
- `approved` → sets `isActive: true`, `onboardingStatus: "approved"`, records `onboardingCompletedAt`
- `rejected` → sets `isActive: false`, `kycStatus: "rejected"`, stores reason
- `pending` → sets `isActive: false`, `onboardingStatus: "pending"`

---

#### Get Partner Leads

```
GET /api/partners/:id/leads
```

**Auth required:** Yes (Admin)

| Query Param | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | string | Filter by lead status |

---

#### Get Partner Commissions

```
GET /api/partners/:id/commissions
```

**Auth required:** Yes (Admin)

Only returns leads with status `disbursed` and `commissionAmount > 0`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "commissions": [
      {
        "id": "lead-uuid",
        "leadId": "lead-uuid",
        "clientName": "Amit Kumar",
        "loanType": "personal_loan",
        "disbursedAmount": 500000,
        "commissionRate": 0.5,
        "commissionAmount": 2500,
        "status": "paid",
        "paidAt": "2026-02-15T10:00:00.000Z",
        "createdAt": "2026-02-01T10:00:00.000Z"
      }
    ],
    "summary": {
      "total": 50000,
      "paid": 30000,
      "pending": 20000,
      "count": 10
    }
  }
}
```

---

#### Update Partner Profile

```
PUT /api/partners/:id/profile
```

**Auth required:** Yes (Admin or self)

Updatable fields: `firstName`, `lastName`, `phone`, `city`, `state`, `pincode`, `businessName`, `businessAddress`, `accountHolderName`, `bankName`, `accountNumber`, `ifscCode`.

---

#### Submit KYC

```
POST /api/partners/:id/kyc
```

**Auth required:** Yes (Admin or self)

| Parameter | Type | Description |
|---|---|---|
| `panNumber` | string | PAN card number |
| `aadhaarNumber` | string | Aadhaar number |

Sets `kycStatus` to `"pending"`.

---

#### Update KYC Status

```
PATCH /api/partners/:id/kyc/status
```

**Auth required:** Yes (Admin)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | Yes | `pending`, `verified`, or `rejected` |
| `rejectionReason` | string | No | Reason for rejection |

> **Side effect:** `verified` automatically sets `isActive: true`.

---

### Document Endpoints

File upload/download for authenticated users. Mounted at `/api/documents`. Storage backend: Cloudflare R2.

---

#### Upload Document

```
POST /api/documents/upload
Content-Type: multipart/form-data
```

**Auth required:** Yes

| Field | Type | Required | Description |
|---|---|---|---|
| `document` | file | Yes | PDF, JPEG, PNG, WebP, or GIF. Max **3 MB**. |

```bash
curl -X POST https://your-domain.com/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "document=@/path/to/file.pdf"
```

**Response (201):**

```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "key": "users/uuid/1708171200000-file.pdf",
    "fileName": "file.pdf",
    "size": 245000
  }
}
```

**Error scenarios:**

| Status | Cause | Response |
|---|---|---|
| 400 | No file provided | `"No file provided"` |
| 400 | Unsupported type | `"Unsupported file type: application/zip. Allowed types: PDF, JPEG, PNG, WebP, GIF"` |
| 413 | File too large | `"File too large. Maximum size is 3 MB"` |

---

#### List Documents

```
GET /api/documents
```

**Auth required:** Yes

Returns documents belonging to the authenticated user.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "key": "users/uuid/1708171200000-file.pdf",
      "lastModified": "2026-02-17T10:00:00.000Z",
      "size": 245000
    }
  ]
}
```

---

#### Download Document

```
GET /api/documents/download/{key}
```

**Auth required:** Yes

Returns a pre-signed download URL (expires in 1 hour).

> **Access control:** Users can only download their own documents. The key must start with `users/{userId}/`.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "url": "https://r2-bucket.example.com/users/uuid/file.pdf?X-Amz-...",
    "expiresIn": 3600
  }
}
```

---

#### Delete Document

```
DELETE /api/documents/{key}
```

**Auth required:** Yes

> **Access control:** Users can only delete their own documents.

**Response (200):**

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

### Health Check

```
GET /api/health
```

No authentication required.

**Response (200):**

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-02-17T10:00:00.000Z",
  "environment": "production"
}
```

---

## Rate Limits

All rate limits use Redis-backed storage in production (falls back to in-memory in development).

| Limiter | Window | Max Requests (Prod) | Max Requests (Dev) | Scope |
|---|---|---|---|---|
| **API (general)** | 15 min | 100 | 500 | Per IP, all `/api` routes |
| **Login** | 15 min | 10 | 50 | Per IP, failed attempts only |
| **Registration** | 1 hour | 5 | 50 | Per IP |
| **Password reset** | 1 hour | 3 | 3 | Per IP |
| **OTP** | 10 min | 3 | 3 | Per IP |

Rate limit headers are included in responses:
- `RateLimit-Limit` — max requests in window
- `RateLimit-Remaining` — requests remaining
- `RateLimit-Reset` — seconds until window resets

**429 response:**

```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

> **Gotcha:** The login limiter uses `skipSuccessfulRequests: true`, so successful logins don't count toward the limit. Only failed attempts do.

---

## Error Handling

### Standard error format

Every error response follows the same shape:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

### Validation errors

When input validation fails (express-validator), the response includes field-level details:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please provide a valid email address" },
    { "field": "password", "message": "Password must be at least 8 characters long" }
  ]
}
```

### Common HTTP status codes

| Status | Meaning | When you'll see it |
|---|---|---|
| 200 | Success | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST (new resource) |
| 400 | Bad Request | Missing/invalid fields, business rule violations |
| 401 | Unauthorized | Missing/invalid/expired token, deactivated account |
| 403 | Forbidden | Role not authorized, accessing another user's resource |
| 404 | Not Found | Resource doesn't exist, unmatched route |
| 413 | Payload Too Large | File upload exceeds 3 MB |
| 423 | Locked | Account locked after too many failed login attempts |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected error (details hidden in production) |

### Token-specific error codes

```json
{
  "success": false,
  "message": "Token expired, please refresh or login again",
  "code": "TOKEN_EXPIRED"
}
```

The `code` field is only present for `TOKEN_EXPIRED` — use it to trigger automatic token refresh in your client.

---

## Data Models & Enums

### User Roles

| Role | Description | Access Level |
|---|---|---|
| `super_admin` | Full system access | All endpoints |
| `admin` | Administrative access | All admin + partner management endpoints |
| `manager` | Team management | Limited admin access |
| `agent` | Field agent | Limited access |
| `viewer` | Read-only | View-only access |
| `partner` | Loan partner/agent | Partner endpoints only |

### Lead Statuses

The lead flows through these statuses (typical happy path: left → right):

```
draft → submitted → docs_pending → docs_uploaded → bank_processing → approved → disbursed
                                                                                ↘ rejected
```

| Status | Description | Who can set |
|---|---|---|
| `draft` | Incomplete lead | Admin |
| `submitted` | New lead submitted | Partner, Admin |
| `docs_pending` | Documents requested | Partner, Admin |
| `docs_uploaded` | Documents uploaded | Partner, Admin |
| `bank_processing` | Sent to bank | Admin (auto on bank assignment) |
| `approved` | Loan approved | Admin |
| `disbursed` | Loan disbursed | Admin |
| `rejected` | Loan rejected | Admin |

### Partner Types

| Value | Description |
|---|---|
| `freelancer` | Independent loan agent |
| `used_car_dealer` | Used car dealership |
| `property_dealer` | Real estate agent |
| `builder` | Construction/builder |
| `sub_dsa` | Sub-DSA (Direct Selling Agent) |

### Employment Types

| Value | Description |
|---|---|
| `salaried` | Salaried employee |
| `self_employed` | Self-employed individual |
| `business_owner` | Business owner |
| `professional` | Doctor, lawyer, CA, etc. |

### Onboarding Status

| Value | Description |
|---|---|
| `pending` | Awaiting admin review |
| `approved` | Partner approved and active |
| `rejected` | Partner application rejected |

### KYC Status

| Value | Description |
|---|---|
| `pending` | KYC not yet reviewed |
| `verified` | KYC verified (auto-activates partner) |
| `rejected` | KYC rejected |

### Commission Status

| Value | Description |
|---|---|
| `pending` | Commission calculated but not processed |
| `processing` | Commission being processed |
| `paid` | Commission paid out |

### Document Status

| Value | Description |
|---|---|
| `pending` | Document uploaded, awaiting review |
| `uploaded` | Document uploaded |
| `verified` | Document verified |
| `rejected` | Document rejected |

### Audit Event Types

| Event | Description |
|---|---|
| `LOGIN_SUCCESS` | Successful login |
| `LOGIN_FAILED` | Failed login attempt |
| `LOGOUT` | User logged out |
| `REGISTER` | New user/partner registered |
| `PASSWORD_RESET_REQUEST` | Password reset requested |
| `PASSWORD_RESET_SUCCESS` | Password successfully reset |
| `PASSWORD_CHANGE` | Password changed |
| `OTP_SENT` | OTP verification code sent |
| `OTP_VERIFIED` | OTP successfully verified |
| `ACCOUNT_LOCKED` | Account locked after failed attempts |
| `TOKEN_REFRESH` | Access token refreshed |
| `SUSPICIOUS_ACTIVITY` | Login from new device detected |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing secret (must differ from `JWT_SECRET`) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token TTL (e.g., `15m`, `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL (e.g., `7d`, `30d`) |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated CORS origins |
| `FRONTEND_URL` | No | `http://localhost:5173` | Fallback CORS origin |
| `REDIS_URL` | No | — | Redis connection URL (enables rate limit persistence, OTP storage, token blacklisting) |
| `R2_ACCOUNT_ID` | Yes* | — | Cloudflare R2 account ID (*required for document features) |
| `R2_ACCESS_KEY_ID` | Yes* | — | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes* | — | R2 secret key |
| `R2_BUCKET_NAME` | No | `docs-storage` | R2 bucket name |
| `SYSTEM_PARTNER_ID` | Yes* | — | UUID of system partner (*required for public lead submission) |
| `MSG91_AUTH_KEY` | No | — | MSG91 API key for SMS OTP |
| `MSG91_TEMPLATE_ID` | No | — | MSG91 OTP template ID |
| `FIELD_ENCRYPTION_KEY` | No | — | 32-byte hex key for AES-256-GCM field encryption |

---

## Security Notes

- **CORS:** Only origins listed in `ALLOWED_ORIGINS` are permitted. Requests from other origins get a `403`.
- **Request size:** JSON body limited to **10 KB**. File uploads limited to **3 MB**.
- **Helmet:** CSP, HSTS (1 year, preload), X-Frame-Options (DENY), X-Content-Type-Options (nosniff), XSS-Protection enabled.
- **Field encryption:** PII fields (aadhaar, PAN, bank account numbers) are encrypted at rest using AES-256-GCM via a Prisma extension.
- **Password storage:** bcrypt with 12 salt rounds. Last 5 passwords tracked to prevent reuse.
- **Account lockout:** 5 failed login attempts → 30-minute lockout.
- **Session management:** Max 10 active sessions per user. Oldest sessions are evicted when the limit is exceeded.
- **Audit logging:** All auth events are logged with IP, user agent, and device fingerprint. Failed events never expose whether an email exists.
