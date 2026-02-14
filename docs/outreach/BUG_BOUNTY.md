# 🐛 ILAL Bug Bounty Program

**Status**: 🟢 Active  
**Total Pool**: $2,100 USD  
**Duration**: March 1 - June 30, 2026

---

## 💰 Reward Tiers

| Severity | Description | Reward |
|----------|-------------|--------|
| 🔴 **Critical** | Funds can be stolen or locked | **$1,000** |
| 🟠 **High** | Access control bypass, reentrancy | **$600** |
| 🟡 **Medium** | Logic errors, Gas griefing | **$300** |
| 🟢 **Low** | Code quality, optimizations | **$200** |

---

## 📋 Scope

### ✅ In Scope

**Smart Contracts:**
- `contracts/src/core/Registry.sol`
- `contracts/src/core/SessionManager.sol`
- `contracts/src/core/ComplianceHook.sol`
- `contracts/src/core/VerifiedPoolsPositionManager.sol`
- `contracts/src/verifiers/PlonkVerifierAdapter.sol`

**Focus Areas:**
1. Access control and permissions
2. Session management logic
3. PLONK verification integration
4. UUPS upgradeability safety
5. Uniswap v4 Hook integration

### ❌ Out of Scope

- Third-party contracts (OpenZeppelin, Uniswap v4)
- Frontend vulnerabilities
- Known issues (see below)
- Theoretical attacks without PoC
- Social engineering

---

## 🚫 Known Issues

These are NOT eligible for bounties:

1. **MockVerifier** is intentionally simple (testnet only)
2. **Session TTL is global** - by design
3. **Relay service dependency** - acknowledged limitation
4. **Gas costs** - PLONK verification is intentionally expensive

See [docs/guides/ARCHITECTURE.md#known-limitations](../guides/ARCHITECTURE.md) for full list.

---

## 📤 How to Submit

### Step 1: Prepare Report

Include:
1. **Vulnerability description**
2. **Impact assessment** (Critical/High/Medium/Low)
3. **Step-by-step reproduction**
4. **Proof of Concept** (code/transaction)
5. **Suggested fix** (optional but appreciated)

### Step 2: Submit Privately

**DO NOT** publicly disclose before we've fixed it!

**Email**: 2867755637@qq.com  
**Subject**: `[BUG BOUNTY] Brief description`

Or submit via:
- Twitter DM: @[your_handle]
- Discord: [coming soon]

### Step 3: Wait for Response

- **Initial response**: Within 24 hours
- **Severity assessment**: Within 48 hours
- **Fix deployed**: 7-14 days
- **Payment**: 7 days after fix deployed

---

## 📝 Submission Template

```markdown
# Bug Bounty Submission

## Summary
[One sentence description]

## Severity
[Critical / High / Medium / Low]

## Description
[Detailed explanation of the vulnerability]

## Impact
[What can an attacker do? How much damage?]

## Reproduction Steps
1. Step 1
2. Step 2
3. ...

## Proof of Concept
```solidity
// PoC code or transaction link
```

## Suggested Fix
[Your recommendation for fixing this]

## Additional Info
[Any other relevant information]
```

---

## 🎯 Severity Guidelines

### 🔴 Critical

**Definition**: Direct theft or permanent loss of funds

**Examples**:
- Steal tokens from any user
- Drain liquidity pools
- Bypass session checks completely
- Permanent contract bricking

**Recent similar vulnerabilities**:
- Poly Network hack ($600M)
- Ronin Bridge exploit ($625M)

### 🟠 High

**Definition**: Unauthorized actions or significant fund risk

**Examples**:
- Access control bypass
- Reentrancy attacks
- Incorrect session validation
- Upgrade logic vulnerabilities

**Recent similar vulnerabilities**:
- Cream Finance reentrancy
- Compound governance takeover

### 🟡 Medium

**Definition**: Broken functionality or griefing attacks

**Examples**:
- Session griefing (forcing expiry)
- Gas griefing in hooks
- Incorrect event emissions
- Logic errors in non-critical functions

### 🟢 Low

**Definition**: Code quality and optimization

**Examples**:
- Gas optimizations
- Incorrect error messages
- Missing input validations
- Documentation errors

---

## ⚖️ Rules

### Eligible for Rewards

✅ First reporter of a valid vulnerability  
✅ Vulnerabilities with clear impact  
✅ Include working Proof of Concept  
✅ Follow responsible disclosure  

### NOT Eligible

❌ Duplicate submissions  
❌ Known issues  
❌ Theoretical attacks without PoC  
❌ Public disclosure before fix  
❌ Attacks on testnet only  
❌ Social engineering  

---

## 💳 Payment

### Methods

- USDC (Base mainnet)
- ETH (Base mainnet)
- Bank transfer (for large amounts)

### Timeline

1. **Submission** → Initial response (24h)
2. **Assessment** → Severity confirmed (48h)
3. **Fix** → Deployed to testnet (7 days)
4. **Verification** → Fix tested (3 days)
5. **Payment** → Bounty sent (7 days)

**Total**: ~2-3 weeks from submission to payment

---

## 📊 Hall of Fame

| Researcher | Vulnerabilities Found | Rewards Earned |
|------------|----------------------|----------------|
| [Coming soon] | - | - |

---

## 🤝 Responsible Disclosure

We commit to:
- ✅ Respond within 24 hours
- ✅ Credit researchers (with permission)
- ✅ Pay bounties within 7 days of fix
- ✅ Never take legal action against good-faith researchers

We ask you to:
- ✅ Report privately first
- ✅ Give us time to fix (7-14 days)
- ✅ Don't exploit vulnerabilities
- ✅ Don't attack infrastructure

---

## 📞 Contact

- **Email**: 2867755637@qq.com (preferred)
- **Twitter**: @[your_handle]
- **Discord**: [coming soon]

---

## 🔄 Program Updates

- **March 1, 2026**: Program launched
- **June 30, 2026**: Program ends (or when pool exhausted)

Follow [@your_handle](https://twitter.com/your_handle) for updates!

---

## ⚖️ Legal

- This program is subject to change
- Final severity assessment by ILAL team
- Payment at our discretion
- Subject to local laws

---

**Current Status:**  
💰 Pool Remaining: $2,100  
🐛 Bugs Found: 0  
💸 Paid Out: $0  

---

*Let's make ILAL secure together!* 🛡️
