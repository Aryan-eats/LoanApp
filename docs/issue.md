## General/Docs

# Best offer page
chrome popup on "apply now" from bank page

# MSG91
OTP TEMPLATE

# Lead
change format of lead id

# login
forget and reset password

Fix the following issues. The issues can be from different files or can overlap on same lines in one file.

- Verify each finding against the current code and only fix it if needed.

In @README.md at line 79, Update the README entry that instructs to "Fill in `backend/.env` — database URL, JWT secrets, Redis URL, system partner ID" to clarify what "system partner ID" means: state whether it is an internal tenant/org identifier, where to obtain it (e.g., from the admin console, provisioning service, or environment/seeding step), and what to use for local/dev setup (e.g., a default GUID or the seeded partner ID). Also add a short pointer to the seeding/bootstrap docs or script (referencing the seeding/bootstrap documentation or script name) so new users know how to create or find the system partner ID for production vs local development.

- Verify each finding against the current code and only fix it if needed.

In @README.md at line 117, The README's TODO about "User and role credentials not fully functional in the frontend" indicates missing authentication and RBAC; implement a complete auth flow in the frontend by wiring the LoginForm to AuthService (token exchange, storage, refresh), enforcing role checks via a RoleGuard/ProtectedRoute wrapper and UserContext (or equivalent) so components check roles before rendering, and add an explicit, prominent WARNING section in the README indicating authentication is incomplete and that the app should not be used in production until AuthService and RoleGuard are fully implemented and tested.

- Verify each finding against the current code and only fix it if needed.

In @README.md around lines 67 - 85, The README's manual setup omits how to create the initial admin user or seed initial data; update the Backend section to document either an existing seed step or how to create an admin manually: mention any seed script (e.g., npm run seed or prisma/seed.ts) and the command to run it after migrations, or provide SQL/CLI instructions to insert an admin record and which .env vars to supply (suggest adding ADMIN_EMAIL and ADMIN_PASSWORD to backend/.env.example if the app reads them), and include an example command or note to run the seed before starting the server (after npx prisma migrate dev and npx prisma generate).

- Verify each finding against the current code and only fix it if needed.

In @README.md at line 79, Add a short security note to the README about JWT secrets in backend/.env: say they must be cryptographically strong and recommend a minimum entropy (e.g., 32 bytes / 256 bits or base64-encoded 32 bytes), forbid predictable values, and provide an example command to generate one (for example using openssl rand -base64 32). Reference the backend/.env JWT_SECRET and JWT_REFRESH_SECRET keys explicitly so readers know which entries to protect, and mention never to store secrets in version control.

- Verify each finding against the current code and only fix it if needed.

In @docs/api.md at line 474, Update the documentation to clarify the name-splitting behavior for the fullName -> firstName/lastName transformation: explicitly state that splitting occurs at the first space (so "Mary Jane Smith" becomes firstName="Mary", lastName="Jane Smith" and a single-name "John" yields firstName="John" and empty/undefined lastName), or alternatively instruct API consumers to provide firstName and lastName separately; mention the exact fields fullName, firstName, and lastName so readers can find the behavior in code/clients.

- Verify each finding against the current code and only fix it if needed.

In @docs/api.md at line 2187, Update the security note to explicitly list which schema fields are encrypted at rest and which are not: either extend the AES-256-GCM Prisma extension to cover all PII (e.g., aadhaar, PAN, bank_account_number, email, phone, full_name, address, employment_details, date_of_birth) and state that change, or clearly document per-field encryption status (e.g., "encrypted: aadhaar, PAN, bank_account_number; plaintext: email, phone, full_name, address, employment_details, date_of_birth") and mention the encryption mechanism (AES-256-GCM via Prisma extension) and any relevant data retention/processing caveats so API consumers know exactly which PII is protected.

- Verify each finding against the current code and only fix it if needed.

In @docs/api.md around lines 2086 - 2095, The partner type enum values are inconsistent between sections (e.g., used_car_dealer, property_dealer, sub_dsa here vs used-car-dealer, property-dealer earlier); verify which format the API accepts and update all occurrences to that canonical form (search for partner types like freelancer, used_car_dealer/used-car-dealer, property_dealer/property-dealer, builder, sub_dsa/sub-dsa and align them), then ensure examples and tables (including the Register Partner section and this Partner Types table) use the same hyphenated or underscored format everywhere and update any related schemas or example payloads accordingly.

- Verify each finding against the current code and only fix it if needed.

In @docs/api.md at line 392, The example response for the POST /api/auth/register in the docs contains an incorrect role value ("role": "partner"); update the example to reflect the default registered user role (e.g., change "role": "partner" to "role": "user") or remove the role field entirely if registration does not return a role. Locate the example in the API docs referencing POST /api/auth/register and update the "role": "partner" entry to the correct default (or omit it) and ensure the example matches the actual behavior of the register endpoint.

- Verify each finding against the current code and only fix it if needed.

In @production/migration-archive/2026-02-04/migration-output/migration-output/mongo-id-map.json around lines 1 - 62, The migration mapping JSON lacks validation for uniqueness, format, referential integrity, and bidirectional lookup; add a validation module with functions named validate_migration_map(map_data), validate_uniqueness(records, key), validate_format_mongoid(mongo_id) and validate_format_uuid(uuid) to check 24‑char hex mongoIds and RFC‑4122 UUIDs, implement validate_referential_integrity(map_data, source_client, target_client) to query the source/target systems for existence, and build_bidirectional_index(map_data) to produce reverse lookup maps; call validate_migration_map before accepting the file and make it fail fast with clear error messages identifying the offending collection and id.

