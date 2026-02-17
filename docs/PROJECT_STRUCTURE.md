# ILAL Project File Structure

**Last Updated**: 2026-02-16

---

## 📁 Project Root

### Core Documents (kept in root)

```
/
├── README.md                    # Main project documentation
├── START_HERE.md                # Quick start guide
├── CONTRIBUTING.md              # Contribution guidelines
├── SECURITY.md                  # Security policy
└── LICENSE                      # Open source license
```

### Configuration Files

```
/
├── .env                         # Environment variables (not committed)
├── .env.example                 # Environment template
├── .env.production.example      # Production environment template
├── package.json                 # Root package.json
├── pnpm-workspace.yaml          # pnpm workspace config
└── tsconfig.base.json           # TypeScript base config
```

---

## 📚 Documentation Directory (docs/)

### Documentation Structure

```
docs/
├── INDEX.md                     # Documentation index
├── PROJECT_ORGANIZATION.md      # Project organization notes
├── PROJECT_STRUCTURE.md         # Project structure guide (this file)
├── REFACTOR_SUMMARY.md          # Refactoring summary
├── STATUS.md                    # Project status
│
├── archives/                    # Historical document archives
│   └── chinese-legacy-docs/    # Legacy Chinese documentation
│
├── deployment/                  # Deployment documentation
│   └── DEPLOYMENT_READY.md      # Deployment readiness notes
│
├── frontend/                    # Frontend documentation
│   ├── FRONTEND_READY.md        # Frontend readiness status
│   ├── FRONTEND_STATUS.md       # Frontend status
│   └── FRONTEND_STRATEGY.md     # Frontend strategy
│
├── guides/                      # Usage guides
│   ├── ARCHITECTURE.md          # Architecture overview
│   ├── DEPLOYMENT.md            # Deployment guide
│   ├── saas/                    # SaaS-related guides
│   └── setup/                   # Setup guides
│
├── reports/                     # Various reports
│   ├── performance/             # Performance analysis reports
│   │   └── PERFORMANCE_COST_ANALYSIS.md
│   ├── summaries/               # Summary reports
│   │   └── CUSTOMER_EXPERIENCE_SUMMARY.md
│   ├── REPORTS_INDEX.md         # Reports index
│   └── REPORTS_INDEX_EN.md      # Reports index (English)
│
├── testing/                     # Test documentation
│   ├── reports-2026-02-16/      # 2026-02-16 test reports
│   │   ├── BIG_DEMO_REPORT_2026-02-16.md
│   │   ├── COMPLETE_TEST_SUMMARY_2026-02-16.md
│   │   ├── TEST_SUCCESS_SUMMARY.md
│   │   ├── TRUTHFUL_MOCK_THEATER_REPORT.md
│   │   └── TASKS_COMPLETED_2026-02-16.md
│   ├── E2E_TEST_RESULTS_2026-02-16.md
│   ├── FUNCTIONAL_TEST_CHECKLIST.md
│   ├── FUNCTIONAL_TEST_PLAN.md
│   └── FUNCTIONAL_TEST_RESULTS_2026-02-16.md
│
├── outreach/                    # Outreach materials
│   ├── COMPETITIVE_ANALYSIS_CN.md
│   └── COMPETITIVE_ONEPAGER_EN.md
│
└── user-guide/                  # User guides
    └── (to be added)
```

---

## 🗂️ Code Directories

### Monorepo Structure

```
/
├── packages/                    # Core packages
│   ├── sdk/                     # TypeScript SDK
│   ├── contracts/               # Solidity smart contracts
│   └── circuits/                # ZK circuits
│
├── apps/                        # Applications
│   ├── web-demo/                # Web demo application
│   └── api/                     # API service
│
└── scripts/                     # Script utilities
    ├── deployment/              # Deployment scripts
    │   ├── complete-deployment.sh
    │   ├── deploy-all.sh
    │   └── deploy-subgraph-interactive.sh
    ├── setup/                   # Setup scripts
    │   ├── install-postgresql.sh
    │   ├── install-with-password.sh
    │   ├── setup-bot-interactive.sh
    │   └── setup-for-test.sh
    ├── system-test/             # System test scripts
    │   ├── mock-theater.ts
    │   ├── check-balances.ts
    │   └── analyze-performance.ts
    ├── quick-start.sh           # Quick start
    └── test-all-features.sh     # Full feature test
```

---

## 🔧 Scripts Directory

### deployment/ - Deployment Scripts

| File | Purpose |
|------|---------|
| `complete-deployment.sh` | Complete deployment workflow |
| `deploy-all.sh` | Deploy all components |
| `deploy-subgraph-interactive.sh` | Interactive subgraph deployment |

### setup/ - Setup Scripts

| File | Purpose |
|------|---------|
| `install-postgresql.sh` | Install PostgreSQL |
| `install-with-password.sh` | Install with password |
| `setup-bot-interactive.sh` | Set up Bot |
| `setup-for-test.sh` | Test environment setup |

### system-test/ - System Tests

