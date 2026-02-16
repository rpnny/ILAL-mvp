# ILAL SaaS 架构文档

## 架构概览

ILAL 已从演示型 DApp 重构为完整的 **SaaS 基础设施**，提供企业级的 DeFi 合规解决方案。

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                         用户应用层                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard  │  │  Third-party │  │   CLI Tools  │    │
│  │  (用户管理)   │  │     Apps     │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         SDK 层                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              @ilal/sdk (TypeScript)                   │  │
│  │  • ILALClient (直接上链模式)                          │  │
│  │  • ILALApiClient (API Key 模式)                       │  │
│  │  • Session / Swap / Liquidity / ZKProof / EAS        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       SaaS 服务层                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            ILAL API Service (Node.js)                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │   认证    │ │ API Key  │ │  计费    │            │   │
│  │  │ (JWT)    │ │  管理    │ │  追踪    │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │  ┌──────────────────────────────────────────┐      │   │
│  │  │    ZK Proof 验证 & Session 激活          │      │   │
│  │  │    (原 Relay 功能)                       │      │   │
│  │  └──────────────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         PostgreSQL (Prisma ORM)                      │   │
│  │  • Users  • API Keys  • Usage Records               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      区块链基础设施层                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Smart Contracts (Solidity)                 │  │
│  │  • SessionManager  • ComplianceHook                   │  │
│  │  • Registry  • PlonkVerifier  • Uniswap V4 Pools    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Base / Base Sepolia                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 两种集成模式

### 模式 1: 直接上链（开源用户）

```typescript
import { ILALClient } from '@ilal/sdk';

// 使用 RPC 直接连接区块链
const client = await ILALClient.fromRPC({
  rpcUrl: 'https://base.llamarpc.com',
  chainId: 8453,
  privateKey: '0x...',
});

// 直接上链操作
await client.session.activate();
await client.swap.execute({ ... });
```

**特点**:
- ✅ 完全去中心化
- ✅ 无需注册账号
- ✅ 无使用限制
- ❌ 需要支付 Gas 费
- ❌ 需要自己部署 ZK Proof 生成服务

### 模式 2: API Key（SaaS 用户）

```typescript
import { ILALApiClient } from '@ilal/sdk';

// 使用 API Key 通过 API 服务
const client = new ILALApiClient({
  apiKey: 'ilal_live_xxxxx',
  apiBaseUrl: 'https://api.ilal.xyz',
  chainId: 8453,
});

// 通过 API 服务代理
await client.verifyAndActivate({
  userAddress: '0x...',
  proof: '0x...',
  publicInputs: ['123', '456'],
});
```

**特点**:
- ✅ 无需支付 Gas 费（由 API 服务代付）
- ✅ 集成简单（API Key 即用）
- ✅ 免费套餐可用
- ✅ 企业级支持
- ⚠️ 需要注册账号
- ⚠️ 有月度配额限制（可升级）

## 收费模式

### 套餐对比

| 功能 | 免费版 | 专业版 | 企业版 |
|------|--------|--------|--------|
| **月调用次数** | 100 | 10,000 | 无限制 |
| **限流** | 10/min | 100/min | 1000/min |
| **API Keys** | 2 | 10 | 无限制 |
| **技术支持** | 社区 | Email | 专属 |
| **SLA** | - | 99.9% | 99.99% |
| **价格** | $0 | $99/月 | 定制 |

### 计费逻辑

- **按调用次数计费**: 每次 API 调用计入配额
- **不同端点权重不同**:
  - ZK Proof 验证: 5 credits
  - Session 激活: 3 credits
  - 查询类: 0.5 credits
- **配额重置**: 每月 1 日重置
- **超额处理**: 返回 `402 Payment Required`

## 技术栈

### API 服务 (`apps/api/`)

- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL 14+
- **ORM**: Prisma 5.x
- **认证**: JWT (jsonwebtoken)
- **密码**: bcrypt
- **区块链交互**: viem 2.x
- **日志**: Winston
- **限流**: express-rate-limit
- **安全**: Helmet, CORS

### SDK (`packages/sdk/`)

- **语言**: TypeScript
- **区块链**: viem 2.x
- **ZK Proof**: snarkjs (optional dependency)
- **目标**: 浏览器 + Node.js

### 数据库 Schema

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

