# ILAL Project Structure

This document explains the organization of the ILAL codebase.

## Directory Structure

```
ilal/
├── .github/                    # GitHub specific files
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   ├── FUNDING.yml            # Funding info
│   └── pull_request_template.md
│
├── bot/                        # Market maker bot
│   ├── src/                   # TypeScript source
│   ├── config.yaml            # Bot configuration
│   └── package.json
│
├── circuits/                   # Zero-knowledge circuits
│   ├── compliance.circom      # Main compliance circuit
│   ├── keys/                  # Proving/verification keys
│   ├── scripts/               # Circuit build scripts
│   └── test-data/             # Test inputs/outputs
│
├── contracts/                  # Smart contracts
│   ├── src/
│   │   ├── core/              # Core protocol contracts
│   │   │   ├── Registry.sol
│   │   │   ├── SessionManager.sol
│   │   │   ├── ComplianceHook.sol
│   │   │   └── VerifiedPoolsPositionManager.sol
│   │   ├── interfaces/        # Contract interfaces
│   │   ├── libraries/         # Shared libraries
│   │   ├── helpers/           # Helper contracts
│   │   └── verifiers/         # ZK verifiers
│   ├── test/                  # Foundry tests
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   ├── invariant/         # Invariant tests
│   │   └── hell/              # Extreme edge case tests
│   ├── script/                # Deployment scripts
│   └── foundry.toml           # Foundry configuration
│
├── deployments/                # Deployment records
│   ├── base-sepolia/          # Base Sepolia addresses
│   └── base-mainnet/          # Base Mainnet (future)
│
├── devops/                     # DevOps configurations
│   └── market-maker/          # Bot deployment configs
│
├── docs/                       # Documentation
│   ├── api/                   # API documentation
│   │   └── CONTRACTS_API.md
│   ├── archives/              # Historical documents
│   ├── deployment/            # Deployment guides
│   │   └── MAINNET_CHECKLIST.md
│   ├── guides/                # Technical guides
│   │   ├── ARCHITECTURE.md
│   │   ├── DEPLOYMENT.md
│   │   └── SWAP_DEBUG_GUIDE.md
│   ├── optimization/          # Performance docs
│   │   └── PERFORMANCE_GUIDE.md
│   ├── outreach/              # Business docs
│   │   ├── ILAL_ONE_PAGER.md
│   │   ├── ILAL_EXECUTIVE_BRIEF.md
│   │   ├── BUG_BOUNTY.md
│   │   └── OUTREACH_GUIDE.md
│   ├── reports/               # Progress reports
│   ├── security/              # Security docs
│   │   └── INTERNAL_AUDIT_REPORT.md
│   ├── testing/               # Test reports
│   │   ├── PROJECT_REPORT.md
│   │   ├── TEST_REPORT.md
│   │   └── TEST_RESULTS_VISUAL.md
│   ├── user-guide/            # End-user documentation
│   │   └── GETTING_STARTED.md
│   ├── COMPETITIVE_ANALYSIS.md
│   ├── GAS_EFFICIENCY_BENCHMARKS.md
│   └── README.md              # Documentation index
│
├── frontend/                   # Next.js frontend
│   ├── app/                   # App router pages
│   │   ├── page.tsx           # Home page
│   │   ├── trade/             # Trading page
│   │   └── liquidity/         # Liquidity page
│   ├── components/            # React components
│   ├── hooks/                 # Custom React hooks
│   │   ├── useVerification.ts
│   │   ├── useSession.ts
│   │   ├── useSwap.ts
│   │   └── useLiquidity.ts
│   ├── lib/                   # Utility libraries
│   │   ├── wagmi.ts           # Wagmi configuration
│   │   ├── contracts.ts       # Contract ABIs/addresses
│   │   └── uniswap-v4.ts      # Uniswap v4 helpers
│   ├── public/                # Static assets
│   ├── tests/                 # Frontend tests
│   │   └── e2e/               # E2E tests
│   └── package.json
│
├── relay/                      # ZK proof relay service
│   ├── src/                   # Relay server code
│   └── Dockerfile
│
├── scripts/                    # Utility scripts
│   ├── deployment/            # Deployment scripts
│   └── initialize-pool.ts     # Pool initialization
│
├── subgraph/                   # The Graph indexer
│   ├── src/                   # Mapping code
│   ├── schema.graphql         # GraphQL schema
│   ├── subgraph.yaml          # Subgraph manifest
│   └── DEPLOY_GUIDE.md
│
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── .gitattributes             # Git attributes
├── CONTRIBUTING.md            # Contribution guide
├── LICENSE                    # MIT License
├── README.md                  # Main README
├── README_CN.md               # Chinese README
└── SECURITY.md                # Security policy
```

