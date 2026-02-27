# Multi-stage Dockerfile for Railway deployment
# Build from the apps/api directory

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files and Prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Generate Prisma Client in production
RUN npx prisma generate

# Create persistent data directory for SQLite
RUN mkdir -p /data && chown -R node:node /data

# Use non-root user
USER node

# Expose port (Railway will override with $PORT)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && node dist/index.js"]
