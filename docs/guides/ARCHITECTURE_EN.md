# ILAL Architecture Documentation

## System Overview

ILAL (Institutional Liquidity Access Layer) is a compliance liquidity solution built on Uniswap v4 Hooks, using zero-knowledge proof technology to verify institutional user identities while preserving privacy.

```
┌─────────────────────────────────────────────────────────────┐
│                         User Layer                           │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│  │ Traders │    │   LPs   │    │Governance│                 │
│  └────┬────┘    └────┬────┘    └────┬────┘                 │
└───────┼──────────────┼──────────────┼───────────────────────┘
        │              │              │
┌───────▼──────────────▼──────────────▼───────────────────────┐
│                    Frontend DApp (Next.js)                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │Verification UI│  │Trading Interface│ │LP Management │   │
│  │(ZK Proof Gen) │  │ (Swap/Add)    │  │ (Positions)  │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
        │                      │                      │
        │                      │                      │
┌───────▼──────────────────────▼──────────────────────▼───────┐
│                      Base Blockchain                         │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Core Contract Layer                        │ │
│  │                                                          │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│  │  │ Registry │  │ Session  │  │ Verifier │             │ │
│  │  │ (UUPS)   │  │ Manager  │  │ (PLONK)  │             │ │
│  │  │          │  │ (UUPS)   │  │          │             │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘             │ │
│  │       │             │             │                    │ │
│  │       └─────────────┼─────────────┘                    │ │
│  │                     │                                  │ │
│  │           ┌─────────▼─────────┐                        │ │
│  │           │  ComplianceHook   │                        │ │
│  │           │ (EIP-712 Verify)  │                        │ │
│  │           └─────────┬─────────┘                        │ │
│  │                     │                                  │ │
│  └─────────────────────┼──────────────────────────────────┘ │
│                        │                                     │
│  ┌─────────────────────▼──────────────────────────────────┐ │
│  │              Uniswap v4 Layer                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│  │  │PoolManager│ │ Universal │ │ Position │             │ │
│  │  │           │ │ Router    │ │ Manager  │             │ │
│  │  └──────────┘  └──────────┘  └──────────┘             │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
        │                      │                      │
        │                      │                      │
┌───────▼──────────────────────▼──────────────────────▼───────┐
│                   The Graph Subgraph                         │
│  Index Events → Aggregate Stats → Provide GraphQL API       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Registry (Configuration Registry)

**Function**: System configuration center

- Manage trusted Issuers (Coinbase, Circle, etc.)
- Maintain router whitelist (Universal Router)
- Set global parameters (Session TTL)
- Emergency pause switch

**Technical Features**:
- UUPS proxy pattern (upgradeable)
- Ownable access control (multisig governance)
- Complete event logging

**Key Interfaces**:
```solidity
function registerIssuer(bytes32 issuerId, address attester, address verifier);
function approveRouter(address router, bool approved);
function setEmergencyPause(bool paused);
```

### 2. SessionManager (Session Manager)

**Function**: User verification state caching

- Store user verification expiry time (24h TTL)
- Batch query support (gas optimization)
- Manual session termination (user-initiated revocation)

**Technical Features**:
- UUPS proxy pattern (upgradeable)
- AccessControl role management (VERIFIER_ROLE)
- Reentrancy protection

**Key Interfaces**:
```solidity
function startSession(address user, uint256 expiry);
function isSessionActive(address user) returns (bool);
function endSession(address user);
```

### 3. Verifier (ZK Verifier)

**Function**: On-chain ZK proof verification

- PLONK algorithm verification
- Public input validation (user address, Merkle root, Issuer public key)

**Technical Features**:
- Solidity verifier exported from SnarkJS
- Universal Setup (no trusted setup ceremony)
- Gas optimized (~300-400k gas)

**Key Interfaces**:
```solidity
function verifyComplianceProof(bytes calldata proof, uint256[] calldata publicInputs) returns (bool);
```

### 4. ComplianceHook (Compliance Hook)

**Function**: Uniswap v4 access control

- Intercepts `beforeSwap`, `beforeAddLiquidity`, `beforeRemoveLiquidity`
- Verifies user Session activation status
- EIP-712 signature verification (hookData)

**Technical Features**:
- Inherits `EIP712Verifier`
- Supports three identity resolution modes:
  1. Full EIP-712 signature (frontend DApp)
  2. Empty hookData (EOA direct call)
  3. Address only (whitelisted routers)
- Nonce for replay attack prevention

**Key Interfaces**:
```solidity
function beforeSwap(address sender, bytes calldata hookData) returns (bool);
function _resolveUser(address sender, bytes calldata hookData) internal returns (address);
```

### 5. VerifiedPoolsPositionManager (Restricted Position Manager)

**Function**: Prevent LP NFT transfers

- Overrides `safeTransferFrom` / `transferFrom`, always reverts
- Only allows liquidity management through DApp
- Ensures all LPs are verified

**Design Tradeoffs**:
- ✅ Ensures compliance
- ⚠️ Sacrifices composability
- ⚠️ Limited user experience

## Data Flow

### Verification Flow

```
User → Frontend DApp → Coinbase → EAS → Frontend
  1. Connect wallet
  2. Obtain Coinbase Verification attestation
  3. Download ZK circuit files (.wasm, .zkey)
  4. Generate ZK Proof in Web Worker (5-30s)
  5. Call Verifier.verifyComplianceProof(proof, publicInputs)
  6. Call SessionManager.startSession(user, expiry)
  7. Return success, cache Session state
