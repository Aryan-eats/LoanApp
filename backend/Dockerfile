# ============================================================================
# GPS India Loan Portal — Backend (Express 5 + Prisma + TypeScript)
# Multi-stage build: build → production
# ============================================================================

# ---------- Stage 1: Build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source (exclude scripts/ — migration utilities import mongodb which is not a prod dep)
COPY tsconfig.json ./
COPY src/modules ./src/modules/
COPY src/shared ./src/shared/
COPY src/app.ts src/server.ts ./src/
RUN npm run build

# ---------- Stage 2: Production ----------
FROM node:20-alpine AS production

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Only install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma schema + generated client from build stage
COPY --from=build /app/prisma ./prisma/
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled JavaScript
COPY --from=build /app/dist ./dist/

# Switch to non-root user
USER appuser

EXPOSE 5000

# Health check using the existing /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "dist/server.js"]
