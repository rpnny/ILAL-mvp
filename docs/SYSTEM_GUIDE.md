# ILAL 系统使用指南

> 最后更新：2026-03-28  
> 网络：Base Sepolia 测试网  
> 前端：https://ilal.tech  
> API：https://ilal-mvp-production.up.railway.app

---

## 目录

1. [系统概述](#1-系统概述)
2. [当前运行状态](#2-当前运行状态)
3. [系统架构](#3-系统架构)
4. [完整使用流程](#4-完整使用流程)
5. [API 接口详细说明](#5-api-接口详细说明)
6. [实测数据](#6-实测数据)
7. [链上合约地址](#7-链上合约地址)
8. [常见问题](#8-常见问题)

---

## 1. 系统概述

ILAL（Institutional Liquidity Access Layer）是一个构建在 Uniswap v4 之上的合规基础设施。它的核心思想是：**机构只需完成一次 ZK 身份验证，就能在 24 小时内不限次数地进行合规交易，无需每笔交易都走合规流程。**

### 解决的问题

传统 DeFi 的合规方案通常是"每笔交易都检查"，成本高、延迟大。ILAL 将合规逻辑从每次 swap 移到**会话层**：

- 机构提交一次零知识证明（ZK Proof），证明其满足 KYC/AML 要求
- API 验证后，调用链上合约为该钱包地址激活一个 24 小时的"合规会话"
- 此后的每次 swap，`ComplianceHook` 只需读取一个链上状态（单次 SLOAD，约 15,000 gas）
- 未激活会话或会话过期的地址，swap 在数学层面被拒绝，无需任何人工干预

### 技术栈

| 层级 | 技术 |
|------|------|
| 零知识证明 | Circom 2.0 + PLONK（19,763 约束） |
| 签名方案 | EdDSA-Poseidon（circomlibjs） |
| 智能合约 | Solidity + Uniswap v4 Hooks（Foundry） |
| 链上网络 | Base Sepolia（测试网） |
| API 后端 | Node.js + Express + Prisma + PostgreSQL |
| 前端 | Next.js 14（App Router） |
| 部署 | Vercel（前端） + Railway（API 后端） |
| 数据库 | Neon PostgreSQL（两端共用） |

---

## 2. 当前运行状态

### 功能状态总览

| 功能模块 | 状态 | 说明 |
|----------|------|------|
| 用户注册 / 登录 | ✅ 完整可用 | JWT 认证，Neon PostgreSQL |
| API Key 管理 | ✅ 完整可用 | 创建、列表、撤销 |
| 机构入驻（Onboarding） | ✅ 完整可用 | EdDSA-Poseidon 签名 Attestation |
| ZK Proof 生成 | ✅ 完整可用 | 本地 snarkjs PLONK，~15 秒 |
| ZK 验证 + 链上会话激活 | ✅ 完整可用 | PlonkVerifierAdapter v2 |
| Swap TX 构建 | ✅ 完整可用 | 返回未签名 calldata，用户自签 |
| Add Liquidity TX 构建 | ✅ 完整可用 | 返回未签名 calldata，用户自签 |
| 链上真实 Swap | ✅ 完整可用 | Base Sepolia，EIP-712 签名 |
| 使用量追踪 | 🚧 占位符 | 返回固定零值，未实现 |
| 计费 / 配额执行 | 🚧 占位符 | 计划已定义，无支付逻辑 |
| 做市 Bot | 🚧 原型 | `apps/bot` 目录，未部署 |
| 主网部署 | ❌ 未开始 | 待安全审计后进行 |

### 在线服务

```
前端仪表板：  https://ilal.tech
API 后端：    https://ilal-mvp-production.up.railway.app
健康检查：    https://ilal-mvp-production.up.railway.app/api/v1/health
```

当前健康检查响应：

```json
{
  "status": "ok",
  "service": "ILAL API",
  "database": "connected",
  "blockchain": {
    "connected": true,
    "relay": "0x1b869CaC69Df23Ad9D727932496AEb3605538c8D",
    "network": "base-sepolia",
    "latestBlock": "39446089"
  }
}
```

---

## 3. 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                          机构客户端                              │
│                   (SDK / curl / 自定义集成)                       │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │  HTTPS REST API
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ILAL API 后端                               │
│              (Railway · Node.js · Express)                       │
│                                                                  │
│  /auth          用户注册、登录、JWT 管理                          │
│  /apikeys       API Key 创建、列举、撤销                          │
│  /onboarding    机构注册、Attestation 签名、Merkle Tree 管理      │
│  /verify        ZK Proof 验证 + 链上会话激活（Relayer 模式）      │
│  /defi/swap     构建未签名 Swap 交易                              │
│  /defi/liquidity 构建未签名 Add Liquidity 交易                   │
│  /session/:addr  查询会话状态                                     │
└────────────┬────────────────────────────┬────────────────────────┘
             │                            │
     Prisma ORM                    viem (链上调用)
             │                            │
             ▼                            ▼
┌────────────────────┐      ┌─────────────────────────────────────┐
│   Neon PostgreSQL   │      │          Base Sepolia 测试网         │
│                     │      │                                     │
│  · users            │      │  ComplianceHook    0xe633...a80     │
│  · api_keys         │      │  SessionManager    0x53fA...e2      │
│  · institutions     │      │  Registry          0x4C4e...BD      │
│  · attestations     │      │  SimpleSwapRouter  0xd46D...91      │
└────────────────────┘      │  PlonkVerifierAdapter 0x8e09...60   │
                             │  PositionManager   0x6925...32      │
                             └─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    前端仪表板 (ilal.tech)                         │
│                  (Vercel · Next.js 14)                           │
│                                                                  │
│  · 注册 / 登录界面                                               │
│  · API Key 管理面板                                              │
│  · 使用量 / 计费展示（占位符）                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 会话激活流程详解

```
机构
 │
 │ 1. POST /onboarding/register
 │    { walletAddress, countryCode }
 │
 ▼
ILAL API ──── Poseidon 哈希 walletAddress ──── 插入 Merkle Tree ──── 返回 leafIndex
 │
 │ 2. GET /onboarding/attestation/:address
 │    返回 { sigR8x, sigR8y, sigS, issuerAx, issuerAy,
 │            merkleRoot, merkleProof, merkleIndex, ... }
 │
 ▼
机构本地
 │
 │ 3. 本地运行 snarkjs.plonk.fullProve(circuitInput, wasm, zkey)
 │    生成 proof + publicSignals（约 15 秒）
 │
 ▼
 │ 4. POST /verify
 │    { userAddress, proof, publicSignals }
 │
 ▼
ILAL API
 │
 │ a. 链下验证 proof（snarkjs，8ms）
 │ b. 验证 publicSignals 与链上期望值一致
 │ c. Relayer 钱包调用 SessionManager.startSession(userAddress)
 │
 ▼
Base Sepolia
 │
 │ SessionManager 记录：sessions[userAddress] = block.timestamp + 86400
 │
 ▼
 │ 5. 后续每次 swap
 │    ComplianceHook.beforeSwap() → isSessionActive(userAddress) → 单次 SLOAD
 │    会话有效 → 允许交易
 │    会话无效 → revert NotCompliant()
```

---

## 4. 完整使用流程

### 方式一：通过前端仪表板（推荐新用户）

1. 访问 https://ilal.tech
2. 点击 **Register**，填写邮箱、密码、机构名称
3. 登录后进入 **API Keys** 面板，点击 **Create New API Key**
4. 保存显示的 API Key（**仅显示一次**）
5. 使用该 Key 调用 API

### 方式二：通过 API 直接集成

以下所有示例使用 `curl`，API 地址：`https://ilal-mvp-production.up.railway.app`

---

#### Step 1 — 注册账号

```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "fund@institution.com",
    "password": "SecurePass123!",
    "name": "Hedge Fund Alpha"
  }'
```

响应：

```json
{
  "message": "Registration successful",
  "user": { "id": "...", "email": "fund@institution.com", "plan": "FREE" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

---

#### Step 2 — 创建 API Key

```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/apikeys \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Production Key" }'
```

响应：

```json
{
  "apiKey": "ilal_live_f4cab013e24c16eb6a68aedfee4add4c01ee41ca371cebd2",
  "name": "Production Key",
  "permissions": "verify,session",
  "warning": "Save this key now — it will not be shown again."
}
```

> **重要：** API Key 只在创建时返回明文，之后无法再次查看，请立即保存。

---

#### Step 3 — 机构入驻（Onboarding）

```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/onboarding/register \
  -H "x-api-key: ilal_live_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hedge Fund Alpha",
    "walletAddress": "0xYourWalletAddress",
    "countryCode": 840
  }'
```

响应：

```json
{
  "success": true,
  "status": "approved",
  "merkleRoot": "12345...",
  "merkleIndex": 0,
  "message": "Institution registered and added to compliance Merkle tree."
}
```

---

#### Step 4 — 获取 Attestation

```bash
curl https://ilal-mvp-production.up.railway.app/api/v1/onboarding/attestation/0xYourWalletAddress \
  -H "x-api-key: ilal_live_<your_key>"
```

响应（用于生成 ZK Proof 的输入）：

```json
{
  "attestation": {
    "userAddress": "0x...",
    "issuerAx": "8369848163...",
    "issuerAy": "1097400862...",
    "sigR8x": "...",
    "sigR8y": "...",
    "sigS": "...",
    "kycStatus": "1",
    "countryCode": "840",
    "timestamp": "1774660000",
    "merkleRoot": "...",
    "merkleProof": ["...", "..."],
    "merkleIndex": 0
  }
}
```

---

#### Step 5 — 本地生成 ZK Proof

使用 ILAL SDK 或直接调用 snarkjs：

```typescript
import snarkjs from 'snarkjs';

const { proof, publicSignals } = await snarkjs.plonk.fullProve(
  {
    userAddress: BigInt(walletAddress.toLowerCase()).toString(),
    merkleRoot: attestation.merkleRoot,
    issuerAx: attestation.issuerAx,
    issuerAy: attestation.issuerAy,
    timestamp: attestation.timestamp,
    sigR8x: attestation.sigR8x,
    sigR8y: attestation.sigR8y,
    sigS: attestation.sigS,
    kycStatus: attestation.kycStatus,
    countryCode: attestation.countryCode,
    merkleProof: attestation.merkleProof,
    merkleIndex: attestation.merkleIndex,
  },
  './compliance.wasm',   // 电路 WASM 文件
  './compliance.zkey',   // 电路证明密钥
);
// 预计耗时 ~15 秒（WASM 单线程）
```

---

#### Step 6 — 提交 Proof，激活链上会话

```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/verify \
  -H "x-api-key: ilal_live_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xYourWalletAddress",
    "proof": "0x1234...",
    "publicInputs": ["...", "..."]
  }'
```

响应：

```json
{
  "success": true,
  "txHash": "0xabc...",
  "sessionExpiry": 1774746400,
  "remainingSeconds": 86399,
  "message": "Session activated on-chain."
}
```

> 此时 API Relayer 钱包（`0x1b869...`）已在链上替你支付 gas，调用 `SessionManager.startSession()`。

---

#### Step 7 — 构建 Swap 交易

```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/swap \
  -H "x-api-key: ilal_live_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "tokenOut": "0x4200000000000000000000000000000000000006",
    "amount": "1000000",
    "zeroForOne": true,
    "userAddress": "0xYourWalletAddress"
  }'
```

响应：

```json
{
  "success": true,
  "transaction": {
    "to": "0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891",
    "data": "0x41c0e528...",
    "value": "0x0",
    "chainId": 84532,
    "gas": "0x1E8480"
  },
  "instructions": {
    "description": "Sign and broadcast this transaction with your wallet",
    "network": "Base Sepolia (chainId: 84532)",
    "rpcUrl": "https://sepolia.base.org"
  }
}
```

> API 返回**未签名的交易 calldata**，由机构用自己的托管钱包签名后广播。

---

#### Step 8 — 构建 Add Liquidity 交易

```bash
curl -X POST https://ilal-mvp-production.up.railway.app/api/v1/defi/liquidity \
  -H "x-api-key: ilal_live_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "token0": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "token1": "0x4200000000000000000000000000000000000006",
    "amount0": "500000",
    "amount1": "100000000000000",
    "tickLower": -600,
    "tickUpper": 600,
    "userAddress": "0xYourWalletAddress"
  }'
```

响应结构与 Swap 相同，`to` 指向 `PositionManager` 合约。

---

#### Step 9 — 签名并广播

用你的钱包（ethers.js / viem / wagmi）签名并发送：

```typescript
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount('0xYourPrivateKey');
const wallet = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

const txHash = await wallet.sendTransaction({
  to: response.transaction.to,
  data: response.transaction.data,
  value: BigInt(response.transaction.value),
  gas: BigInt(response.transaction.gas),
});

console.log(`https://sepolia.basescan.org/tx/${txHash}`);
```

---

## 5. API 接口详细说明

所有接口基础路径：`https://ilal-mvp-production.up.railway.app/api/v1`

### 认证方式

| 方式 | Header | 适用接口 |
|------|--------|----------|
| JWT Bearer Token | `Authorization: Bearer <token>` | auth、apikeys |
| API Key | `x-api-key: ilal_live_<key>` | onboarding、verify、defi |

---

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/auth/register` | 注册，返回 JWT + refreshToken |
| `POST` | `/auth/login` | 登录，返回 JWT + refreshToken |
| `POST` | `/auth/refresh` | 刷新 access token |
| `GET` | `/auth/me` | 获取当前用户信息（需 JWT） |

### API Key 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/apikeys` | 列出所有 API Keys（需 JWT） |
| `POST` | `/apikeys` | 创建新 API Key（需 JWT） |
| `DELETE` | `/apikeys/:id` | 撤销 API Key（需 JWT） |

### 机构入驻接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/onboarding/register` | 注册机构，加入 Merkle Tree |
| `GET` | `/onboarding/status/:address` | 查询入驻状态 |
| `GET` | `/onboarding/attestation/:address` | 获取 Attestation（用于生成 ZK Proof） |

### ZK 验证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/verify` | 提交 ZK Proof，激活链上会话 |
| `GET` | `/session/:address` | 查询会话状态（公开，无需认证） |

### DeFi 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/defi/swap` | 构建 Swap 未签名交易 |
| `POST` | `/defi/liquidity` | 构建 Add Liquidity 未签名交易 |

---

## 6. 实测数据

### E2E 测试结果（2026-03-28，Base Sepolia）

本次测试使用治理钱包 `0x1b869CaC69Df23Ad9D727932496AEb3605538c8D`，对接生产 Railway API。

```
Phase 1: API 健康检查          ✅  (822ms)
Phase 2: 注册 + API Key        ✅✅ (2643ms / 999ms)
Phase 3: 机构入驻              ✅✅ (1669ms / 1001ms)
Phase 4: Attestation           ✅  (840ms)
         ZK Proof 生成（本地）  ✅  (14,892ms)
         链上 Session 激活      ✅  (4,843ms)
Phase 5: Swap TX 构建          ✅  (813ms)
         Liquidity TX 构建      ✅  (699ms)
Phase 6: 链上 Trade 1          ✅  (3,996ms)
         链上 Trade 2          ✅  (3,990ms)
Phase 7: 余额变化验证          ✅
         Session 查询          ✅
         API Key 清理          ✅

总计：15/15 通过 | 用时 47.3 秒 | 链上交易 2 笔
```

### 实际链上交易

| 笔次 | TX Hash | 链接 |
|------|---------|------|
| Trade 1 | `0x06da22aaa2be1b665fe37b0c34...` | [BaseScan](https://sepolia.basescan.org/tx/0x06da22aaa2be1b665fe37b0c3418328be7ae81e171ff2dd5142c15c21db370ec) |
| Trade 2 | `0x5136b9d4437c2f7d1de093fa9e...` | [BaseScan](https://sepolia.basescan.org/tx/0x5136b9d4437c2f7d1de093fa9e9fc518c6091d074ca8116e1c59c43335d801ff) |

### 交易前后余额变化

```
开盘：mUSD = 8,900   | mTBILL = 1,098.49
收盘：mUSD = 8,700   | mTBILL = 1,298.14

变化：mUSD -200      | mTBILL +199.65（滑点 0.175%）
```

### 性能指标（实测）

| 指标 | 数值 |
|------|------|
| ZK Proof 生成（本地 WASM） | ~15 秒 |
| 链下 ZK 验证（snarkjs） | 8.2ms |
| 链上会话激活（含链上确认） | ~4.8 秒 |
| 每次 Swap gas | ~15,000（会话缓存 SLOAD） |
| 每次会话激活 gas（PLONK 验证） | ~683,986 |

---

## 7. 链上合约地址

所有合约部署在 **Base Sepolia 测试网（chainId: 84532）**。

| 合约 | 地址 | 说明 |
|------|------|------|
| ComplianceHook | [`0xe633220f15932428FcA60A1A2C2C48797A180A80`](https://sepolia.basescan.org/address/0xe633220f15932428FcA60A1A2C2C48797A180A80) | Uniswap v4 Hook，执行合规检查 |
| SessionManager (UUPS) | [`0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2`](https://sepolia.basescan.org/address/0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2) | 管理用户合规会话（24h TTL） |
| Registry (UUPS) | [`0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD`](https://sepolia.basescan.org/address/0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD) | 路由器白名单，紧急暂停 |
| SimpleSwapRouter | [`0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891`](https://sepolia.basescan.org/address/0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891) | 合规 Swap 路由 |
| PositionManager | [`0x692548a6E1797d2762b9d04f29112C172E5Cea32`](https://sepolia.basescan.org/address/0x692548a6E1797d2762b9d04f29112C172E5Cea32) | 流动性仓位管理 |
| PlonkVerifier (v2) | [`0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A`](https://sepolia.basescan.org/address/0xa1FaF1d0858533820B48db578AaE8C31c9c1a37A) | PLONK 链上验证器 |
| PlonkVerifierAdapter (v2) | [`0x8e093aC51921fe2be9bd0910092a01200AAd6560`](https://sepolia.basescan.org/address/0x8e093aC51921fe2be9bd0910092a01200AAd6560) | 适配器，连接 SessionManager |

**外部依赖：** Uniswap v4 PoolManager — `0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408`

---

## 8. 常见问题

### Q: API Key 在 ilal.tech 创建，可以调用 Railway API 吗？

**可以。** 两个服务共享同一个 Neon PostgreSQL 数据库。在 `ilal.tech` 注册的账号和创建的 API Key，可以直接用于调用 `ilal-mvp-production.up.railway.app` 上的所有 DeFi 接口。

---

### Q: 调用 `/defi/swap` 返回的 calldata 可以直接广播吗？

**不能直接广播。** 该接口返回的是未签名的交易数据，需要：
1. 用你的托管钱包签名
2. 确保钱包地址有**活跃的合规会话**（先完成 ZK 验证流程）
3. 确保钱包对 `SimpleSwapRouter` 有足够的 token `approve` 授权

---

### Q: Swap 失败，错误 `0x90bfb865`？

这是 `ComplianceHook` 的 `NotCompliant()` 错误，表示发起交易的钱包地址**没有活跃的合规会话**。需要：
1. 完成 Step 3（机构入驻）
2. 完成 Step 4（获取 Attestation）
3. 完成 Step 5-6（生成 ZK Proof 并提交，激活会话）

---

### Q: 会话有效期是多久？

24 小时（86,400 秒）。会话到期后可通过重新提交 ZK Proof 续期，每个 ZK Proof 最多可续期 6 次。

---

### Q: ZK Proof 生成需要什么文件？

需要两个电路文件：
- `compliance.wasm` — 编译后的 Circom 电路
- `compliance.zkey` — PLONK 证明密钥

这两个文件在 `packages/circuits/` 目录下，也可以从 ILAL 获取预编译版本。

---

### Q: 主网什么时候上线？

当前仅在 Base Sepolia 测试网运行。主网部署计划在完成独立安全审计后进行。

---

*本文档基于 2026-03-28 实测结果编写。如有疑问请联系 2867755637@qq.com*
