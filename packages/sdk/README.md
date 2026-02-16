# @ilal/sdk

> Official TypeScript SDK for ILAL Protocol - Compliant DeFi Infrastructure

[![npm version](https://img.shields.io/npm/v/@ilal/sdk.svg)](https://www.npmjs.com/package/@ilal/sdk)
[![License](https://img.shields.io/npm/l/@ilal/sdk.svg)](https://github.com/your-org/ilal/blob/main/LICENSE)

## 特性

- ✅ **Session 管理** - 合规会话激活和管理
- 🔄 **代币交换** - 安全的代币兑换功能
- 💧 **流动性管理** - 添加/移除流动性头寸
- 🔐 **ZK Proof 生成** - 零知识证明合规验证
- 🎫 **EAS 验证** - Ethereum Attestation Service 集成
- 🌐 **跨环境支持** - 浏览器和 Node.js 通用
- 📦 **Tree-shakable** - 仅打包使用的代码
- 🔧 **完整类型支持** - 100% TypeScript

## 安装

```bash
npm install @ilal/sdk viem
```

或使用 pnpm:

```bash
pnpm add @ilal/sdk viem
```

## 快速开始

### 基础设置

```typescript
import { ILALClient } from '@ilal/sdk';
import { createWalletClient, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// 创建客户端
const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
});

// 初始化 ILAL 客户端
const client = new ILALClient({
  walletClient,
  publicClient,
  chainId: 84532,
});
```

### 从浏览器 Provider 初始化

```typescript
// 使用 MetaMask 或其他 EIP-1193 Provider
const client = ILALClient.fromProvider({
  provider: window.ethereum,
  chainId: 84532,
});
```

### Session 管理

```typescript
// 激活 Session
await client.session.activate({ expiry: 24 * 3600 });

// 检查状态
const isActive = await client.session.isActive();
const info = await client.session.getInfo();

console.log(`Session active: ${info.isActive}`);
console.log(`Remaining: ${Number(info.remainingTime) / 3600}h`);
```

### 执行 Swap

```typescript
import { parseUnits } from 'viem';
import { BASE_SEPOLIA_TOKENS } from '@ilal/sdk';

const result = await client.swap.execute({
  tokenIn: BASE_SEPOLIA_TOKENS.USDC,
  tokenOut: BASE_SEPOLIA_TOKENS.WETH,
  amountIn: parseUnits('100', 6), // 100 USDC
  slippageTolerance: 0.5, // 0.5%
});

console.log('Swap successful:', result.hash);
```

### 添加流动性

```typescript
import { parseEther, parseUnits } from 'viem';

const result = await client.liquidity.add({
  poolKey: {
    currency0: BASE_SEPOLIA_TOKENS.USDC,
    currency1: BASE_SEPOLIA_TOKENS.WETH,
    fee: 500,
    tickSpacing: 10,
    hooks: client.addresses.complianceHook,
  },
  tickLower: 190700,
  tickUpper: 196250,
  amount0Desired: parseUnits('100', 6),
  amount1Desired: parseEther('0.05'),
});

console.log('Liquidity added, Token ID:', result.tokenId);
```

### 生成 ZK Proof

```typescript
const client = new ILALClient({
  // ... 基础配置
  zkConfig: {
    wasmUrl: 'https://cdn.ilal.xyz/circuits/compliance.wasm',
    zkeyUrl: 'https://cdn.ilal.xyz/circuits/compliance_final.zkey',
  },
});

const proof = await client.zkproof.generate(
  userAddress,
  (progress, message) => {
    console.log(`[${progress}%] ${message}`);
  }
);

console.log('Proof generated in', proof.elapsedTime, 'ms');
```

### EAS 验证

```typescript
const verification = await client.eas.getVerification(userAddress);

if (verification.isVerified) {
  console.log('✅ User is verified');
  console.log('Attestation:', verification.attestationId);
} else {
  console.log('❌ Verification required');
}
```

## 核心 API

### ILALClient

主客户端类，提供访问所有模块的入口。

**构造函数**:
- `new ILALClient(config: ILALConfig)`
- `ILALClient.fromProvider(params)`
- `ILALClient.fromRPC(params)`

**模块**:
- `client.session` - Session 管理
- `client.swap` - 代币交换
- `client.liquidity` - 流动性管理
- `client.zkproof` - ZK Proof 生成
- `client.eas` - EAS 验证

### SessionModule

```typescript
// 激活 Session
await client.session.activate({ expiry?: number })

// 查询状态
await client.session.isActive(user?: Address): Promise<boolean>
await client.session.getInfo(user?: Address): Promise<SessionInfo>
await client.session.getRemainingTime(user?: Address): Promise<bigint>

// 智能激活
await client.session.activateIfNeeded(params?)
await client.session.ensureActive(user?)
```

### SwapModule

```typescript
// 执行 Swap
await client.swap.execute(params: SwapParams): Promise<SwapResult>

// 估算输出
await client.swap.estimateOutput(params: SwapParams): Promise<bigint>

// 查询余额和信息
await client.swap.getBalance(token: Address): Promise<bigint>
await client.swap.getTokenInfo(token: Address)
```

### LiquidityModule

```typescript
// 添加流动性
await client.liquidity.add(params: LiquidityParams): Promise<LiquidityResult>

// 移除流动性
await client.liquidity.remove(params: RemoveLiquidityParams): Promise<LiquidityResult>

// 查询头寸
await client.liquidity.getPosition(tokenId: bigint): Promise<LiquidityPosition | null>
await client.liquidity.getUserPositions(user?: Address): Promise<LiquidityPosition[]>
```

### ZKProofModule

```typescript
// 生成证明
await client.zkproof.generate(
  userAddress: string,
  onProgress?: ProofProgressCallback
): Promise<ProofResult>

// 验证证明
await client.zkproof.verify(proof: any, publicSignals: string[]): Promise<boolean>

// 格式化为合约参数
client.zkproof.formatForContract(proof, publicSignals)
```

### EASModule

```typescript
// 检查验证状态
await client.eas.checkCoinbaseVerification(user: Address): Promise<VerificationResult>
await client.eas.checkAllProviders(user: Address): Promise<VerificationResult>

// 便捷方法
await client.eas.getVerification(user: Address)
await client.eas.ensureVerified(user: Address)

// 注册自定义 Provider
client.eas.registerProvider(config: KYCProviderConfig)
```

## ZK Proof 配置

SDK 不打包 WASM 文件（文件太大，50-100MB），而是让你指定文件位置。

### 浏览器环境（从 CDN）

```typescript
const client = new ILALClient({
  // ... 其他配置
  zkConfig: {
    wasmUrl: 'https://cdn.ilal.xyz/circuits/compliance.wasm',
    zkeyUrl: 'https://cdn.ilal.xyz/circuits/compliance_final.zkey',
  },
});
```

### Node.js 环境（本地文件）

```typescript
const client = new ILALClient({
  // ... 其他配置
  zkConfig: {
    wasmUrl: './circuits/compliance.wasm',
    zkeyUrl: './circuits/compliance_final.zkey',
  },
});
```

### 使用 Buffer（高级用法）

```typescript
import fs from 'fs';

const client = new ILALClient({
  zkConfig: {
    wasmUrl: fs.readFileSync('./compliance.wasm'),
    zkeyUrl: fs.readFileSync('./compliance_final.zkey'),
  },
});
```

## 错误处理

SDK 提供详细的错误类型：

```typescript
import {
  ILALError,
  SessionExpiredError,
  InsufficientLiquidityError,
  SlippageExceededError,
  VerificationFailedError,
} from '@ilal/sdk';

try {
  await client.swap.execute({ ... });
} catch (error) {
  if (error instanceof SessionExpiredError) {
    console.error('Session expired, please activate');
  } else if (error instanceof InsufficientLiquidityError) {
    console.error('Not enough liquidity in pool');
  } else if (error instanceof SlippageExceededError) {
    console.error('Price moved too much');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 示例

完整示例请查看 [`examples/`](./examples/) 目录：

- [01-basic-setup.ts](./examples/01-basic-setup.ts) - 客户端初始化
- [02-session-management.ts](./examples/02-session-management.ts) - Session 管理
- [03-basic-swap.ts](./examples/03-basic-swap.ts) - 基本 Swap
- [04-add-liquidity.ts](./examples/04-add-liquidity.ts) - 添加流动性
- [05-zk-proof.ts](./examples/05-zk-proof.ts) - ZK Proof 生成
- [06-eas-verification.ts](./examples/06-eas-verification.ts) - EAS 验证

## 链支持

| 网络 | Chain ID | 状态 |
|------|----------|------|
| Base Sepolia | 84532 | ✅ 已部署 |
| Base Mainnet | 8453 | 🚧 即将推出 |

## 依赖

核心依赖：
- `viem` - Ethereum 交互库

可选依赖（仅 ZK 功能需要）：
- `circomlibjs` - Poseidon hash
- `snarkjs` - ZK proof 生成

## License

Apache-2.0

## 资源

- [文档](../docs/) - 完整技术文档
- [示例](./examples/) - 代码示例
- [GitHub](https://github.com/your-org/ilal) - 源代码
- [Discord](https://discord.gg/ilal) - 社区支持

## 支持

遇到问题？
- 查看 [示例代码](./examples/)
- 提交 [Issue](https://github.com/your-org/ilal/issues)
- 加入 [Discord](https://discord.gg/ilal) 社区

---

Made with ❤️ by the ILAL Team
