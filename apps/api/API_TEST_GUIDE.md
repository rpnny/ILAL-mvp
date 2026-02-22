# ILAL API 测试指南

## 📋 功能清单

✅ 用户注册 (Register)
✅ 邮箱验证码验证 (Email Verification)
✅ API 密钥创建 (API Key Management)

## 🚀 快速开始

### 1. 环境配置

```bash
cd apps/api

# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，填入必要配置
# - DATABASE_URL: PostgreSQL 连接字符串
# - JWT_SECRET: JWT 密钥
# - API_KEY_SECRET: API Key 加密盐
# - RESEND_API_KEY: (可选) 邮件服务 API Key
```

### 2. 安装依赖

```bash
npm install
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 推送数据库 Schema (开发环境)
npm run db:push

# 或者运行迁移 (生产环境)
npm run db:migrate
```

### 4. 启动服务

```bash
# 开发模式 (热重载)
npm run dev

# 生产模式
npm run build && npm start
```

服务将运行在 `http://localhost:3001`

---

## 📡 API 端点测试

### 1️⃣ 用户注册

**端点**: `POST /api/v1/auth/register`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123",
  "name": "张三",
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

**响应** (201 Created):
```json
{
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "张三",
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "plan": "FREE",
    "emailVerified": false,
    "createdAt": "2026-02-17T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Registration successful. Please check your email for the verification code.",
  "requiresVerification": true
}
```

**注意事项**:
- 密码必须至少 8 个字符
- 邮箱必须唯一
- 钱包地址必须唯一（如果提供）
- 注册后会发送 6 位验证码到邮箱（有效期 15 分钟）

**测试命令** (curl):
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!@#$",
    "name": "测试用户"
  }'
```

---

### 2️⃣ 验证邮箱

**端点**: `POST /api/v1/auth/verify-email`

**请求体**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应** (200 OK):
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "张三",
    "plan": "FREE",
    "emailVerified": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**测试命令**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

**验证码获取方式**:
- 如果配置了 `RESEND_API_KEY`，验证码会发送到邮箱
- 如果未配置，验证码会打印在服务器日志中（开发模式）

---

### 3️⃣ 重新发送验证码

**端点**: `POST /api/v1/auth/resend-code`

**请求体**:
```json
{
  "email": "user@example.com"
}
```

**响应** (200 OK):
```json
{
  "message": "Verification code sent. Please check your email."
}
```

**限制**:
- 每小时最多发送 5 次
- 每个验证码有效期 15 分钟

---

### 4️⃣ 用户登录

**端点**: `POST /api/v1/auth/login`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123"
}
```

**响应** (200 OK):
```json
{
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "张三",
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "plan": "FREE",
    "emailVerified": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**测试命令**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!@#$"
  }'
```

---

### 5️⃣ 创建 API Key

**端点**: `POST /api/v1/apikeys`

**请求头**:
```
Authorization: Bearer <accessToken>
```

**请求体**:
```json
{
  "name": "Production API Key",
  "permissions": ["verify", "session"],
  "rateLimit": 100,
  "expiresIn": 365
}
```

**响应** (201 Created):
```json
{
  "apiKey": "ilal_live_abcdef1234567890abcdef1234567890",
  "id": "clxxx...",
  "name": "Production API Key",
  "keyPrefix": "ilal",
  "permissions": ["verify", "session"],
  "rateLimit": 100,
  "createdAt": "2026-02-17T10:00:00.000Z",
  "expiresAt": "2027-02-17T10:00:00.000Z",
  "warning": "Please save this API key securely. It will not be shown again."
}
```

**参数说明**:
- `name`: API Key 的名称（必填）
- `permissions`: 权限列表，默认 `["verify", "session"]`
- `rateLimit`: 速率限制（请求/分钟），可选
- `expiresIn`: 过期时间（天数），可选

**测试命令**:
```bash
# 首先从登录响应中获取 accessToken
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X POST http://localhost:3001/api/v1/apikeys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "测试 API Key",
    "permissions": ["verify", "session"]
  }'
```

**套餐限制**:
- FREE: 最多 2 个 API Key
- PRO: 最多 10 个 API Key
- ENTERPRISE: 无限制

---

### 6️⃣ 列出所有 API Keys

**端点**: `GET /api/v1/apikeys`

**请求头**:
```
Authorization: Bearer <accessToken>
```

**响应** (200 OK):
```json
{
  "apiKeys": [
    {
      "id": "clxxx...",
      "name": "Production API Key",
      "keyPrefix": "ilal",
      "permissions": ["verify", "session"],
      "rateLimit": 100,
      "isActive": true,
      "lastUsedAt": "2026-02-17T09:30:00.000Z",
      "createdAt": "2026-02-17T10:00:00.000Z",
      "expiresAt": "2027-02-17T10:00:00.000Z"
    }
  ]
}
```

