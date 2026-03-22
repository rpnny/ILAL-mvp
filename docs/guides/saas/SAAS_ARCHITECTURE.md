# ILAL SaaS Architecture Documentation

## Architecture Overview

ILAL has been refactored from a demo DApp into a full **SaaS infrastructure**, delivering enterprise-grade DeFi compliance solutions.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                      User Application Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard  │  │  Third-party │  │   CLI Tools  │    │
│  │ (User Mgmt)  │  │     Apps     │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         SDK Layer                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              @ilal/sdk (TypeScript)                   │  │
│  │  • ILALClient (Direct On-Chain Mode)                 │  │
│  │  • ILALApiClient (API Key Mode)                      │  │
│  │  • Session / Swap / Liquidity / ZKProof / EAS        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      SaaS Service Layer                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            ILAL API Service (Node.js)                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │   Auth   │ │ API Key  │ │ Billing  │            │   │
│  │  │  (JWT)   │ │   Mgmt   │ │ Tracking │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │  ┌──────────────────────────────────────────┐      │   │
│  │  │    ZK Proof Verification & Session       │      │   │
│  │  │    Activation (Legacy Relay Function)    │      │   │
│  │  └──────────────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         PostgreSQL (Prisma ORM)                      │   │
│  │  • Users  • API Keys  • Usage Records               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Blockchain Infrastructure Layer             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Smart Contracts (Solidity)                  │  │
│  │  • SessionManager (0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2)  │
│  │  • ComplianceHook (0xe633220f15932428FcA60A1A2C2C48797A180A80)  │
│  │  • Registry (0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD)  │
│  │  • SimpleSwapRouter (0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891)  │
│  │  • PositionManager (0x692548a6E1797d2762b9d04f29112C172E5Cea32)  │
│  │  • PlonkVerifier  • Uniswap V4 Pools                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Base / Base Sepolia                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Two Integration Modes

### Mode 1: Direct On-Chain (Open-Source Users)

```typescript
import { ILALClient } from '@ilal/sdk';

// Connect directly to the blockchain via RPC
const client = await ILALClient.fromRPC({
  rpcUrl: 'https://base.llamarpc.com',
  chainId: 8453,
  privateKey: '0x...',
});

// Direct on-chain operations
await client.session.activate();
await client.swap.execute({ ... });
```

**Characteristics**:
- ✅ Fully decentralized
- ✅ No account registration required
- ✅ No usage limits
- ❌ Gas fees required
- ❌ Must deploy your own ZK Proof generation service

### Mode 2: API Key (SaaS Users)

```typescript
import { ILALApiClient } from '@ilal/sdk';

// Use API Key to access API service
const client = new ILALApiClient({
  apiKey: 'ilal_live_xxxxx',
  apiBaseUrl: 'https://api.ilal.tech',
  chainId: 8453,
});

// Proxy through API service
await client.verifyAndActivate({
  userAddress: '0x...',
  proof: '0x...',
  publicInputs: ['123', '456'],
});
```

**Characteristics**:
- ✅ No gas fees (API service pays)
- ✅ Simple integration (API Key ready to use)
- ✅ Free tier available
- ✅ Enterprise support
- ⚠️ Account registration required
- ⚠️ Monthly quota limits (upgradeable)

## Pricing Model

### Plan Comparison

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Monthly Calls** | 100 | 10,000 | Unlimited |
| **Rate Limit** | 10/min | 100/min | 1000/min |
| **API Keys** | 2 | 10 | Unlimited |
| **Support** | Community | Email | Dedicated |
| **SLA** | - | 99.9% | 99.99% |
| **Price** | $0 | $99/month | Custom |

### Billing Logic

- **Per-call billing**: Each API call counts toward quota
- **Endpoint weights vary**:
  - ZK Proof verification: 5 credits
  - Session activation: 3 credits
  - Query endpoints: 0.5 credits
- **Quota reset**: First day of each month
- **Overage handling**: Returns `402 Payment Required`

## Tech Stack

### API Service (`apps/api/`)

- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5.x
- **Auth**: JWT (jsonwebtoken)
- **Password**: bcrypt
- **Blockchain**: viem 2.x
- **Logging**: Winston
- **Rate limiting**: express-rate-limit
- **Security**: Helmet, CORS

### SDK (`packages/sdk/`)

- **Language**: TypeScript
- **Blockchain**: viem 2.x
- **ZK Proof**: snarkjs (optional dependency)
- **Target**: Browser + Node.js

### Database Schema

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  plan          Plan     @default(FREE)
  apiKeys       ApiKey[]
  usageRecords  UsageRecord[]
}

model ApiKey {
  id          String   @id @default(cuid())
  userId      String
  key         String   @unique  // bcrypt hash
  keyPrefix   String
  rateLimit   Int      @default(10)
  isActive    Boolean  @default(true)
}

