# ILAL SaaS 快速开始

本指南帮助你在 5 分钟内开始使用 ILAL SaaS 服务。

## 步骤 1: 注册账号

### 选项 A: 通过 API 注册

```bash
curl -X POST https://api.ilal.xyz/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@example.com",
    "password": "SecureP@ssw0rd",
    "name": "Your Name"
  }'
```

**响应**:
```json
{
  "user": { "id": "clx123", "email": "your@example.com", ... },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi..."
}
```

保存 `accessToken`，下一步需要使用。

### 选项 B: 通过 Dashboard 注册

访问 `https://dashboard.ilal.xyz` 并注册账号（即将推出）。

## 步骤 2: 创建 API Key

使用上一步获得的 `accessToken`:

```bash
curl -X POST https://api.ilal.xyz/api/v1/apikeys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My First Key",
    "permissions": ["verify", "session"]
  }'
```

**响应**:
```json
{
  "apiKey": "ilal_live_1234567890abcdef1234567890abcdef12345678",
  "id": "cly456",
  "name": "My First Key",
  "warning": "Please save this API key securely. It will not be shown again."
}
```

⚠️ **重要**: 保存 `apiKey`，它只显示这一次！

## 步骤 3: 安装 SDK

```bash
npm install @ilal/sdk
# or
yarn add @ilal/sdk
# or
pnpm add @ilal/sdk
```

## 步骤 4: 使用 SDK

创建 `test.ts`:

```typescript
import { ILALApiClient } from '@ilal/sdk';

const client = new ILALApiClient({
  apiKey: 'ilal_live_xxxxxxxxxxxxx', // 你的 API Key
  apiBaseUrl: 'https://api.ilal.xyz',
  chainId: 8453, // Base Mainnet
});

async function main() {
  // 1. 健康检查
  const health = await client.healthCheck();
  console.log('✅ API Service:', health.status);

  // 2. 查询 Session 状态
  const userAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const status = await client.getSessionStatus(userAddress);
  
  console.log('📊 Session Status:', {
    isActive: status.isActive,
    remainingSeconds: status.remainingSeconds,
  });

  // 3. 验证 ZK Proof 并激活 Session
  // (需要先生成 Proof，见完整文档)
  /*
  const result = await client.verifyAndActivate({
    userAddress,
    proof: '0x...',
    publicInputs: ['123', '456'],
  });
  
  console.log('🎉 Session Activated:', result.txHash);
  */
}

main().catch(console.error);
```

运行:

```bash
npx tsx test.ts
```

## 步骤 5: 查看使用统计

```bash
curl https://api.ilal.xyz/api/v1/usage/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**响应**:
```json
{
  "usage": {
    "totalCalls": 3,
    "successfulCalls": 3,
    "failedCalls": 0
  },
  "quota": {
    "limit": 100,
    "remaining": 97,
    "resetDate": "2024-03-01T00:00:00Z"
  },
  "plan": {
    "current": "FREE"
  }
}
```

## 完整示例：从 EAS 验证到 Session 激活

```typescript
import { ILALApiClient } from '@ilal/sdk';

const client = new ILALApiClient({
  apiKey: process.env.ILAL_API_KEY!,
  apiBaseUrl: 'https://api.ilal.xyz',
  chainId: 8453,
  // 如果需要生成 ZK Proof，提供配置
  zkConfig: {
    wasmPath: './circuits/compliance.wasm',
    zkeyPath: './circuits/compliance_final.zkey',
  },
});

async function completeFlow() {
  const userAddress = '0x...';

  // 1. 准备 EAS 认证数据（从链上获取）
  const attestationData = {
    schema: 123456789012345678n,
    attester: 987654321098765432n,
    recipient: 111111111111111111n,
    time: BigInt(Math.floor(Date.now() / 1000)),
    expirationTime: 999999999999999999n,
    revocationTime: 0n,
    refUID: 0n,
    data: 555555555555555555n,
  };

  // 2. 生成 ZK Proof 并通过 API 验证激活
  const result = await client.generateAndActivate({
    userAddress,
    attestationData,
  });

  console.log('✅ Success!', {
    txHash: result.txHash,
    sessionExpiry: result.sessionExpiry,
    gasUsed: result.gasUsed,
  });

  // 3. 确认 Session 已激活
  const status = await client.getSessionStatus(userAddress);
  console.log('📊 Session Active:', status.isActive);
}