- Verify each finding against the current code and only fix it if needed.

In @production/migration-archive/2026-02-04/migration-output/migration-output/mongo-id-map.json around lines 1 - 62, Add a top-level "metadata" object to the mongo-id-map.json that includes migrationId (e.g., "2026-02-04-mongo-to-uuid"), timestamp (ISO8601), recordCounts (an object with users and leads counts), and a checksum (e.g., sha256 over the serialized "users" + "leads" arrays) to support validation and auditability; ensure the recordCounts values reflect the actual lengths of the "users" and "leads" arrays and compute the checksum from the final mapping content so it can be verified during validation.

- Verify each finding against the current code and only fix it if needed.

In @production/migration-archive/2026-02-04/migration-output/migration-output/mongo-id-map.json around lines 1 - 62, The path contains a duplicated directory segment ("migration-output/migration-output") causing likely misplacement; verify and update the migration script or deployment step that writes the mongo-id-map.json (the JSON with top-level keys "users" and "leads") so it emits to the intended single "migration-output" directory, fix the path construction (remove the duplicate segment) in the migration writer/CLI code that generates mongo-id-map.json, and add a test or assertion in that code to prevent double-directory concatenation going forward.



## Backend

- Verify each finding against the current code and only fix it if needed.

In @backend/.env.example around lines 43 - 50, The MSG91_SENDER_ID entry currently contains a hardcoded value "GPSIND"; update the .env example to either leave MSG91_SENDER_ID empty like the other MSG91 variables or add an inline comment clarifying that "GPSIND" is an organization-specific sender ID and should be replaced by the user's sender ID. Specifically, modify the MSG91_SENDER_ID line (symbol: MSG91_SENDER_ID) to be blank for a placeholder or append a short comment that it is org-specific and not a recommended default.

- Verify each finding against the current code and only fix it if needed.

In @backend/prisma/migrations/20260203175650_init/migration.sql around lines 53 - 65, The migration currently defines sensitive PII columns (aadhaar_number, pan_number, account_number, ifsc_code, upi_id, possibly gst_number) as plain TEXT; update the schema and application to protect them by implementing encryption or hashing: choose either application-level encryption/decryption for these columns (encrypt before INSERT/UPDATE and decrypt on SELECT using secure key management) or use PostgreSQL pgcrypto (store encrypted bytea or use PGP_SYM_ENCRYPT/DECRYPT in migrations/queries), or store only salted hashes where reversible retrieval isn’t required; also add database role/column-level access controls and update any affected functions/ORM models (e.g., migration that creates these TEXT columns and the Prisma models that map to them) to handle encrypted storage and key rotation.

- Verify each finding against the current code and only fix it if needed.

In @backend/prisma/migrations/20260203175650_init/migration.sql around lines 109 - 111, Change the client columns so they use appropriate types and encryption: alter "client_date_of_birth" from TEXT to DATE to enable date validation and age calculations, and replace plaintext "client_pan_number" and "client_aadhaar" with encrypted storage (e.g., store encrypted payloads as BYTEA/TEXT using pgcrypto or move to a separate encryptedPII table) and ensure inserts/reads use pgp_sym_encrypt/pgp_sym_decrypt (or application-layer encryption) with your encryption key management; update the migration to reflect the DATE type and encrypted column types and add comments/constraints as needed so the application code (where CRUD for these columns is implemented) is updated to encrypt on write and decrypt on authorized read.

- Verify each finding against the current code and only fix it if needed.

In @backend/prisma/migrations/20260203175650_init/migration.sql around lines 47 - 48, The schema currently stores "refresh_token" in plain text; change the migration to store a hash instead (rename column to "refresh_token_hash" TEXT or update the intended column purpose) and keep "refresh_token_expires" as-is; then update application code so tokens are hashed before storing and compared via secure hash verification (e.g., use bcrypt/argon2) in the functions that create/refresh/validate tokens (e.g., createRefreshToken, saveRefreshToken / UserRepository.saveRefreshToken, and validateRefreshToken / AuthService.validateRefreshToken), ensure queries read/write the new "refresh_token_hash" column, and remove any code that logs or exposes plaintext tokens.

- Verify each finding against the current code and only fix it if needed.

In @backend/prisma/schema.prisma around lines 5 - 7, The datasource block "datasource db" is missing its required "url" property; add a url entry to the datasource (e.g., url = env("DATABASE_URL")) so Prisma can connect at runtime and CLI commands succeed, ensuring you reference an environment variable (DATABASE_URL) rather than hardcoding credentials and keep the existing provider = "postgresql" line unchanged.

- Verify each finding against the current code and only fix it if needed.

