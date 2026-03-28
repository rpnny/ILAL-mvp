# ILAL Demo Script

Three versions optimized for different audiences and time budgets.

---

## Prerequisites (all versions)

| Item | Details |
|------|---------|
| Browser | Open [ilal.tech](https://ilal.tech) |
| API Key | Create at ilal.tech → Dashboard → API Keys |
| Terminal | `scripts/demo.sh` ready with `ILAL_API_KEY` set |
| Wallet | MetaMask on Base Sepolia with test mUSD/mTBILL |

---

## Version A: 3-Minute Hackathon Pitch

**Audience:** Hackathon judges, technical reviewers  
**Goal:** Show the ZK magic and compliance enforcement in under 3 minutes

### Flow

1. **Hook (30s)**  
   "Institutions can't use DeFi because every trade needs compliance checks. We built a Uniswap V4 Hook that enforces KYC/AML at the protocol level using Zero-Knowledge Proofs."

2. **Compliance Demo (60s)**  
   - Open Dashboard → **Compliance Demo**  
   - Click "Run Comparison"  
   - Point out: verified address → Session Active → Swap Allowed  
   - Point out: `0xdead...` address → No Session → **Swap Rejected**  
   - "This is real — the Hook checks on-chain session state before every swap."

3. **Live Swap (60s)**  
   - Open Dashboard → **Swap** page  
   - Show the session status indicator (green "Session Active")  
   - Enter 0.01 mUSD → mTBILL, execute swap  
   - Show BaseScan TX link  
   - "97% gas savings vs per-transaction compliance. One ZK proof → 24 hours of trading."

4. **Close (30s)**  
   "364 tests passing, fully deployed on Base Sepolia. API, SDK, and smart contracts — all live."  
   Show homepage stats bar.

---

## Version B: 10-Minute Investor Pitch

**Audience:** VCs, angel investors  
**Goal:** Full technical flow + business narrative

### Flow

1. **Problem (1 min)**  
   "Institutions manage $100T+ in assets but can't touch DeFi. Compliance is the blocker — per-trade KYC checks are too expensive and too slow."

2. **Solution Overview (1 min)**  
   - Show homepage: ILAL = Institutional Liquidity Access Layer  
   - Uniswap V4 Hook architecture  
   - "One ZK proof per session, not per trade. 97% gas reduction."

3. **Live Registration Flow (2 min)**  
   - Terminal: run `scripts/demo.sh`  
   - Walk through: Health check → Onboarding → KYC approval → Session activation  
   - "All automated. Institution registers, gets a ZK session, starts trading."

4. **Compliance Enforcement (2 min)**  
   - Dashboard → **Compliance Demo**  
   - Run comparison: verified vs unregistered  
   - "The Hook atomically reverts non-compliant swaps. Zero trust assumptions."

5. **API Platform (2 min)**  
   - Dashboard → **API Keys**: show key management  
   - Dashboard → **Playground**: send a real API request  
   - Show cURL/JS/Python code snippets  
   - "Institutions integrate via API. No smart contract knowledge needed."

6. **Live DeFi Operation (1 min)**  
   - Dashboard → **Swap**: execute mUSD → mTBILL swap  
   - Show on BaseScan  

7. **Technical Depth (30s)**  
   - "PLONK proofs, EdDSA attestations, Poseidon Merkle trees"  
   - 364 tests, full E2E on Base Sepolia  

8. **Closing (30s)**  
   - "Live testnet. Real transactions. Ready for mainnet."  
   - Show API docs link

---

## Version C: 20-Minute Institutional BD / Deep Dive

**Audience:** Potential institutional clients, fund managers, compliance officers  
**Goal:** Complete technical walkthrough + integration guide

### Flow

1. **Market Context (2 min)**  
   - Regulatory landscape: MiCA, SEC guidance on DeFi  
   - "Institutions need compliant DeFi access. Current solutions are custodial or off-chain."

2. **Architecture Deep Dive (3 min)**  
   - Show `docs/SYSTEM_GUIDE.md` architecture diagram  
   - Uniswap V4 Hooks → ComplianceHook → SessionManager → PlonkVerifier  
   - "Non-custodial. The Hook sits at the pool level. We never touch your assets."

3. **Full Onboarding Demo (3 min)**  
   - Terminal: walk through each `demo.sh` step manually with explanation  
   - Show attestation structure, Merkle tree, ZK circuit inputs  
   - "Your KYC data never goes on-chain. Only the ZK proof."

4. **Compliance Enforcement (2 min)**  
   - Dashboard → **Compliance Demo** side-by-side  
   - Explain `NotCompliant()` revert mechanism  
   - Discuss session expiry, renewal flow  

5. **API Integration (3 min)**  
   - Dashboard → **Playground**: demo each endpoint  
   - Show SDK examples: `packages/sdk/examples/`  
   - Walk through `api-mode/trading-system.ts`  
   - "Your quant systems call our API. We handle compliance. You focus on alpha."

6. **Live Trading (2 min)**  
   - Execute swap via Dashboard  
   - Execute add-liquidity via SDK example  
   - Show both TXs on BaseScan  

7. **Performance & Security (2 min)**  
   - 97% gas reduction with benchmark data  
   - 364 test suite: unit, integration, invariant, simulation, security  
   - Formal verification approach for mainnet  

8. **SDK Deep Dive (2 min)**  
   - `npm install @ilal/sdk`  
   - Show `ILALClient` initialization  
   - Session management, swap, liquidity modules  

9. **Roadmap & Closing (1 min)**  
   - Mainnet deployment timeline  
   - Multi-chain expansion  
   - Compliance framework partnerships  
   - "We're building the compliance layer for institutional DeFi."

---

## Quick Reference: Key URLs

| Resource | URL |
|----------|-----|
| Frontend | https://ilal.tech |
| Dashboard | https://ilal.tech/dashboard |
| Compliance Demo | https://ilal.tech/dashboard/compliance-demo |
| API Playground | https://ilal.tech/dashboard/playground |
| Railway API | https://ilal-mvp-production.up.railway.app |
| API Health | https://ilal-mvp-production.up.railway.app/api/v1/health |
| BaseScan | https://sepolia.basescan.org |
| System Guide | docs/SYSTEM_GUIDE.md |

## Key Talking Points

- **97% gas reduction**: Session-based model vs per-trade compliance
- **Zero-Knowledge**: KYC data never on-chain, only proofs
- **Non-custodial**: Hook architecture, never touches user assets
- **Standards-based**: Uniswap V4 native, EIP-712 permits
- **Test coverage**: 364 tests across contracts, API, SDK, frontend
- **Live deployment**: Real transactions on Base Sepolia testnet
