# ILAL API 文档

## 概述

ILAL API 是一个企业级 REST API 服务，提供：

- 用户认证和管理
- API Key 管理
- ZK Proof 验证和 Session 激活
- 使用追踪和计费

**Base URL**: `https://api.ilal.tech` (生产环境)  
**Base URL**: `http://localhost:3001` (开发环境)

**API 版本**: v1

## 认证方式

### 1. JWT 认证（用于用户管理）

用于访问用户相关的管理端点（API Key 管理、使用统计等）。

**请求头**:
```
Authorization: Bearer <jwt_access_token>
```

### 2. API Key 认证（用于 API 调用）

用于调用核心 API 功能（ZK Proof 验证等）。

**请求头**:
```
X-API-Key: ilal_live_xxxxxxxxxxxxx
```

## 通用响应格式

### 成功响应

```json
{
  "data": { ... },
  "message": "Success"
}
```

### 错误响应

```json
{
  "error": "ErrorType",
  "message": "详细错误信息",
  "details": { ... }  // 可选
}
```

### HTTP 状态码

- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未认证
- `402` - 配额不足（需要付费）
- `403` - 权限不足
- `404` - 资源不存在
- `429` - 请求过于频繁（限流）
- `500` - 服务器内部错误
- `503` - 服务不可用

## 限流

响应头包含限流信息：

```
RateLimit-Limit: 100        # 窗口内最大请求数
RateLimit-Remaining: 95     # 剩余请求数
RateLimit-Reset: 1709222400 # 重置时间（Unix 时间戳）

X-Quota-Remaining: 9500     # 月度配额剩余
X-Quota-Limit: 10000        # 月度配额总数
X-Quota-Reset: 2024-03-01T00:00:00Z  # 配额重置时间
```

---

## API 端点

### 🔐 认证

#### 注册用户

```http
POST /api/v1/auth/register
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "name": "John Doe",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" // 可选
}
```

