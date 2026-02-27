# Multi-stage Dockerfile for Railway deployment
# Build context MUST be the monorepo root (/)

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Required for Prisma engines on Alpine
RUN apk add --no-cache openssl libc6-compat

# Enable corepack for pnpm (since monorepo uses pnpm)
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy root workspace configs
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy the api package package.json AND prisma schema
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install dependencies (letting scripts run so Prisma can download engines)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Generate Prisma Client specifically for the API app
WORKDIR /app/apps/api
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Required for Prisma engines on Alpine
RUN apk add --no-cache openssl libc6-compat

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy root workspace configs
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files and generated Prisma client from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Create persistent data directory for SQLite
RUN mkdir -p /data && chown -R node:node /data

# Use non-root user
USER node

WORKDIR /app/apps/api

# Expose port (Railway will override with $PORT)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/index.js"]