In @backend/prisma/schema.prisma at line 189, The user relation currently lacks an onDelete behavior which causes FK errors when deleting users; update the relation attribute on the model that contains the line "user              User?          @relation(fields: [userId], references: [id])" to include onDelete: SetNull (e.g. @relation(fields: [userId], references: [id], onDelete: SetNull)), ensure the backing userId field is optional (nullable) to allow nulling, then run a Prisma migrate to apply the schema change.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/config/prisma.ts around lines 11 - 14, Right now Pool and PrismaPg adapter are instantiated at module load (pool and adapter), which can leak connections during hot reload because createPrismaClient() may early-return if globalForPrisma.prisma exists; move the creation of the Pool and new PrismaPg(adapter) into createPrismaClient() (or guard their creation with a check that globalForPrisma.prisma is undefined) so that Pool and adapter are only constructed when you actually create the Prisma client (referencing Pool, PrismaPg, pool, adapter, and createPrismaClient).

- Verify each finding against the current code and only fix it if needed.

In @backend/src/config/redis.ts around lines 69 - 75, disconnectRedis currently awaits client.quit() but leaves the module-level client reference intact if quit() rejects, causing getRedisClient() to return a stale instance; wrap the quit call in try/catch/finally (or use a finally block) so that client = null is executed regardless of success, and log any quit() errors via the existing logger/console before clearing the reference; update the disconnectRedis function to ensure client is set to null in the finally path so subsequent getRedisClient() can create a fresh connection.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/authController.ts around lines 258 - 278, The returned value from prisma.user.findUnique with a select is a partial object and must not be cast to User; either remove the select to fetch the full User or define a proper selected type (e.g., type LoginUser = Pick<User, 'id'|'email'|'password'|'firstName'|'lastName'|'phone'|'role'|'isActive'|'isEmailVerified'|'isPhoneVerified'|'failedLoginAttempts'|'lockUntil'|'onboardingStatus'|'refreshToken'|'refreshTokenExpires'|'createdAt'>) and use that type for the variable returned by prisma.user.findUnique, then update the usages/signatures of signAccessToken, signRefreshToken, and formatUserResponse to accept the new LoginUser type (or keep them using User if you choose to remove the select) so no unsafe casting to User remains.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/authController.ts around lines 1033 - 1050, The audit event for OTP resend is being logged before confirming the operation succeeded; update the flow in the handler that calls resendMsg91OTP so that logAuditEvent('OTP_SENT', ...) is invoked only after result.success is true (or alternatively log distinct events for success/failure), i.e., move or conditionally call logAuditEvent after the if (result.success) branch that sends the 200 response; reference the resendMsg91OTP call and the existing logAuditEvent('OTP_SENT', req, { metadata: { method: 'msg91_rest_api_resend', mobile, retryType } }) to locate and adjust the code similar to the fix applied for msg91SendOTP.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/authController.ts around lines 947 - 964, The audit event 'OTP_SENT' is being logged before verifying the send result, causing failed attempts to be recorded as sent; update the flow in authController.ts so that sendMsg91OTP(mobile) is awaited first, then call logAuditEvent('OTP_SENT', req, { metadata: { method: 'msg91_rest_api', mobile } }) only when result.success is true (inside the success branch), and for failures either log a different event (e.g., 'OTP_SEND_FAILED') or include a failure audit with result.message; ensure you reference the existing sendMsg91OTP, logAuditEvent, and the OTP_SENT event name when making the change.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/authController.ts around lines 82 - 91, The code currently sets isEmailVerified: true in prisma.user.create which wrongly marks accounts verified; change the registration flow to set isEmailVerified: false in prisma.user.create, generate and persist a verification token (e.g., via a createEmailVerificationToken helper or an EmailVerification model), send that token to the user's email using sendVerificationEmail, and implement a verifyEmail endpoint/function that validates the token and then updates prisma.user.update to set isEmailVerified: true only after successful verification; ensure references to prisma.user.create, isEmailVerified, sendVerificationEmail, createEmailVerificationToken (or your EmailVerification model), and verifyEmail are used to locate and implement the changes.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/authController.ts around lines 997 - 1001, The response is returning a hardcoded verificationToken 'verified', which allows verifyMsg91OTP to be bypassed; instead generate a cryptographically secure signed token (e.g., a JWT or HMAC-signed token) when creating the verification response and return that token in place of the literal 'verified'. Update the token issuance site in authController (replace the hardcoded verificationToken: 'verified') to sign a payload (user id/phone and purpose) with an application secret from env and an expiry, and update verifyMsg91OTP to validate and verify the signature and expiry of that token rather than checking token === 'verified'.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/authController.ts around lines 186 - 200, The code marks isPhoneVerified = !!phoneVerificationToken without validating the token, allowing bypass; instead, before calling prisma.user.create, call the OTP validation routine (e.g., verifyOtp / validatePhoneOtp) with phoneVerificationToken and mobileNumber (or the MSG91 client) and only set isPhoneVerified = true when that verification function returns success; if verification fails, reject the request (throw or return an error) and do not create the user. Ensure you update references around phoneVerificationToken, isPhoneVerified, and the user creation flow (prisma.user.create) to use the verified result.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/authController.ts around lines 863 - 903, The verifyMsg91OTP handler contains a hardcoded bypass (token === 'verified') and trusts userId from the request body, creating an auth bypass; remove the placeholder logic and stop accepting userId from the client: either delete this deprecated endpoint or replace it with proper verification by (1) validating the provided token with the authoritative OTP/MSG91 verification flow or against a server-side persisted verification record (not by literal string), (2) authenticating the caller (use req.user.id or session info rather than body.userId) and/or verifying ownership of the verification record before updating, and (3) using prisma.user.update only after the server has confirmed the token and that the authenticated user matches the target user (refer to verifyMsg91OTP, token, userId, and prisma.user.update to locate the code).

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/documentController.ts around lines 56 - 84, The uploadLeadDoc handler (uploadLeadDoc) currently checks lead and document existence but lacks an authorization check; update it to verify the authenticated user (e.g., req.user.id or similar principal on the request) is allowed to modify the lead by comparing against the lead's owner/user field (e.g., lead.userId or lead.ownerId) or by querying membership/permissions via prisma (e.g., prisma.lead.findFirst({ where: { id: leadId, userId: currentUserId } })). If the user is not the owner and not in an allowed role (e.g., admin), respond with 403 and do not proceed; also ensure req typing includes the user principal for TypeScript (Request & { user?: { id: string; role?: string } }) so the check is type-safe.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/documentController.ts around lines 129 - 149, getLeadDocUrl lacks an authorization check allowing any user with a documentId to generate a download URL; before calling getLeadDocumentDownloadUrl(documentId) validate the requesting user’s permission (e.g., via existing uploadLeadDoc logic or a helper like authorizeLeadAccess/verifyLeadPermission) by resolving the lead/document owner from the documentId and comparing to req.user (or roles/permissions), and if unauthorized respond with 403 and an appropriate message—do this check inside getLeadDocUrl (prior to calling getLeadDocumentDownloadUrl) so only authorized users can obtain the URL.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/leadController.ts around lines 43 - 44, The response builder in leadController.ts is embedding a client object with client.id set to lead.id, which is misleading; update the code that constructs the client payload (the client object inside the lead response) to remove the id field or replace it with a clearly named field (e.g., client.leadId) if you must retain the linkage, and ensure any reference or serializer using the client object (e.g., the function/method that maps lead -> client in the controller) is updated to stop exposing lead.id as client.id to API consumers.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/leadController.ts around lines 353 - 372, The code updates lead status without validating updateData.status against the LeadStatus enum, causing Prisma constraint errors; before calling tx.lead.update or creating the timeline entry, check if updateData.status is present and is a valid LeadStatus (same validation used in updateLeadStatus), and if invalid return a 400 response; ensure you only cast to LeadStatus (newStatus) after validation and keep the tx.leadTimeline.create logic unchanged aside from using the validated value (refer to updateData.status, LeadStatus, updateLeadStatus, tx.lead.update, and tx.leadTimeline.create).

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/partnerController.ts around lines 248 - 253, The audit event type used in logAuditEvent calls is incorrect: replace the hardcoded 'REGISTER' event for partner updates with a semantically correct event type (e.g., 'UPDATE') in the logAuditEvent call inside updatePartner (where you currently pass 'REGISTER'), and similarly change the calls in updatePartnerStatus and updatePartnerKYCStatus to more appropriate types (e.g., 'STATUS_CHANGE' and 'KYC_UPDATE') or to the matching constants/enums if your audit system exposes them; update the metadata payloads as needed but keep the same userId/metadata shape when calling logAuditEvent.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/partnerController.ts around lines 434 - 445, The commissions mapping over leads (leads.map -> commissions) can yield misleading zeros when disbursedAmount and loanAmount are null and also duplicates id and leadId; update the mapping in partnerController.ts so disbursedAmount is computed defensively (e.g., check lead.disbursedAmount != null ? Number(lead.disbursedAmount) : lead.loanAmount != null ? Number(lead.loanAmount) : undefined) instead of Number(lead.disbursedAmount || lead.loanAmount), and remove the redundant field (keep either id or leadId, not both) so commission objects use a single authoritative identifier like leadId.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/controllers/profileController.ts around lines 118 - 121, In updateProfile, avoid calling prisma.user.update blindly; first verify the user exists (e.g., with prisma.user.findUnique({ where: { id: req.user.id } })) or handle Prisma's known error: wrap the prisma.user.update call in a try/catch and if the caught error is a Prisma.PrismaClientKnownRequestError with code 'P2025' return a 404 response, otherwise rethrow or return a 500; update references to req.user.id and the updateProfile handler accordingly so the route mirrors the existence checks used in updatePassword and deleteAccount.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/index.ts around lines 153 - 166, The gracefulShutdown function can attempt to call server.close when server is still undefined during startup; update gracefulShutdown to explicitly guard for an undefined server (the top-level server variable) before trying to close it: check if server is falsy, log a clear message like "HTTP server not started, skipping close" and skip the close Promise branch, otherwise proceed to await the existing server.close Promise; keep the rest of the try/catch logic for error logging unchanged so shutdown remains robust.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/middleware/upload.ts around lines 22 - 36, The fileFilter check in upload.ts only trusts client-provided file.mimetype (function fileFilter and constant ALLOWED_MIME_TYPES); add server-side magic-bytes validation by installing and using the file-type library: accept files into memory (multer memoryStorage), then in the upload route handler call a new validateFileContent(file.buffer) which uses file-type.fromBuffer to detect the real mime/extension, verify it matches ALLOWED_MIME_TYPES (and optionally matches file.mimetype), and reject the request (or delete/abort upload to R2) if it doesn’t match; keep the existing fileFilter as a first-pass but enforce the magic-bytes check before any R2 upload.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/routes/adminRoutes.ts around lines 319 - 329, The date handling around where.createdAt should validate dateFrom and dateTo before constructing Date objects: for each of dateFrom/dateTo in the adminRoutes handler, first ensure they are strings, attempt to construct a Date, then check its validity (e.g., !isNaN(date.getTime())) before assigning to (where.createdAt as any). If a date is invalid, either omit that bound or return a 400 error response; when handling dateTo, only set the end-of-day hours after confirming the Date is valid. Update the code that references dateFrom/dateTo and where.createdAt to perform these checks so Invalid Date objects are never used in queries.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/routes/adminRoutes.ts around lines 139 - 143, The response currently sends the full user object (variable user) including its password hash; before calling res.status(201).json(...) strip the password/hash field (e.g., const safeUser = { ...user.toObject ? user.toObject() : user }; delete safeUser.password; delete safeUser.passwordHash;) and return data: { user: safeUser } so the hashed password is never included; update the code around the res.status(201).json call in adminRoutes (the user creation handler) to use the sanitized user object.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/routes/authRoutes.ts around lines 46 - 51, Add request validation middleware to the new MSG91 routes so payloads are validated before reaching handlers: update the router.post calls that register msg91SendOTP, msg91VerifyOTP, and msg91ResendOTP to include appropriate validators (either reuse validateSendOTP/validateVerifyOTP or create new validators named validateMsg91SendOTP, validateMsg91VerifyOTP, validateMsg91ResendOTP) and place the validator before otpLimiter and the handler; ensure the validator functions mirror existing patterns used by validateSendOTP/validateVerifyOTP so error responses remain consistent with other OTP endpoints.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/routes/documentRoutes.ts around lines 55 - 59, The wildcard syntax '*key' is invalid for Express; update the routes to use a proper capture so controllers receive the full path: change router.get('/download/*key', download) to use a named wildcard like '/download/:key(*)' and change router.delete('/*key', remove) to '/:key(*)' (or use '/download/*' and '/*' and read req.params[0] if you prefer unnamed capture). After updating, ensure the download and remove handlers read the value from req.params.key (or req.params[0] for unnamed captures).

- Verify each finding against the current code and only fix it if needed.

In @backend/src/routes/documentRoutes.ts around lines 21 - 41, The error message in handleMulterErrors hardcodes "3 MB" which can drift from the actual limit in uploadSingle; update the code to use a shared constant or value instead of a literal. Export the configured limit (e.g., MAX_UPLOAD_SIZE or UPLOAD_MAX_BYTES) from the module that defines uploadSingle, import that constant into documentRoutes, format it to a human-friendly string (e.g., bytes -> "3 MB") and replace the hardcoded string in the 413 response message so the message always reflects the actual uploadSingle configuration.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/routes/leadsRoutes.ts at line 54, The placeholder 'not-provided@website.lead' used for clientEmail (in the leadsRoutes handler where clientEmail: email || 'not-provided@website.lead' is set) can cause duplicate-key DB errors; change the assignment to either use null when the schema allows (clientEmail: email ?? null) or generate a unique placeholder when null is disallowed (e.g., a deterministic unique token like a UUID or timestamp appended to the placeholder) so each missing-email lead gets a distinct value; update validation/creation logic where clientEmail is consumed to accept the new nullable/unique placeholder behavior.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/scripts/createAdmin.ts around lines 18 - 29, Replace the hardcoded password in the prisma.user.create call inside createAdmin.ts (where hashPassword(...) is used) with a source that doesn't live in source control: read the initial admin password from an environment variable (e.g., process.env.ADMIN_INITIAL_PASSWORD) and pass that into hashPassword; if the env var is missing, fail fast with a clear error message explaining the required ADMIN_INITIAL_PASSWORD (or alternatively generate a secure random password and print it once), ensuring you do not leave a fallback hardcoded secret in the codebase.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/scripts/createPartner.ts around lines 31 - 34, The script prints the partner password in plain text via console.log calls (the lines printing 'Password: Partner@123456') which is a security risk; remove the password log and instead only log non-sensitive info (e.g., confirm the user was created and print the email via the existing 'Partner user created successfully.' / 'Email: partner@loanapp.com' messages) and add a note to deliver credentials securely or to force a password reset on first login (update the account creation logic to require reset if applicable) so no plaintext password appears in logs.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/scripts/createPartner.ts around lines 36 - 42, The script currently calls process.exit() inside the try/catch which can prevent the finally block from running; move the await prisma.$disconnect() so it executes before any process.exit() calls (i.e., call await prisma.$disconnect() in both the successful path and the error path before invoking process.exit(0) or process.exit(1)), and then remove or simplify the finally block to avoid double-disconnect; ensure references to prisma.$disconnect() and process.exit() are updated accordingly in the createPartner script.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/documentService.ts around lines 61 - 67, sanitiseFilename can produce a trailing hyphen when original is empty or all-unsafe; update the sanitiseFilename function to check if `safe` is empty after the replace/substring and, if so, assign a sensible fallback (e.g., "file" or a short unique id) before returning so the result is never just `${timestamp}-`; ensure the fallback still respects length limits and the allowed character set so the final returned string from sanitiseFilename is always valid and non-empty after the timestamp prefix.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/documentService.ts around lines 148 - 158, The code currently generates a pre-signed download URL via getDownloadUrl(key) and persists it into prisma.leadDocument.update as fileUrl; instead, remove storing the ephemeral downloadUrl in the database and only persist stable metadata (fileName, fileSize, r2ObjectKey) in the prisma.leadDocument.update call, and if you need to return a URL to the caller generate a fresh pre-signed URL on-demand (call getDownloadUrl(key) only when producing a response or implement/getLeadDocumentDownloadUrl to create URLs at request time), ensuring fileUrl is not written to the DB but derived when needed.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/documentService.ts around lines 235 - 249, The catch in documentExists currently hides all errors; update documentExists (using getR2Client and HeadObjectCommand) to only return false for a NotFound/404 response and rethrow or propagate other errors (e.g., permission, network, throttling). Inspect the caught error (e.g., check (err as any).name === 'NotFound' or (err as any).$metadata?.httpStatusCode === 404) and return false only in that case; otherwise throw the error so callers can handle unexpected failures.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/documentService.ts around lines 260 - 275, The current ListObjectsV2Command call only returns the first 1000 objects; update the logic that calls client.send(new ListObjectsV2Command(...)) to paginate until all objects are retrieved (use ContinuationToken/NextContinuationToken loop or the AWS SDK v3 paginator for ListObjectsV2). Accumulate response.Contents across pages, then map to the existing shape (key, filename, size, lastModified) and return the combined array; keep using the same R2_BUCKET and prefix variables and ensure you handle when Contents is undefined on any page.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/otpChallengeService.ts around lines 45 - 56, The OTP verification currently checks the OTP and then calls redis.del separately, allowing a race where two requests both verify before deletion; modify the flow in otpChallengeService to atomically fetch-and-delete the stored OTP (use Redis GETDEL if available or run an equivalent Lua script via EVAL) to obtain the stored value for PREFIX_OTP + phone, compare that single atomic value to the supplied OTP, and only when it matches set the verification token (PREFIX_VTOKEN + phone with VERIFICATION_TOKEN_TTL_SECONDS) and return the token; reference the existing redis client and constants (PREFIX_OTP, PREFIX_VTOKEN, VERIFICATION_TOKEN_TTL_SECONDS) and ensure the deletion and read happen in one atomic operation so the OTP cannot be reused.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/otpChallengeService.ts around lines 115 - 132, The dbConsumeToken function currently reads with prisma.otpChallenge.findUnique then compares values client-side which creates a TOCTOU race and uses a timing-leaky !== comparison; replace the read-then-update with an atomic server-side update using prisma.otpChallenge.updateMany that includes both conditions (verificationToken equals the provided token and verificationTokenExpires >= new Date()) and sets verificationToken and verificationTokenExpires to null, then return true if updateCount > 0; for any Redis-based branch that still reads the token in-memory, switch the token comparison to a timing-safe comparison (e.g., crypto.timingSafeEqual) before proceeding.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/otpChallengeService.ts around lines 89 - 113, The current dbVerifyOtp function has a race between prisma.otpChallenge.findUnique and prisma.otpChallenge.update allowing duplicate verifications; instead compute hashedOtp = hashOtp(otp) and perform a single conditional DB mutation (e.g., prisma.otpChallenge.updateMany or a transaction) that matches phone AND otpHash = hashedOtp AND otpExpiresAt >= now AND verifiedAt IS NULL, setting verifiedAt, verificationToken, verificationTokenExpires and clearing otpHash atomically; check the affected count (0 => return {success:false, reason:'invalid' or 'expired'}), otherwise return the generated verificationToken. Ensure you reference dbVerifyOtp, hashOtp, otpHash, verifiedAt, verificationToken, verificationTokenExpires and replace the separate findUnique/update with this conditional atomic update.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/otpChallengeService.ts around lines 58 - 65, The redisConsumeToken function has a TOCTOU race where it reads then deletes the token (get then del), allowing two concurrent requests to both succeed; replace the non-atomic get+del with an atomic operation (use Redis GETDEL if the client supports it, or run a short Lua EVAL script that GETs the key, compares the value against token and deletes it only if it matches) for the key `${PREFIX_VTOKEN}${phone}` inside redisConsumeToken (and mirror the same approach used/fixed in redisVerifyOtp) so only one caller can successfully consume the token.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/smsService.ts around lines 61 - 67, Remove the temporary debug logging block that prints MSG91 configuration metadata (the console.log block and the "// TEMP DEBUG - remove after fixing" comment) in backend/src/services/smsService.ts so configuration details (authKey length, templateId, etc.) are not exposed; if you need retained telemetry, replace it with a non-sensitive check via an existing app logger (e.g., processLogger.debug) that only reports a boolean indicating presence of config (no lengths or values) and remove all direct console.log usage referencing authKey or templateId.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/smsService.ts around lines 193 - 202, The retry call in smsService.ts builds the MSG91 retry URL with authkey as a query param (uses formatIndianNumber and the retry endpoint) which can expose credentials in logs; verify MSG91 docs for the /api/v5/otp/retry endpoint and, if it supports header auth, move authKey into the request headers (consistent with sendOTP and verifyOTP) and remove it from url.searchParams; if headers are not supported, add a clear comment explaining why query param is required and consider masking/log-filtering the param before any logging.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/smsService.ts around lines 96 - 101, The console.log in the SMS send flow is leaking PII (mobile numbers). In the sendOTP (or relevant) function in smsService.ts replace the raw formattedMobile in the debug log with a redacted version (e.g., mask all but the last 4 digits) or remove the mobile field entirely; reference the formattedMobile variable and the MSG91 sendOTP Response log and ensure any logger call uses the redacted value instead of the full phone number.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/userService.ts around lines 134 - 137, The current verifyUserOTP implementation returns false when Redis is reachable but misses the OTP, which is ambiguous; update verifyUserOTP to either (A) perform the DB fallback lookup automatically by checking user.otpHash and user.otpExpires when the Redis path returns no OTP, or (B) change the function's return type to a discriminated union (e.g., {status: "ok" | "invalid" | "check_db"}) so callers can distinguish "invalid OTP" from "please check DB"; locate the logic in verifyUserOTP and implement one of these approaches, ensuring the code references user.otpHash / user.otpExpires when doing the DB fallback and that callers handle the new discriminant if you choose the union option.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/userService.ts around lines 126 - 132, Replace the insecure `stored !== hashedOtp` string comparison with a constant-time comparison using Node's crypto.timingSafeEqual: ensure both `stored` and `hashedOtp` are converted to Buffers of the same length (if lengths differ, return false), then use `crypto.timingSafeEqual(bufStored, bufHashedOtp)` before deleting the key and returning true; also add the `import crypto from 'crypto'` (or require) if not already present. This change targets the OTP verification block that calls `getRedisClient()` and checks `${USER_OTP_PREFIX}${userId}`.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/services/userService.ts around lines 90 - 91, The OTP range in generateOTP is off-by-one because crypto.randomInt(min, max) is exclusive of max; update the call in generateOTP to use 100000 as the min and 1000000 as the max so the produced 6-digit OTP can include 999999 (i.e., change the upper bound from 999999 to 1000000).

- Verify each finding against the current code and only fix it if needed.

In @backend/src/tests/db.operations.test.ts around lines 177 - 182, The query in prisma.auditLog.findMany is too broad and causes flakes by returning LOGIN_SUCCESS entries from other tests; narrow the where clause to only the record created in this test by adding a filter for the test user (e.g., userId: user.id) or by querying the specific audit log id returned when you create it (use that id in the where). Update the assertion to expect the scoped result (e.g., findMany({ where: { event: 'LOGIN_SUCCESS', userId: user.id } }) or a findUnique by id) so the test only checks the log produced here.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/tests/db.operations.test.ts around lines 189 - 200, The test creates a user with a hardcoded email causing P2002 on re-runs; update the prisma.user.create call in the test (the user variable creation) to use the existing uniqueEmail() helper instead of the literal 'pii-user@example.com' so each run gets a unique address and avoids the unique constraint error.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/tests/r2.test.ts around lines 176 - 179, The test 'lists zero documents after deletion' assumes a clean store; update it to either (A) filter the result of listUserDocuments(TEST_USER_ID) to assert there are no items matching the test artifact identifier (e.g., uploadedKey) instead of checking docs.length === 0, or (B) add a setup/teardown step that deletes all documents for TEST_USER_ID before the suite runs so listUserDocuments(TEST_USER_ID) can reliably be asserted as empty; locate references to listUserDocuments, TEST_USER_ID and uploadedKey in the test file and implement one of these fixes to avoid flakiness.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/tests/r2.test.ts around lines 146 - 153, The test 'generates a pre-signed download URL' contains a fragile assertion expecting the R2 bucket name in the URL; update the test in r2.test.ts (the it block that calls getDownloadUrl(uploadedKey) and references R2_BUCKET) to remove or guard the expect(url).toContain(R2_BUCKET) check — either delete that assertion entirely or replace it with a conditional check that parses the URL (new URL(url)) and asserts the bucket is present only when the endpoint is known to be virtual-hosted-style (e.g., driven by an env flag) so the remaining assertions (uploadedKey truthiness and url starting with https://) still validate the pre-signed URL.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/tests/redis.test.ts around lines 53 - 63, The cleanup in afterAll uses a broad 'rl:*' pattern which can delete non-test rate-limit keys; update the call to flushTestKeys so it only targets test keys (e.g., 'rl:__test__*' or use the same test key prefix variable used elsewhere), or guard the cleanup with an environment check (ensure process.env.NODE_ENV === 'test' or a TEST_REDIS flag) before calling flushTestKeys; locate the afterAll block and modify the rl cleanup line (and/or add the env guard) so only test-scoped rate-limit keys are removed while still calling disconnectRedis afterwards.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/utils/auditLogger.ts at line 55, The user-agent header is assigned directly as userAgent: req.headers['user-agent'], but req.headers['user-agent'] can be string | string[] | undefined while Prisma expects a string or null; update the audit logger to normalize that header by converting arrays to a single string (e.g., take the first element), converting undefined to null, and then assign that normalized value to the userAgent field so the type matches Prisma (locate the assignment of userAgent in auditLogger.ts and adjust the normalization before saving).

- Verify each finding against the current code and only fix it if needed.

In @backend/src/utils/auditLogger.ts around lines 30 - 32, The hashEmail function currently uses unsalted SHA-256; replace it with an HMAC using a server-side secret key (e.g., EMAIL_HASH_KEY) to prevent rainbow-table attacks: change hashEmail to compute crypto.createHmac('sha256', secret).update(email.trim().toLowerCase()).digest('hex'), ensure the secret is loaded from a secure config/env and throw or log a clear error if missing, and keep the function name hashEmail and its string return type so callers (audit logger) continue to work unchanged.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/utils/fieldEncryption.ts around lines 208 - 218, Update the actionsWithResults set in fieldEncryption.ts so it accurately reflects which Prisma actions return records to decrypt: remove or exclude actions that return counts (specifically treat 'deleteMany' and 'updateMany' as non-record results) and add the missing record-returning variants 'findFirstOrThrow' and 'findUniqueOrThrow'; locate the constant actionsWithResults and adjust its entries accordingly so decryption logic only runs for actions that actually return records.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/utils/fieldEncryption.ts around lines 23 - 25, The deriveIv function currently produces a deterministic IV (deriveIv) by HMACing plaintext, leaking equality information; either replace this with a cryptographically random IV (use crypto.randomBytes(12)) and persist the IV alongside the ciphertext (update the encrypt/decrypt routines that call deriveIv to accept/parse an IV), or if deterministic IVs are intentionally required for lookup, add a clear comment above deriveIv explaining the security trade-offs (frequency/leakage risk) and instead implement a separate blind index mechanism for searchable lookups; modify references to deriveIv, encrypt, and decrypt to match the chosen approach.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/utils/fieldEncryption.ts around lines 118 - 146, The code currently encrypts supported string filters but ignores unsupported substring filters (contains, startsWith, endsWith) which will silently produce wrong results; update the logic inside the block that processes the Record<string, unknown> (the variable named filter) and inside the nested notFilter to detect if filter.contains, filter.startsWith, or filter.endsWith (and the same keys on notFilter) are present (and are strings or non-null) and immediately throw a clear error stating these filters are unsupported for encrypted fields; implement this check alongside the existing equals/in/notIn/not handling and reference encryptString, where, filter, and notFilter so the runtime rejects queries using those substring filters instead of passing them through.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/utils/jwt.ts around lines 53 - 59, The jwt.verify calls in verifyAccessToken and verifyRefreshToken currently omit allowed algorithms, risking algorithm confusion attacks; update both functions (verifyAccessToken and verifyRefreshToken) to pass the algorithms option to jwt.verify (e.g., { algorithms: ['HS256'] } or the specific algorithm your tokens use) while still using getAccessSecret() and getRefreshSecret(), so verification only accepts the intended signing algorithm.

- Verify each finding against the current code and only fix it if needed.

In @backend/src/utils/jwt.ts around lines 82 - 101, The parseExpiresInToSeconds function silently returns 0 for unrecognized formats; update it to support plain numeric strings (e.g., "900" treated as seconds) and the week unit "w" (convert 1w → 7 days), and make it throw a clear error for truly invalid inputs instead of returning 0. Locate parseExpiresInToSeconds and adjust the regexes to accept either /^\d+$/ or /^(\d+)(s|m|h|d|w)$/, parse the amount with parseInt, add a case for 'w' returning amount * 60 * 60 * 24 * 7, handle plain numeric by returning amount, and throw an Error with a descriptive message when the input doesn't match expected patterns. Ensure callers of parseExpiresInToSeconds can surface or handle the thrown error.

### Backend Phase-wise Implementation

#### Phase 1: Critical security and auth bypass fixes
- Remove OTP/verification bypass logic in `backend/src/controllers/authController.ts`.
- Stop trusting client-provided `userId`; use authenticated principal only.
- Replace plaintext refresh-token persistence with hashed token storage.
- Tighten JWT verification with explicit allowed algorithms.
- Remove hardcoded secrets and sensitive logs from scripts/services.

#### Phase 2: Data protection and crypto hardening
- Implement encryption/hashing plan for sensitive PII fields flagged in Prisma migration/schema issues.
- Fix `backend/src/utils/fieldEncryption.ts` gaps (unsupported filters, action result set, IV strategy).
- Replace unsalted email hashing with keyed HMAC in `backend/src/utils/auditLogger.ts`.
- Ensure audit logging normalizes header types and avoids sensitive leakage.

#### Phase 3: Concurrency and race-condition fixes
- Make OTP consume/verify flows atomic in `backend/src/services/otpChallengeService.ts`.
- Replace TOCTOU read-then-update patterns with atomic `updateMany`/Redis atomic operations.
- Use timing-safe comparisons where secrets/tokens are compared.
- Fix Redis disconnect lifecycle to prevent stale client reuse.

#### Phase 4: Authorization and API safety
- Add authorization checks in document endpoints before upload/download URL generation.
- Prevent exposure of password/hash fields in responses.
- Correct audit event semantics for partner/admin update actions.
- Enforce strict input validation for dates/status fields to avoid runtime/query failures.

#### Phase 5: Service integrity and persistence correctness
- Stop persisting ephemeral pre-signed URLs; generate on demand.
- Fix document service behavior (pagination, error propagation, safe filename fallback).
- Resolve Prisma datasource/relation/type consistency issues and migration mismatches.
- Fix script reliability (`process.exit` ordering, required env checks, no plaintext credential output).

#### Phase 6: Test stabilization and rollout
- Fix flaky backend tests (`db.operations`, `r2`, `redis`) using scoped data and test-only cleanup.
- Add regression coverage for auth, OTP, access control, and encrypted-field query behavior.
- Roll out in order:
  1. Staging migrations + smoke tests
  2. Security regression pass
  3. Production deploy with monitoring on auth/OTP/document endpoints