---

## Key Files Explained

### Root Level

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `README_CN.md` | Chinese documentation |
| `LICENSE` | MIT License |
| `CONTRIBUTING.md` | How to contribute |
| `SECURITY.md` | Security policy and bug bounty |
| `.env.example` | Environment variables template |
| `.gitignore` | Files to ignore in git |

### Smart Contracts (`contracts/`)

| File | Purpose | LOC |
|------|---------|-----|
| `src/core/Registry.sol` | System configuration & governance | ~200 |
| `src/core/SessionManager.sol` | Session caching logic | ~180 |
| `src/core/ComplianceHook.sol` | Uniswap v4 Hook implementation | ~240 |
| `src/core/VerifiedPoolsPositionManager.sol` | Position management | ~300 |
| `src/verifiers/PlonkVerifierAdapter.sol` | ZK verification adapter | ~150 |

**Total Core Contracts**: ~1,070 LOC

### Frontend (`frontend/`)

| Directory/File | Purpose | Type |
|----------------|---------|------|
| `app/page.tsx` | Home page | React component |
| `app/trade/page.tsx` | Trading interface | React component |
| `app/liquidity/page.tsx` | Liquidity management | React component |
| `hooks/useVerification.ts` | ZK verification flow | React hook |
| `hooks/useSession.ts` | Session status | React hook |
| `hooks/useSwap.ts` | Swap functionality | React hook |
| `lib/contracts.ts` | Contract addresses & ABIs | Config |
| `lib/wagmi.ts` | Wallet connection | Config |

**Total Frontend**: ~5,000 LOC

### Documentation (`docs/`)

| Directory | Contents | Target Audience |
|-----------|----------|-----------------|
| `guides/` | Technical guides | Developers |
| `user-guide/` | End-user docs | Users |
| `api/` | API reference | Developers |
| `outreach/` | Business docs | Investors/Partners |
| `testing/` | Test reports | Technical reviewers |
| `security/` | Security docs | Auditors |
| `reports/` | Progress reports | Internal |

**Total Documentation**: 30+ files, ~15,000 LOC

---

## File Naming Conventions

### Documentation

- `UPPERCASE.md` - Important standalone docs (README, LICENSE)
- `Title_Case.md` - Regular documentation
- `snake_case.md` - Technical specs
- Date suffix - Historical docs (`_20260213.md`)

### Code

**Solidity:**
- `PascalCase.sol` - Contract files
- `IPascalCase.sol` - Interface files

**TypeScript:**
- `camelCase.ts` - Utility files
- `PascalCase.tsx` - React components
- `useCamelCase.ts` - React hooks

### Scripts

- `kebab-case.sh` - Shell scripts
- `kebab-case.ts` - Node scripts

---

## Important Paths

### For Development

```bash
# Smart contracts
contracts/src/core/           # Edit contracts here
contracts/test/               # Add tests here
contracts/script/Deploy.s.sol # Deployment script

# Frontend
frontend/app/                 # Pages
frontend/hooks/               # Business logic
frontend/lib/                 # Utilities

# Circuits
circuits/compliance.circom    # Main circuit
circuits/scripts/build.sh     # Build script
```

### For Documentation

```bash
# Read first
README.md                     # Project overview
docs/guides/ARCHITECTURE.md   # System design
docs/user-guide/GETTING_STARTED.md

# For investors
docs/outreach/ILAL_ONE_PAGER.md
docs/GAS_EFFICIENCY_BENCHMARKS.md

# For auditors
docs/security/INTERNAL_AUDIT_REPORT.md
docs/testing/TEST_REPORT.md
```