completeFlow().catch(console.error);
```

## 套餐升级

当免费套餐（100次/月）不够用时，升级到专业版：

```bash
curl -X POST https://api.ilal.xyz/api/v1/billing/upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"targetPlan": "PRO"}'
```

**专业版套餐**:
- 10,000 次调用/月
- 100 req/min 限流
- Email 技术支持
- $99/月

## 环境变量配置

创建 `.env`:

```bash
# API
ILAL_API_KEY=ilal_live_xxxxxxxxxxxxx
ILAL_API_URL=https://api.ilal.xyz

# JWT (如果需要管理 API Keys)
ILAL_ACCESS_TOKEN=eyJhbGciOi...
```

在代码中使用:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const client = new ILALApiClient({
  apiKey: process.env.ILAL_API_KEY!,
  apiBaseUrl: process.env.ILAL_API_URL!,
  chainId: 8453,
});
```

## 错误处理

```typescript
try {
  await client.verifyAndActivate({ ... });
} catch (error) {
  if (error.message.includes('Payment Required')) {
    console.error('❌ 配额不足，请升级套餐');
  } else if (error.message.includes('Too Many Requests')) {
    console.error('❌ 请求过于频繁，请稍后重试');
  } else if (error.message.includes('Invalid proof')) {
    console.error('❌ ZK Proof 验证失败');
  } else {
    console.error('❌ 未知错误:', error.message);
  }
}
```

## 监控和调试

### 1. 检查 API 健康

```typescript
const health = await client.healthCheck();
console.log(health);
// {
//   status: 'ok',
//   service: 'ILAL API',
//   relay: '0x...',
//   network: 'base-mainnet',
//   latestBlock: '12345678'
// }
```

### 2. 查看使用统计

通过 Dashboard 或 API 端点实时查看：
- 总调用次数
- 成功/失败比例
- 配额使用情况
- 各端点调用分布

### 3. API 日志

所有 API 请求都会返回标准 headers:

```
RateLimit-Remaining: 95
X-Quota-Remaining: 9950
X-Response-Time: 234ms
```

## 进阶用法

### 直接上链模式（无需 API Key）

如果你想完全去中心化，可以使用传统的 `ILALClient`:

```typescript
import { ILALClient } from '@ilal/sdk';

const client = await ILALClient.fromRPC({
  rpcUrl: 'https://base.llamarpc.com',
  chainId: 8453,
  privateKey: process.env.PRIVATE_KEY,
});

// 直接上链，需要支付 Gas
await client.session.activate();
```

### 混合模式

API Key 模式用于生产，直接上链用于测试：

```typescript
const client = process.env.NODE_ENV === 'production'
  ? new ILALApiClient({ apiKey: process.env.ILAL_API_KEY!, ... })
  : await ILALClient.fromRPC({ rpcUrl: process.env.RPC_URL!, ... });
```

## 常见问题

**Q: 如何获取测试网 API Key？**  
A: 测试网（Base Sepolia）也使用相同的 API，只需在创建客户端时指定 `chainId: 84532`。

**Q: API Key 可以共享吗？**  
A: 不推荐。每个应用/环境应使用独立的 API Key，便于追踪和撤销。

**Q: 免费套餐足够吗？**  
A: 免费套餐（100次/月）适合开发测试和小规模应用。生产环境建议升级到专业版。

**Q: 如何获得技术支持？**  
A: 
- 社区（Discord）: https://discord.gg/ilal
- 文档: https://docs.ilal.xyz
- Email（专业版+）: support@ilal.xyz

## 下一步

- 📖 阅读完整 API 文档：`apps/api/docs/API.md`
- 🏗️ 了解 SaaS 架构：`docs/guides/saas/SAAS_ARCHITECTURE.md`
- 🔧 查看 SDK 文档：`packages/sdk/README.md`
- 💬 加入 [Discord 社区](https://discord.gg/ilal)

---

**享受构建合规 DeFi 应用！**