| File | Purpose |
|------|---------|
| `mock-theater.ts` | Mock Theater demo script |
| `check-balances.ts` | Check account balances |
| `analyze-performance.ts` | Performance analysis |

### Root-Level Scripts

| File | Purpose |
|------|---------|
| `quick-start.sh` | Quick start project |
| `test-all-features.sh` | Run all feature tests |

---

## 📦 Packages

### packages/sdk

TypeScript SDK providing interfaces for interacting with the ILAL protocol.

```
packages/sdk/
├── src/
│   ├── client.ts              # Main client
│   ├── modules/               # Feature modules
│   │   ├── session.ts         # Session management
│   │   ├── swap.ts            # Swap trading
│   │   ├── liquidity.ts       # Liquidity management
│   │   ├── zkproof.ts         # ZK proofs
│   │   └── eas.ts             # EAS integration
│   └── utils/                 # Utilities
├── tests/                     # Unit tests (29 tests)
└── README.md                  # SDK documentation
```

### packages/contracts

Solidity smart contracts built on Uniswap V4 Hooks.

```
packages/contracts/
├── src/
│   ├── core/                  # Core contracts
│   │   ├── ComplianceHook.sol
│   │   ├── SessionManager.sol
│   │   ├── Registry.sol
│   │   └── PlonkVerifier.sol
│   ├── helpers/               # Helper contracts
│   └── interfaces/            # Interface definitions
├── test/                      # Tests (57 tests passing)
├── script/                    # Deployment scripts
└── deployments/               # Deployment records
    └── 84532-plonk.json      # Base Sepolia deployment
```

### packages/circuits

ZK circuits using Circom and SnarkJS.

```
packages/circuits/
├── compliance.circom          # Compliance verification circuit
├── scripts/                   # Compilation and proving scripts
└── keys/                      # Verification keys
```

---

## 🌐 Applications

### apps/web-demo

Next.js web demo application.

```
apps/web-demo/
├── app/                       # Next.js App Router
│   ├── page.tsx               # Home page
│   └── layout.tsx             # Layout
├── components/                # React components
├── hooks/                     # Custom hooks
└── lib/                       # Utilities
```

### apps/api

Express.js API service (SaaS backend).

```
apps/api/
├── src/
│   ├── routes/                # API routes
│   ├── services/              # Business logic
│   ├── middleware/            # Middleware
│   └── prisma/                # Database ORM
└── README.md                  # API documentation
```

---

## 🗄️ Other Directories

### bot/
Discord/Telegram Bot code.

### subgraph/
The Graph Subgraph definitions and deployment configuration.

### deployments/
Deployment configs and records.

### devops/
DevOps configuration (CI/CD, Docker, etc.).

### landing/
Landing page and API portal website.

### frontend/
Legacy frontend (migrated to apps/web-demo).

---

## 📋 File Naming Conventions

### Documentation Files
- Use **UPPERCASE + underscores**: `PROJECT_STRUCTURE.md`
- Date format: `YYYY-MM-DD`, e.g. `REPORT_2026-02-16.md`

### Code Files
- TypeScript/JavaScript: **lowercase + hyphens**, e.g. `mock-theater.ts`
- React components: **PascalCase**, e.g. `SessionStatus.tsx`
- Solidity: **PascalCase**, e.g. `ComplianceHook.sol`

### Script Files
- Shell scripts: **lowercase + hyphens + .sh**, e.g. `deploy-all.sh`
- TypeScript scripts: **lowercase + hyphens + .ts**, e.g. `check-balances.ts`

---

## 🔍 Finding Files

### Quick Reference Index

| Need | File Location |
|------|---------------|
| Quick Start | `START_HERE.md` |
| Architecture | `docs/guides/ARCHITECTURE.md` |
| Deployment Guide | `docs/guides/DEPLOYMENT.md` |
| Test Reports | `docs/testing/` |
| Performance Analysis | `docs/reports/performance/` |
| SDK Documentation | `packages/sdk/README.md` |
| API Documentation | `apps/api/README.md` |

### Useful Commands

```bash
# View all docs
find docs/ -name "*.md" -type f

# View test reports
ls docs/testing/reports-2026-02-16/

# Run quick start
./scripts/quick-start.sh

# Run full test suite
./scripts/test-all-features.sh
```

---

## 🎯 File Organization Principles

### 1. **Keep Root Directory Clean**
   - Only core documents (README, LICENSE, etc.)
   - Config files in root
   - Other docs go to docs/

### 2. **Organize Docs by Type**
   - Test reports → `docs/testing/`
   - Performance analysis → `docs/reports/performance/`
   - User guides → `docs/user-guide/`
   - Deployment docs → `docs/deployment/`

### 3. **Organize Scripts by Function**
   - Deployment scripts → `scripts/deployment/`
   - Setup scripts → `scripts/setup/`
   - Test scripts → `scripts/system-test/`

### 4. **Code in Monorepo Layout**
   - Reusable packages → `packages/`
   - Applications → `apps/`
   - Utilities → `scripts/`

---

**Document Version**: v1.0  
**Created**: 2026-02-16  
**Maintainer**: ILAL Team