### For Deployment

```bash
# Configuration
.env.example                  # Copy to .env
frontend/.env.example         # Copy to .env.local

# Deployment records
deployments/base-sepolia/     # Testnet addresses
docs/guides/DEPLOYMENT.md     # Deployment guide
docs/deployment/MAINNET_CHECKLIST.md
```

---

## Git Workflow

### Branches

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

### Protected Files

These should **NEVER** be committed:

```
.env
.env.*
*.key
*.pem
private_keys/
node_modules/
.DS_Store
```

Ensured by `.gitignore`.

---

## Build Artifacts

### Generated Files (ignored by git)

```
# Smart contracts
contracts/out/                # Compiled contracts
contracts/cache/              # Build cache
contracts/broadcast/          # Deployment logs

# Frontend
frontend/.next/               # Next.js build
frontend/out/                 # Static export

# Circuits
circuits/*.r1cs               # Circuit constraints
circuits/*.wasm               # Circuit WASM
circuits/*.zkey               # Proving keys

# Subgraph
subgraph/build/               # Compiled subgraph
subgraph/generated/           # Generated types
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `foundry.toml` | Foundry (smart contracts) |
| `package.json` | Node.js dependencies |
| `tsconfig.json` | TypeScript compiler |
| `next.config.js` | Next.js framework |
| `tailwind.config.js` | TailwindCSS styles |
| `postcss.config.js` | PostCSS processing |
| `.eslintrc.json` | ESLint rules |

---

## Environment Variables

### Required for Development

```bash
# Smart contracts
PRIVATE_KEY=your_testnet_private_key
BASE_SEPOLIA_RPC=https://sepolia.base.org

# Frontend
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_NETWORK=base-sepolia

# Optional
ETHERSCAN_API_KEY=for_contract_verification
```

See `.env.example` for full list.

---

## Testing Structure

```
contracts/test/
├── unit/                     # Unit tests (isolated)
│   ├── Registry.t.sol
│   ├── SessionManager.t.sol
│   └── ComplianceHook.t.sol
├── integration/              # Integration tests
│   ├── E2E.t.sol
│   └── PlonkIntegration.t.sol
├── invariant/                # Fuzzing tests
│   └── ComplianceInvariant.t.sol
└── hell/                     # Extreme edge cases
    └── ExtremeCases.t.sol

frontend/tests/
└── e2e/                      # End-to-end tests
    ├── swap.spec.ts
    └── liquidity.spec.ts
```

---

## Continuous Integration

(To be added)

```
.github/workflows/
├── test.yml                  # Run tests on PR
├── deploy-testnet.yml        # Auto-deploy to testnet
└── security.yml              # Security scans
```

---

## Dependencies

### Smart Contracts

- **Foundry** - Development framework
- **OpenZeppelin** - Security libraries
- **Uniswap v4** - Core DEX

### Frontend

- **Next.js 14** - React framework
- **Wagmi v2** - Wallet connection
- **Viem** - Ethereum library
- **RainbowKit** - Wallet UI

### Circuits

- **Circom 2.2.3** - Circuit compiler
- **SnarkJS** - Proof generation

---

## Useful Commands

```bash
# Smart contracts
forge build                   # Compile
forge test                    # Run tests
forge test --gas-report       # Gas analysis
forge coverage                # Coverage report

# Frontend
npm run dev                   # Dev server
npm run build                 # Production build
npm test                      # Run tests
npm run lint                  # Lint code

# Circuits
cd circuits
npm run build                 # Compile circuit
npm run prove                 # Generate proof

# Subgraph
graph codegen                 # Generate types
graph build                   # Build subgraph
graph deploy                  # Deploy to The Graph
```

---

## Questions?

- 📖 See [docs/README.md](./README.md) for full documentation
- 💬 Open an [issue](../../issues) for questions
- 📧 Email: 2867755637@qq.com

---

**Last Updated**: February 14, 2026  
**Maintainer**: ILAL Team
