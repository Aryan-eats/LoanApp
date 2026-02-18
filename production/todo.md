# Loan App - Scratchpad & Notes

@/admin/lead.tsx - import preffered bank (if)  from @Bestoffers.tsx
searchbars 


## Done (mostly)
- [x] Express 5/TS setup (finally)
- [x] JWT tokens & Refresh flow
- [x] Role-based access (admin vs partner)
- [x] Onboarding workflow
- [x] Security stuff (Helmet, Rate limits, 12-round bcrypt)

## Current Fire / Next Up
- [ ] Document management (Phase 3) - S3 vs Local Multer? 
- [ ] Application Model for loans
- [ ] Compound indexes for Lead queries (need to check performance)

## Technical Debt to tackle soon
- [ ] ESM is a pain in the backend. Fix test imports.
- [ ] Move token blacklist to Redis for prod.
- [ ] Need response caching for static lists.
- [ ] Virtual scrolling for the big admin tables (urgent).

## Misc Notes
- Don't reuse last 5 passwords (auditor said so).
- Vite config needs a refresh plugin fix.
- Compression middleware setup.
