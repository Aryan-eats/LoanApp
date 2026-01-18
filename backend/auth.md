# Authentication & Authorization System

## Overview

This document describes the authentication and authorization flow for the Loan App backend. The system implements industry-standard security practices including JWT-based authentication, refresh tokens, audit logging, and multi-factor authentication (OTP).

---

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication Flow](#authentication-flow)
3. [Token System](#token-system)
4. [Security Features](#security-features)
5. [API Endpoints](#api-endpoints)
6. [Configuration](#configuration)
7. [Frontend Integration](#frontend-integration)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                      │
│  (React App / Mobile App)                                                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │        Rate Limiter             │
                    │   (express-rate-limit)          │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │      Input Validation           │
                    │    (express-validator)          │
                    └────────────────┬────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
┌────────▼────────┐        ┌────────▼────────┐        ┌────────▼────────┐
│ Auth Controller │        │ Auth Middleware │        │ Audit Logger    │
│                 │        │   (protect)     │        │                 │
└────────┬────────┘        └────────┬────────┘        └────────┬────────┘
         │                          │                          │
         │                          │                          │
┌────────▼────────┐        ┌────────▼────────┐        ┌────────▼────────┐
│   User Model    │        │ Token Blacklist │        │  AuditLog Model │
│   (MongoDB)     │        │ (Redis/Memory)  │        │    (MongoDB)    │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

---

## Authentication Flow

### 1. Registration Flow

```
User → POST /api/auth/register → Validation → Create User → Generate Tokens → Set Cookie → Response
                                      │              │              │
                                      │              ▼              ▼
                                      │         Hash Password   Audit Log
                                      │         (bcrypt 12)     (REGISTER)
                                      ▼
                              Check Duplicates
```

**Steps:**
1. Client sends registration data (email, password, name)
2. Rate limiter checks (5 registrations/hour per IP)
3. Input validation (password strength, email format)
4. Check for duplicate email/phone
5. Create user with hashed password
6. Generate access token (15 min) and refresh token (7 days)
7. Set refresh token in httpOnly cookie
8. Log registration event
9. Return tokens and user data

### 2. Login Flow

```
User → POST /api/auth/login → Validation → Verify Credentials → Check Lockout
                                   │              │                   │
                                   │              │                   ▼
                                   │              │            If locked:
                                   │              │            Return 423
                                   │              ▼
                                   │         Compare Password
                                   │              │
                              Rate Limit     Success?
                              (5/15min)          │
                                            ┌────┴────┐
                                            │         │
                                          Yes        No
                                            │         │
                                            ▼         ▼
                                    Reset Attempts  Increment
                                    Generate Tokens  Attempts
                                    Add Session     If ≥5: Lock
                                    Audit Log       Audit Log
```

**Account Lockout:**
- 5 failed attempts → 30-minute lockout
- Failed attempts reset on successful login
- Lockout status checked before password verification

### 3. Token Refresh Flow

```
Client → POST /api/auth/refresh-token → Verify Refresh Token → Generate New Access Token
              │                                  │                       │
              │                                  ▼                       ▼
              │                          Check Expiry              Return Token
              ▼
      Cookie or Body
      (refreshToken)
```

**How it works:**
1. Client sends expired access token request, gets 401 with `code: TOKEN_EXPIRED`
2. Client calls `/api/auth/refresh-token` with refresh token (from cookie or body)
3. Server validates refresh token and issues new access token
4. Client retries original request with new access token

### 4. Logout Flow

```
User → POST /api/auth/logout → Blacklist Token → Remove Session → Clear Cookie
                                      │                │              │
                                      ▼                ▼              ▼
                               Redis/Memory      User.sessions   refreshToken
                               Add to blacklist   Remove entry    cookie
```

**Important:** Access tokens are blacklisted until they expire naturally.

---

## Token System

### Access Token
| Property | Value |
|----------|-------|
| **Type** | JWT |
| **Expiry** | 15 minutes (configurable) |
| **Storage** | Client memory/localStorage |
| **Contains** | `{ id, role }` |
| **Purpose** | API authorization |

### Refresh Token
| Property | Value |
|----------|-------|
| **Type** | JWT |
| **Expiry** | 7 days (configurable) |
| **Storage** | httpOnly cookie + hashed in DB |
| **Contains** | `{ id, type: 'refresh' }` |
| **Purpose** | Get new access tokens |

### Token Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Login      │────▶│ Access Token │────▶│ API Request  │
│              │     │   (15 min)   │     │              │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            │ Expired?
                            ▼
                     ┌──────────────┐
                     │Refresh Token │
                     │   (7 days)   │
                     └──────┬───────┘
                            │
                            │ Valid?
                            ▼
                     ┌──────────────┐
                     │New Access    │
                     │   Token      │
                     └──────────────┘
```

---

## Security Features

### 1. Password Security
- **Hashing:** bcrypt with 12 salt rounds
- **Minimum Length:** 8 characters
- **Complexity:** Requires uppercase, lowercase, number, and special character
- **History:** Last 5 passwords tracked, reuse prevented on reset

### 2. Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Register | 5 attempts | 1 hour |
| Password Reset | 3 attempts | 1 hour |
| OTP Send | 3 attempts | 10 minutes |
| General API | 100 requests | 15 minutes |

### 3. Account Lockout
- **Trigger:** 5 failed login attempts
- **Duration:** 30 minutes
- **Reset:** Automatic after lockout period or successful login

### 4. Token Blacklist
- **Development:** In-memory storage
- **Production:** Redis-based (distributed, persistent)
- **Cleanup:** Expired tokens auto-removed

### 5. Audit Logging
All authentication events are logged:
- `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `LOGOUT`
- `REGISTER`
- `PASSWORD_RESET_REQUEST` / `PASSWORD_RESET_SUCCESS`
- `PASSWORD_CHANGE`
- `OTP_SENT` / `OTP_VERIFIED`
- `ACCOUNT_LOCKED`
- `TOKEN_REFRESH`
- `SUSPICIOUS_ACTIVITY`

### 6. Session Management
- Device fingerprinting (User-Agent + headers hash)
- Active sessions tracked per user
- Logout removes session
- New device login triggers suspicious activity alert

### 7. Input Validation
All inputs sanitized and validated:
- Email normalization
- XSS prevention (escape special characters)
- SQL injection prevention (parameterized queries)
- Field length limits

---

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/api/auth/register` | Register new user | 5/hour |
| POST | `/api/auth/register-partner` | Register partner | 5/hour |
| POST | `/api/auth/login` | User login | 5/15min |
| POST | `/api/auth/refresh-token` | Refresh access token | 5/15min |
| POST | `/api/auth/forgot-password` | Request password reset | 3/hour |
| POST | `/api/auth/reset-password` | Reset with token | 3/hour |
| POST | `/api/auth/send-otp` | Send OTP | 3/10min |
| POST | `/api/auth/verify-otp` | Verify OTP | 3/10min |

### Protected Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/auth/me` | Get current user | All |
| POST | `/api/auth/logout` | Logout user | All |

### Request/Response Examples

#### Login Request
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

#### Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "partner",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJI...",
    "refreshToken": "a7c9b2d..."
  }
}
```

#### Token Refresh Request
```json
POST /api/auth/refresh-token
{
  "refreshToken": "a7c9b2d..."
}
// OR use httpOnly cookie (automatic)
```

#### Token Refresh Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJI..."
  }
}
```

---

## Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-64-character-minimum-secret-key-here
JWT_ACCESS_EXPIRES_IN=15m     # Access token expiry
JWT_REFRESH_EXPIRES_IN=7d     # Refresh token expiry
JWT_REFRESH_SECRET=optional   # Separate secret for refresh tokens

# Redis (required for production)
REDIS_URL=redis://localhost:6379

# CORS
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com
```

### Generating a Secure JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Frontend Integration

### Storing Tokens

```typescript
// For web apps: Use httpOnly cookie (automatic) + memory for access token
let accessToken: string | null = null;

// On login response
accessToken = response.data.accessToken;
// refreshToken is set as httpOnly cookie automatically

// For API requests
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

### Handling Token Expiry

```typescript
// Axios interceptor example
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { data } = await axios.post('/api/auth/refresh-token');
        accessToken = data.data.accessToken;
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Protected Route Component (React)

```tsx
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};
```

---

## Role-Based Access Control

### Available Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | System administrator | Full access |
| `partner` | Business partner/DSA | Partner dashboard |

### Authorization Middleware Usage

```typescript
// Route requiring authentication only
router.get('/profile', protect, getProfile);

// Route requiring specific role
router.get('/admin/users', protect, authorize('admin'), getUsers);

// Route requiring multiple roles
router.get('/leads', protect, authorize('admin', 'partner'), getLeads);
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `TOKEN_EXPIRED` | 401 | Access token expired, refresh needed |
| - | 401 | Invalid credentials or token |
| - | 403 | Insufficient permissions |
| - | 423 | Account locked |
| - | 429 | Too many requests |

---

## Security Checklist

- [x] Password hashing with bcrypt (12 rounds)
- [x] JWT with short expiry (15 min access token)
- [x] Refresh token rotation
- [x] httpOnly cookies for refresh tokens
- [x] Rate limiting on all auth endpoints
- [x] Account lockout after failed attempts
- [x] Input validation and sanitization
- [x] Token blacklist for logout
- [x] Audit logging for all auth events
- [x] Device fingerprinting
- [x] Suspicious activity detection
- [x] Password history tracking
- [x] CORS configuration
- [x] Security headers (Helmet.js)
- [x] Graceful error handling (no leak of internals)