model UsageRecord {
  id          String   @id @default(cuid())
  userId      String
  apiKeyId    String
  endpoint    String
  cost        Float
  timestamp   DateTime @default(now())
}

enum Plan { FREE, PRO, ENTERPRISE }
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh Token
- `GET /api/v1/auth/me` - User info

### API Key
- `GET /api/v1/apikeys` - List
- `POST /api/v1/apikeys` - Create
- `DELETE /api/v1/apikeys/:id` - Revoke

### ZK Proof Verification
- `POST /api/v1/verify` - Verify + activate Session
- `GET /api/v1/session/:address` - Session status

### Billing
- `GET /api/v1/usage/stats` - Usage statistics
- `GET /api/v1/billing/plans` - Plan list
- `POST /api/v1/billing/upgrade` - Upgrade plan

## Deployment Architecture

### Recommended Production Setup

```
Internet
    ↓
[Cloudflare CDN]
    ↓
[Load Balancer]
    ↓
┌─────────────────────┐
│   API Servers       │
│   (Node.js x3)      │
│   + Auto-scaling    │
└─────────────────────┘
    ↓
┌─────────────────────┐
│   PostgreSQL        │
│   (Primary + Read   │
│   Replicas)         │
└─────────────────────┘
    ↓
[Blockchain RPC]
 (Base Mainnet)
```

### Monitoring and Logging

- **Application logs**: Winston → CloudWatch / Datadog
- **API monitoring**: Prometheus + Grafana
- **Error tracking**: Sentry
- **Performance**: New Relic / AppDynamics
- **Security**: AWS WAF + GuardDuty

## Security Measures

### API Layer Security

1. **Authentication**
   - JWT Token (7-day validity)
   - Refresh Token (30-day validity)
   - API Key bcrypt storage

2. **Rate Limiting**
   - Dynamic limits per user plan
   - IP-level limits (DDoS protection)
   - Quota checks (abuse prevention)

3. **Input Validation**
   - Zod schema validation for all inputs
   - Address format validation
   - SQL injection protection (Prisma)

4. **HTTPS**
   - TLS 1.3
   - Forced HTTPS redirect
   - HSTS enabled

### Database Security

- Sensitive field encryption (API Keys)
- Regular backups (daily)
- Read/write separation
- Connection pool management

### Private Key Management

- Verifier keys stored in AWS KMS / Vault
- Environment variable injection (no hardcoding)
- Regular rotation

## Migration Guide

### Migrating from Web Demo

If you previously used `apps/web-demo`:

1. **Register an account**
   ```bash
   curl -X POST https://api.ilal.tech/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"Secure123!"}'
   ```

2. **Create API Key**
   Via Dashboard or API

3. **Update code**
   ```typescript
   // Old approach
   const client = ILALClient.fromProvider({ provider: window.ethereum, chainId: 8453 });
   
   // New approach
   const client = new ILALApiClient({
     apiKey: 'ilal_live_xxxxx',
     apiBaseUrl: 'https://api.ilal.tech',
     chainId: 8453,
   });
   ```

4. **Test**
   Test on the free tier first, then upgrade when ready

## Performance Metrics

### SLA Targets

- **Availability**: 99.9% (Pro) / 99.99% (Enterprise)
- **Response time**: p95 < 500ms
- **Throughput**: 1000 req/s (Enterprise)

### Actual Performance

- **ZK Proof verification**: ~2–3s (including on-chain tx)
- **Session query**: ~50–100ms
- **API Key creation**: ~200ms

## Development Environment Setup

### Running API Service Locally

```bash
# 1. Install dependencies
cd apps/api
pnpm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env for database and blockchain config

# 3. Database migration
pnpm db:migrate

# 4. Start service
pnpm dev
```

### Local Testing

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Register user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

## Troubleshooting

### Common Issues

**Q: API Key validation fails**
- Check `X-API-Key` header format
- Confirm API Key is not revoked
- Check if API Key has expired

**Q: Quota exceeded**
- Check `/api/v1/usage/stats`
- Upgrade plan or wait for next month reset

**Q: Rate limit 429**
- Reduce request frequency
- Check `RateLimit-Reset` response header
- Upgrade plan for higher limits

## Roadmap

### Near Term (Q1 2024)

- ✅ SaaS architecture refactor
- ✅ API Key authentication
- ✅ Usage tracking and billing
- ⏳ Dashboard UI
- ⏳ Stripe payment integration

### Medium Term (Q2–Q3 2024)

- Redis cache layer
- WebSocket real-time notifications
- Multi-region deployment
- Advanced analytics dashboard

### Long Term (Q4 2024+)

- White-label solution
- Custom compliance rules
- Enterprise SSO
- Audit logs

## Contact and Support

- **Documentation**: https://docs.ilal.tech
- **API Docs**: https://api.ilal.tech/docs
- **GitHub**: https://github.com/ilal-xyz/ilal
- **Discord**: https://discord.gg/ilal
- **Email**: 2867755637@qq.com