**响应** (201):
```json
{
  "user": {
    "id": "clx123456",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "FREE",
    "createdAt": "2024-02-15T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 登录

```http
POST /api/v1/auth/login
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd"
}
```

**响应** (200):
```json
{
  "user": {
    "id": "clx123456",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "FREE"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 刷新 Token

```http
POST /api/v1/auth/refresh
```

**请求体**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**响应** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 获取当前用户信息

```http
GET /api/v1/auth/me
```

**认证**: JWT Token (必需)

**响应** (200):
```json
{
  "user": {
    "id": "clx123456",
    "email": "user@example.com",
    "name": "John Doe",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "plan": "FREE",
    "createdAt": "2024-02-15T10:00:00Z"
  }
}
```

---

### 🔑 API Key 管理

#### 列出所有 API Keys

```http
GET /api/v1/apikeys
```

**认证**: JWT Token (必需)

**响应** (200):
```json
{
  "apiKeys": [
    {
      "id": "cly123456",
      "name": "Production Key",
      "keyPrefix": "ilal_live",
      "permissions": ["verify", "session"],
      "rateLimit": 10,
      "isActive": true,
      "lastUsedAt": "2024-02-15T12:30:00Z",
      "createdAt": "2024-02-01T10:00:00Z",
      "expiresAt": null
    }
  ]
}
```

#### 创建 API Key

```http
POST /api/v1/apikeys
```

**认证**: JWT Token (必需)

**请求体**:
```json
{
  "name": "Production Key",
  "permissions": ["verify", "session"],
  "rateLimit": 10,         // 可选，默认 10
  "expiresIn": 365         // 可选，有效期（天）
}
```

**响应** (201):
```json
{
  "apiKey": "ilal_live_1234567890abcdef1234567890abcdef12345678",
  "id": "cly123456",
  "name": "Production Key",
  "keyPrefix": "ilal_live",
  "permissions": ["verify", "session"],
  "rateLimit": 10,
  "createdAt": "2024-02-15T10:00:00Z",
  "warning": "Please save this API key securely. It will not be shown again."
}
```

⚠️ **注意**: API Key 完整值仅在创建时显示一次，请妥善保存。

#### 更新 API Key

```http
PATCH /api/v1/apikeys/:id
```

**认证**: JWT Token (必需)

**请求体**:
```json
{
  "name": "Updated Key Name",
  "rateLimit": 50
}
```

**响应** (200):
```json
{
  "apiKey": {
    "id": "cly123456",
    "name": "Updated Key Name",
    "rateLimit": 50,
    ...
  }
}
```

#### 撤销 API Key

```http
DELETE /api/v1/apikeys/:id
```

**认证**: JWT Token (必需)

**响应** (200):
```json
{
  "message": "API key revoked successfully"
}
```

---

### ⚡ ZK Proof 验证

#### 验证 Proof 并激活 Session

```http
POST /api/v1/verify
```

**认证**: API Key (必需)

**请求体**:
```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "proof": "0x1234567890abcdef...",
  "publicInputs": [
    "12345678901234567890",
    "98765432109876543210"
  ]
}
```

**响应** (200):
```json
{
  "success": true,
  "txHash": "0xabcdef1234567890...",
  "sessionExpiry": "1709308800",
  "gasUsed": "125000",
  "responseTime": 3500
}
```

**Session 已激活** (200):
```json
{
  "success": true,
  "alreadyActive": true,
  "sessionExpiry": "1709308800",
  "remainingSeconds": 86400
}
```

**Proof 验证失败** (400):
```json
{
  "success": false,
  "error": "Invalid proof",
  "message": "ZK Proof verification failed"
}
```

#### 查询 Session 状态

```http
GET /api/v1/session/:address
```

**认证**: API Key (必需)

**参数**:
- `address` - 用户以太坊地址

**响应** (200):
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "isActive": true,
  "remainingSeconds": 86400,
  "expiresAt": "2024-02-16T10:00:00Z"
}
```

---

### 📊 使用统计

#### 获取使用统计

```http
GET /api/v1/usage/stats
```

**认证**: JWT Token (必需)

**响应** (200):
```json
{
  "usage": {
    "totalCalls": 150,
    "successfulCalls": 145,
    "failedCalls": 5,
    "totalCost": 175.0,
    "byEndpoint": {
      "/api/v1/verify": 100,
      "/api/v1/session/:address": 50
    }
  },
  "quota": {
    "limit": 10000,
    "remaining": 9850,
    "resetDate": "2024-03-01T00:00:00Z"
  },
  "plan": {
    "current": "PRO",
    "limits": {
      "monthlyQuota": 10000,
      "rateLimit": 100,
      "rateLimitWindow": 60000
    }
  }
}
```

---

### 💰 计费

#### 获取套餐列表

```http
GET /api/v1/billing/plans
```

**响应** (200):
```json
{
  "plans": [
    {
      "id": "FREE",
      "name": "免费版",
      "price": 0,
      "currency": "USD",
      "interval": "month",
      "features": {
        "monthlyQuota": 100,
        "rateLimit": 10,
        "support": "社区"
      }
    },
    {
      "id": "PRO",
      "name": "专业版",
      "price": 99,
      "currency": "USD",
      "interval": "month",
      "features": {
        "monthlyQuota": 10000,
        "rateLimit": 100,
        "support": "Email"
      }
    },
    {
      "id": "ENTERPRISE",
      "name": "企业版",
      "price": null,
      "currency": "USD",
      "interval": "month",
      "features": {
        "monthlyQuota": "无限制",
        "rateLimit": 1000,
        "support": "专属",
        "customization": true
      }
    }
  ]
}
```

#### 升级套餐

```http
POST /api/v1/billing/upgrade
```

**认证**: JWT Token (必需)

**请求体**:
```json
{
  "targetPlan": "PRO"
}
```

**响应** (200):
```json
{
  "message": "Plan upgraded successfully",
  "newPlan": "PRO"
}
```

#### 获取账单历史

```http
GET /api/v1/billing/invoices
```

**认证**: JWT Token (必需)

**响应** (200):
```json
{
  "subscriptions": [
    {
      "id": "sub_123456",
      "plan": "PRO",
      "status": "ACTIVE",
      "currentPeriodStart": "2024-02-01T00:00:00Z",
      "currentPeriodEnd": "2024-03-01T00:00:00Z",
      "createdAt": "2024-02-01T00:00:00Z"
    }
  ]
}
```

---

### 🏥 健康检查

#### 服务健康检查

```http
GET /api/v1/health
```

**响应** (200):
```json
{
  "status": "ok",
  "service": "ILAL API",
  "relay": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "network": "base-sepolia",
  "latestBlock": "12345678",
  "timestamp": "2024-02-15T10:00:00Z"
}
```

---

## 套餐对比

| 功能 | 免费版 | 专业版 | 企业版 |
|------|--------|--------|--------|
| **月调用次数** | 100 | 10,000 | 无限制 |
| **限流** | 10/min | 100/min | 1000/min |
| **API Keys** | 2 | 10 | 无限制 |
| **技术支持** | 社区 | Email | 专属 |
| **价格** | $0 | $99/月 | 定制 |

## 错误码

| 错误码 | 说明 |
|--------|------|
| `Bad Request` | 请求参数错误 |
| `Unauthorized` | 未提供认证凭证或凭证无效 |
| `Forbidden` | 权限不足 |
| `Not Found` | 资源不存在 |
| `Conflict` | 资源冲突（如邮箱已注册） |
| `Payment Required` | 配额不足，需要升级套餐 |
| `Too Many Requests` | 请求过于频繁 |
| `Internal Server Error` | 服务器内部错误 |

## SDK 集成

### JavaScript/TypeScript

```bash
npm install @ilal/sdk
```

```typescript
import { ILALApiClient } from '@ilal/sdk';

const client = new ILALApiClient({
  apiKey: 'ilal_live_xxxxx',
  apiBaseUrl: 'https://api.ilal.tech',
  chainId: 8453,
});

// 验证并激活
const result = await client.verifyAndActivate({
  userAddress: '0x...',
  proof: '0x...',
  publicInputs: ['123', '456'],
});

console.log('Session activated:', result.txHash);
```

## 最佳实践

1. **安全存储 API Key**: 使用环境变量，不要硬编码在代码中
2. **实现重试逻辑**: 对于网络错误和临时故障
3. **监控配额**: 定期检查使用统计，避免配额耗尽
4. **错误处理**: 妥善处理各种错误响应
5. **限流处理**: 根据响应头动态调整请求频率

## 联系支持

- **文档**: https://docs.ilal.tech
- **GitHub**: https://github.com/ilal-xyz/ilal
- **Email**: support@ilal.tech
- **Discord**: https://discord.gg/ilal
