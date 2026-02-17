FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install wget and openssl for healthcheck and prisma
RUN apk add --no-cache wget openssl

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Expose port (Railway will set $PORT)
EXPOSE 3001

# Start
CMD ["node", "dist/index.js"]
