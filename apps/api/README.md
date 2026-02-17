# ILAL API Service

Enterprise-grade REST API service — providing authentication, billing, ZK Proof verification, and session management.

## Features

- 🔐 **User Authentication** - Registration, login, JWT token management
- 🔑 **API Key Management** - Generation, revocation, permission control
- ⚡ **ZK Proof Verification** - On-chain ZK Proof verification and session activation
- 📊 **Usage Tracking** - Real-time API call recording and billing
- 💰 **Plan Management** - Free, Pro, and Enterprise tiers
- 🛡️ **Security** - Rate limiting, quota checks, API key encryption

## Tech Stack

- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT + bcrypt
- **Blockchain**: viem (Base Sepolia)
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### 1. Environment Configuration

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` to configure the database and blockchain parameters:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ilal_saas"
JWT_SECRET="your-secret-key"
VERIFIER_PRIVATE_KEY="0x..."
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Setup

```bash
# Generate Prisma Client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# (Optional) Open Prisma Studio to view data
pnpm db:studio
```

### 4. Start the Service

```bash
# Development mode (hot reload)
pnpm dev

# Production mode
pnpm build
pnpm start
```

The service will start at `http://localhost:3001`.

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user info

### API Key Management

- `GET /api/v1/apikeys` - List all API Keys
- `POST /api/v1/apikeys` - Create new API Key
- `PATCH /api/v1/apikeys/:id` - Update API Key
- `DELETE /api/v1/apikeys/:id` - Revoke API Key

### ZK Proof Verification

- `POST /api/v1/verify` - Verify ZK Proof and activate session
- `GET /api/v1/session/:address` - Query session status

### Usage Statistics & Billing

- `GET /api/v1/usage/stats` - Get usage statistics
- `GET /api/v1/billing/plans` - Get plans list
- `POST /api/v1/billing/upgrade` - Upgrade plan
- `GET /api/v1/billing/invoices` - Get billing history

### Health Check

- `GET /api/v1/health` - Service health check

## Authentication Methods

### JWT Authentication (for user management)

Include the JWT token in the request header:

```
Authorization: Bearer <your-jwt-token>
```

### API Key Authentication (for API calls)

Include the API Key in the request header:

```
X-API-Key: ilal_live_xxxxxxxxxxxxx
```

## Plan Limits

| Plan | Monthly Calls | Rate Limit | Price |
|------|--------------|------------|-------|
| Free | 100 | 10/min | $0 |
| Pro | 10,000 | 100/min | $99/mo |
| Enterprise | Unlimited | 1000/min | Custom |

## Development

### Database Operations

```bash
# Create new migration
pnpm db:migrate

# Reset database
prisma migrate reset

# Push schema changes (development)
pnpm db:push

# Open Prisma Studio
pnpm db:studio
```

### Logging

Logging uses Winston, outputting to console and files:

- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

### Directory Structure

```
src/
├── config/         # Configuration files
│   ├── database.ts
│   ├── constants.ts
│   └── logger.ts
├── controllers/    # Controllers
│   ├── auth.controller.ts
│   ├── apikey.controller.ts
│   ├── verify.controller.ts
│   └── billing.controller.ts
├── middleware/     # Middleware
│   ├── auth.middleware.ts
│   ├── apikey.middleware.ts
│   ├── ratelimit.middleware.ts
│   └── usage.middleware.ts
├── routes/         # Routes
│   ├── auth.routes.ts
│   ├── apikey.routes.ts
│   ├── verify.routes.ts
│   └── billing.routes.ts
├── services/       # Service layer
│   ├── blockchain.service.ts
│   └── billing.service.ts
├── utils/          # Utilities
│   ├── apiKey.ts
│   ├── jwt.ts
│   └── password.ts
├── server.ts       # Express server
└── index.ts        # Entry point
```

## Deployment

### Docker

```bash
docker build -t ilal-api .
docker run -p 3001:3001 --env-file .env ilal-api
```

### Environment Variables Checklist

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `API_KEY_SECRET` - API Key encryption salt
- [ ] `VERIFIER_PRIVATE_KEY` - Verifier wallet private key
- [ ] `SESSION_MANAGER_ADDRESS` - SessionManager contract address
- [ ] `VERIFIER_ADDRESS` - Verifier contract address

## Monitoring & Logging

Recommended stack:

- **Logging**: Winston + ELK Stack
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry

## Security Recommendations

1. Use strong random keys for `JWT_SECRET` and `API_KEY_SECRET`
2. Rotate API Keys regularly
3. Enable HTTPS (production)
4. Configure firewall and IP whitelisting
5. Back up database regularly
6. Monitor for anomalous access patterns

## License

Apache-2.0