**测试命令**:
```bash
curl -X GET http://localhost:3001/api/v1/apikeys \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

### 7️⃣ 撤销 API Key

**端点**: `DELETE /api/v1/apikeys/:id`

**请求头**:
```
Authorization: Bearer <accessToken>
```

**响应** (200 OK):
```json
{
  "message": "API key revoked successfully"
}
```

**测试命令**:
```bash
API_KEY_ID="clxxx..."

curl -X DELETE http://localhost:3001/api/v1/apikeys/$API_KEY_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

### 8️⃣ 获取当前用户信息

**端点**: `GET /api/v1/auth/me`

**请求头**:
```
Authorization: Bearer <accessToken>
```

**响应** (200 OK):
```json
{
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "张三",
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "plan": "FREE",
    "emailVerified": true,
    "createdAt": "2026-02-17T10:00:00.000Z",
    "updatedAt": "2026-02-17T10:00:00.000Z"
  }
}
```

---

## 🧪 完整测试流程

使用以下脚本进行端到端测试：

```bash
#!/bin/bash

API_BASE="http://localhost:3001/api/v1"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="Test1234!@#$"

echo "🧪 ILAL API 测试流程"
echo "===================="
echo ""

# 1. 注册
echo "1️⃣ 注册用户..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"测试用户\"
  }")

echo "$REGISTER_RESPONSE" | jq .

ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r .accessToken)
echo "✅ Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# 2. 验证邮箱（需要从日志或邮箱获取验证码）
echo "2️⃣ 请从服务器日志中查找验证码，然后运行："
echo "curl -X POST $API_BASE/auth/verify-email \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\": \"$EMAIL\", \"code\": \"123456\"}'"
echo ""

# 3. 登录
echo "3️⃣ 登录（注意：需要先验证邮箱）..."
# 实际测试时需要先完成邮箱验证
echo ""

# 4. 创建 API Key
echo "4️⃣ 创建 API Key..."
APIKEY_RESPONSE=$(curl -s -X POST "$API_BASE/apikeys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "测试 API Key",
    "permissions": ["verify", "session"]
  }')

echo "$APIKEY_RESPONSE" | jq .
echo ""

# 5. 列出 API Keys
echo "5️⃣ 列出所有 API Keys..."
curl -s -X GET "$API_BASE/apikeys" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
echo ""

echo "✅ 测试完成！"
```

保存为 `test-api.sh` 并运行：
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 📊 数据库查询

查看注册的用户：

```sql
-- 查看所有用户
SELECT id, email, name, plan, "emailVerified", "createdAt" FROM "User";

-- 查看验证码
SELECT u.email, vc.code, vc.type, vc.used, vc."expiresAt"
FROM "VerificationCode" vc
JOIN "User" u ON u.id = vc."userId"
ORDER BY vc."createdAt" DESC;

-- 查看 API Keys
SELECT u.email, ak.name, ak."keyPrefix", ak.permissions, ak."isActive"
FROM "ApiKey" ak
JOIN "User" u ON u.id = ak."userId";
```

使用 Prisma Studio 查看：
```bash
npm run db:studio
```

---

## 🔧 常见问题

### 1. 收不到验证码邮件

如果没有配置 `RESEND_API_KEY`，验证码会打印在服务器日志中：

```bash
# 查看日志
tail -f apps/api/logs/*.log

# 或者直接查看控制台输出
```

### 2. 数据库连接失败

确保 PostgreSQL 已启动，并检查 `DATABASE_URL` 配置：

```bash
# 使用 Docker 启动 PostgreSQL
docker run -d \
  --name ilal-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ilal_saas \
  -p 5432:5432 \
  postgres:15

# 更新 .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ilal_saas"
```

### 3. JWT Token 过期

Access Token 默认有效期为 7 天，可以使用 Refresh Token 刷新：

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

---

## 📚 相关文档

- [完整 API 文档](./docs/API.md)
- [数据库 Schema](./prisma/schema.prisma)
- [部署指南](../../docs/guides/DEPLOYMENT.md)

---

## 🎉 下一步

现在你已经完成了核心功能测试，可以：

1. 集成前端应用（使用 `@ilal/sdk` 的 `ILALApiClient`）
2. 添加更多 API 端点（如密码重置、套餐升级）
3. 部署到生产环境（Vercel、Railway 等）
4. 配置监控和日志（Sentry、LogRocket）

祝你使用愉快！🚀