## API 端点

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/auth/me` - 用户信息

### API Key
- `GET /api/v1/apikeys` - 列表
- `POST /api/v1/apikeys` - 创建
- `DELETE /api/v1/apikeys/:id` - 撤销

### ZK Proof 验证
- `POST /api/v1/verify` - 验证 + 激活 Session
- `GET /api/v1/session/:address` - Session 状态

### 计费
- `GET /api/v1/usage/stats` - 使用统计
- `GET /api/v1/billing/plans` - 套餐列表
- `POST /api/v1/billing/upgrade` - 升级套餐

## 部署架构

### 生产环境推荐

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

### 监控和日志

- **应用日志**: Winston → CloudWatch / Datadog
- **API 监控**: Prometheus + Grafana
- **错误追踪**: Sentry
- **性能**: New Relic / AppDynamics
- **安全**: AWS WAF + GuardDuty

## 安全措施

### API 层安全

1. **认证**
   - JWT Token (7天有效期)
   - Refresh Token (30天有效期)
   - API Key bcrypt 加密存储

2. **限流**
   - 按用户套餐动态限流
   - IP 级别限流（防 DDoS）
   - 配额检查（防滥用）

3. **输入验证**
   - Zod schema 验证所有输入
   - 地址格式验证
   - SQL 注入防护（Prisma）

4. **HTTPS**
   - TLS 1.3
   - 强制 HTTPS 重定向
   - HSTS 启用

### 数据库安全

- 敏感字段加密（API Keys）
- 定期备份（每日）
- 读写分离
- 连接池管理

### 私钥管理

- Verifier 私钥存储在 AWS KMS / Vault
- 环境变量注入（不硬编码）
- 定期轮换

## 迁移指南

### 从 Web Demo 迁移

如果你之前使用 `apps/web-demo`：

1. **注册账号**
   ```bash
   curl -X POST https://api.ilal.xyz/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"Secure123!"}'
   ```

2. **创建 API Key**
   登录 Dashboard 或通过 API 创建

3. **更新代码**
   ```typescript
   // 旧方式
   const client = ILALClient.fromProvider({ provider: window.ethereum, chainId: 8453 });
   
   // 新方式
   const client = new ILALApiClient({
     apiKey: 'ilal_live_xxxxx',
     apiBaseUrl: 'https://api.ilal.xyz',
     chainId: 8453,
   });
   ```

4. **测试**
   先在免费套餐测试，确认无误后升级

## 性能指标

### SLA 目标

- **可用性**: 99.9% (专业版) / 99.99% (企业版)
- **响应时间**: p95 < 500ms
- **吞吐量**: 1000 req/s (企业版)

### 实际性能

- **ZK Proof 验证**: ~2-3s (含链上交易)
- **Session 查询**: ~50-100ms
- **API Key 创建**: ~200ms

## 开发环境设置

### 本地运行 API 服务

```bash
# 1. 安装依赖
cd apps/api
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 配置数据库和区块链

# 3. 数据库迁移
pnpm db:migrate

# 4. 启动服务
pnpm dev
```

### 本地测试

```bash
# 健康检查
curl http://localhost:3001/api/v1/health

# 注册用户
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

## 故障排查

### 常见问题

**Q: API Key 验证失败**
- 检查 `X-API-Key` header 格式
- 确认 API Key 未被撤销
- 检查 API Key 是否过期

**Q: 配额不足**
- 检查 `/api/v1/usage/stats`
- 升级套餐或等待下月重置

**Q: 限流 429 错误**
- 降低请求频率
- 检查响应头 `RateLimit-Reset`
- 升级套餐以提高限流

## 路线图

### 近期 (Q1 2024)

- ✅ SaaS 架构重构
- ✅ API Key 认证
- ✅ 使用追踪和计费
- ⏳ Dashboard 用户界面
- ⏳ Stripe 支付集成

### 中期 (Q2-Q3 2024)

- Redis 缓存层
- WebSocket 实时通知
- 多区域部署
- 高级分析仪表板

### 长期 (Q4 2024+)

- 白标解决方案
- 自定义合规规则
- 企业级 SSO
- 审计日志

## 联系和支持

- **文档**: https://docs.ilal.xyz
- **API 文档**: https://api.ilal.xyz/docs
- **GitHub**: https://github.com/ilal-xyz/ilal
- **Discord**: https://discord.gg/ilal
- **Email**: support@ilal.xyz