```

### Swap Flow

```
User → Frontend DApp → Universal Router → ComplianceHook → Uniswap v4
  1. User inputs swap parameters
  2. Frontend checks if Session is active
  3. Generate EIP-712 signature (SwapPermit)
  4. Construct hookData = abi.encode(user, deadline, nonce, signature)
  5. Call UniversalRouter.swap(..., hookData)
  6. ComplianceHook.beforeSwap() triggered
  7. Verify hookData signature
  8. Check SessionManager.isSessionActive(user)
  9. Allow transaction to proceed → PoolManager executes swap
```

## Security Mechanisms

### 1. Identity Verification

- **ZK Proofs**: Privacy-preserving, no on-chain KYC data exposure
- **EIP-712 Signatures**: Prevent frontend hookData forgery
- **Nonce**: Prevent replay attacks

### 2. Access Control

- **Session TTL**: 24-hour automatic expiry
- **Manual Revocation**: User-initiated session termination
- **Emergency Pause**: Governance can globally halt system

### 3. Contract Upgrades

- **UUPS Proxy**: Registry and SessionManager are upgradeable
- **Timelock**: Recommended 48h timelock usage
- **Immutable Contracts**: Hook and Verifier are non-upgradeable (security first)

### 4. Audit Recommendations

| Contract | Risk Level | Audit Focus |
|---------|-----------|-------------|
| Registry | High | Access control, upgrade logic |
| SessionManager | High | Session management, role permissions |
| ComplianceHook | Critical | Signature verification, reentrancy |
| Verifier | Medium | ZK proof verification correctness |
| PositionManager | Medium | Transfer restriction bypass |

## Performance Optimization

### Gas Optimization

| Operation | Gas Cost | Optimization |
|-----------|----------|--------------|
| ZK Verification | ~350k | Optimized (PLONK) |
| Session Check | ~5k | Batch queries |
| EIP-712 Verification | <10k | Minimal signature verification |
| Swap (with Hook) | ~200k | No additional optimization space |

### Frontend Optimization

- **Web Worker**: ZK proof generation doesn't block UI
- **File Caching**: `.zkey` files use IndexedDB
- **Batch Queries**: Single call fetches multiple user states

## Deployment Architecture

### Testnet (Base Sepolia)

```
Registry Proxy: 0x461e57114c2DeE76dEC717eD8B2f4fBe62AB5Faf
SessionManager Proxy: 0xaa66F34d10F60C2E8E63cA8DD6E1CAc7D2c406e9
MockVerifier: 0x3Aa3f5766bfa2010070D93a27edA14A2ed38e3cC
ComplianceHook: 0x00000000DA15E8FCA4dFf7aF93aBa7030000002c
```

### Mainnet (Base Mainnet)

```
Registry Proxy: TBD
SessionManager Proxy: TBD
PlonkVerifier: TBD
ComplianceHook: TBD
Governance Multisig: TBD (3/5 recommended)
```

## Monitoring Metrics

### Key Performance Indicators (KPIs)

- **Total Verified Users**: Cumulative KYC-passed users
- **Active Sessions**: Current valid sessions
- **Daily Volume**: Total transaction value through Hook
- **TVL**: Total value locked in compliant pools

### Alert Thresholds

- Session expiry rate > 20%
- Hook rejection rate > 5%
- Gas price > 100 Gwei
- Emergency pause triggered

## Upgrade Roadmap

### Phase 1 (Current)
- ✅ Core contract implementation
- ✅ ZK circuit framework
- ✅ Frontend DApp

### Phase 2 (Q2 2026)
- 🔄 Real PLONK Verifier integration
- 🔄 Multi-Issuer support (Circle, Polygon ID)
- 🔄 Batch Session management optimization

### Phase 3 (Q3 2026)
- 📅 Cross-chain support (Optimism, Arbitrum)
- 📅 Advanced compliance rules (country blocklists)
- 📅 Layer 2 ZK Rollup integration

## References

- [Uniswap v4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [PLONK Algorithm Paper](https://eprint.iacr.org/2019/953.pdf)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [Coinbase Verifications](https://www.coinbase.com/onchain-verify)
- [Base Blockchain](https://base.org)
