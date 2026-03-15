# ILAL Institutional Demo — 机构接入演示

本目录演示机构如何通过 ILAL 的 SDK 和 API 构建交易系统并执行链上操作。

## 目录结构

```
institutional-demo/
├── README.md                  ← 本文件：机构接入指南
├── sdk-mode/
│   └── trading-system.ts      ← SDK 直连模式（做市商 / DeFi fund）
├── api-mode/
│   └── trading-system.ts      ← API Key 模式（传统金融机构）
└── live-demo/
    └── run.ts                 ← 真实链上执行演示（Base Sepolia）
```

## 两种接入模式

### Mode 1: SDK 直连

**适合：** 有 Web3 开发能力的做市商、DeFi 基金、量化团队

```typescript
import { ILALClient, BASE_SEPOLIA_TOKENS } from '@ilal/sdk';
import { parseUnits } from 'viem';

// 初始化
const client = new ILALClient({
  walletClient, publicClient, chainId: 84532,
});

// 确保 session 激活
await client.session.activateIfNeeded({ expiry: 24 * 3600 });

// 执行交易 — 就这么简单
const result = await client.swap.execute({
  tokenIn: BASE_SEPOLIA_TOKENS.USDC,
  tokenOut: BASE_SEPOLIA_TOKENS.WETH,
  amountIn: parseUnits('100', 6),
  slippageTolerance: 0.5,
});

console.log('TX:', result.hash);
```

SDK 自动处理：授权检查、代币排序、滑点保护、事件解析、错误分类。

### Mode 2: API Key

**适合：** 传统金融机构、资管公司、不直接碰链的团队

**核心设计：API 返回未签名交易数据，机构用自己的钱包签名广播。ILAL 不托管私钥。**

```typescript
// Step 1: 调 API 获取未签名交易
const response = await fetch('https://ilal.tech/api/v1/defi/swap', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'ilal_live_xxxxx',
  },
  body: JSON.stringify({
    tokenIn: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    tokenOut: '0x4200000000000000000000000000000000000006',
    amount: '100000000',
    zeroForOne: true,
    userAddress: '0x...',
  }),
});

// 响应包含 { transaction: { to, data, value, chainId, gas } }
const { transaction } = await response.json();

// Step 2: 先本地校验返回值，再签名广播
assertUnsignedSwapTxMatchesRequest(transaction, {
  tokenIn,
  tokenOut,
  amount,
  zeroForOne,
});

const hash = await signer.sendTransaction({
  to: transaction.to,
  data: transaction.data,
  value: BigInt(transaction.value),
});
```

或使用 SDK 封装：

```typescript
import { ILALApiClient } from '@ilal/sdk';

const client = new ILALApiClient({
  apiKey: 'ilal_live_xxxxx',
  apiBaseUrl: 'https://ilal.tech',
  chainId: 8453,
});

await client.generateAndActivate({ userAddress: '0x...' });
```

## 机构操作全流程

```
Day 0: Onboarding
├── 注册机构账户（API: POST /auth/register）
├── 获取 API Key（API: POST /apikeys）
└── 完成 KYC / AML 审核

Day 1: 身份验证
├── 生成 ZK Proof（链下）
├── 提交验证并激活 Session（API: POST /verify 或 SDK: session.activate()）
└── Session 开启（24h TTL）

Day 1~N: 日常交易（Session 有效期内）
├── 签署 EIP-712 Permit（钱包签名，零 gas）
├── 执行 Swap（SDK: swap.execute() 或 API: POST /defi/swap）
├── 管理流动性（SDK: liquidity.add() 或 API: POST /defi/liquidity）
├── 查询余额 & 仓位
└── 重复上述步骤...

Session 到期:
├── 自动失效（24h 后）
├── 续期（API: POST /verify/renew 或重新 activate）
└── 注：撤出流动性永远不受限
```

## 运行 Live Demo

在 Base Sepolia 上执行真实链上交易：

```bash
cd /path/to/ilal
./apps/api/node_modules/.bin/tsx examples/institutional-demo/live-demo/run.ts
```

需要 `.env` 中配置 `PRIVATE_KEY`（Base Sepolia 测试网）。

## API 端点一览（https://ilal.tech）

| Method | Path | 功能 | 返回 |
|--------|------|------|------|
| POST | /api/v1/auth/register | 注册 | JWT |
| POST | /api/v1/auth/login | 登录 | JWT |
| POST | /api/v1/verify | ZK Proof 验证 + Session 激活 | txHash |
| GET | /api/v1/verify/session?address=0x... | 查询 Session 状态（JWT） | active, expiry |
| POST | /api/v1/verify/renew | 续期 Session | txHash |
| POST | /api/v1/defi/swap | **构建** Swap 交易（未签名） | { transaction: { to, data, value } } |
| POST | /api/v1/defi/liquidity | **构建** Liquidity 交易（未签名） | { transaction: { to, data, value } } |
| GET | /api/v1/billing/stats | 使用量统计 | usage data |
| GET | /api/v1/billing/plans | 计费方案 | plans |
| POST | /api/v1/apikeys | 创建 API Key | key |

**注意：DeFi 端点返回未签名交易数据，但不能盲签。接入方至少应校验 `to`、`chainId`、函数 selector、池参数和 hook 地址，再广播。**

## SDK 模块一览

| 模块 | 功能 |
|------|------|
| `client.session` | Session 激活 / 查询 / 续期 / 状态 |
| `client.swap` | Swap 执行 / 估价 / 余额查询 |
| `client.liquidity` | 添加 / 移除流动性 / 查询仓位 |
| `client.zkproof` | 生成 ZK Proof |
| `client.eas` | EAS 身份验证 |
