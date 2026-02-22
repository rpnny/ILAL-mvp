# ILAL API 环境配置指南

## 📋 前置要求

- Node.js >= 18.0.0
- PostgreSQL >= 13 (或 SQLite 用于开发)
- pnpm >= 8.0.0 (推荐) 或 npm

## 🚀 快速开始

### 方式 1: 使用 PostgreSQL (推荐用于生产)

#### 1. 安装 PostgreSQL

**macOS**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Docker** (最简单):
```bash
docker run -d \
  --name ilal-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ilal_saas \
  -p 5432:5432 \
  postgres:15
```

#### 2. 创建数据库

```bash
# 如果使用本地 PostgreSQL
createdb ilal_saas

# 或者使用 psql
psql -U postgres
CREATE DATABASE ilal_saas;
\q
```

#### 3. 配置环境变量

```bash
cd apps/api

# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 数据库配置
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ilal_saas"

# JWT 配置（请更改为随机字符串）
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# API Key 加密密钥（请更改为随机字符串）
API_KEY_SECRET="$(openssl rand -base64 32)"

# 服务器配置
PORT=3001
NODE_ENV="development"

# 区块链配置 (Base Sepolia)
RPC_URL="https://base-sepolia-rpc.publicnode.com"
CHAIN_ID=84532
VERIFIER_PRIVATE_KEY="0x..."

# 合约地址
SESSION_MANAGER_ADDRESS="0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2"
VERIFIER_ADDRESS="0x0cDcD82E5efba9De4aCc255402968397F323AFBB"

# 邮件配置（可选，用于发送验证码）
# 如果不配置，验证码会打印在日志中
RESEND_API_KEY=""
FROM_EMAIL="ILAL <noreply@ilal.tech>"
```

#### 4. 初始化数据库

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npm run db:generate

# 推送 Schema 到数据库
npm run db:push

# 或者使用迁移（生产环境推荐）
npm run db:migrate
```

#### 5. 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

服务将运行在 `http://localhost:3001`

---

### 方式 2: 使用 SQLite (快速开发)

#### 1. 修改 Prisma Schema

编辑 `prisma/schema.prisma`：

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

#### 2. 配置环境变量

```bash
cd apps/api
cp .env.example .env
```

编辑 `.env`，将 `DATABASE_URL` 改为：

```bash
DATABASE_URL="file:./prisma/dev.db"
```

#### 3. 初始化并启动

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

---

## 🧪 测试 API

### 1. 健康检查

```bash
curl http://localhost:3001/api/v1/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T10:00:00.000Z",
  "database": "connected"
}
```

### 2. 运行自动化测试

```bash
# 确保服务已启动
npm run dev

# 在另一个终端运行测试脚本
./test-api.sh
```

### 3. 手动测试

参考 `API_TEST_GUIDE.md` 进行手动测试。

---

## 🗄️ 数据库管理

### Prisma Studio (可视化界面)

```bash
npm run db:studio
```

浏览器会自动打开 `http://localhost:5555`，可以查看和编辑数据。

### 数据库迁移

创建新迁移：
```bash
npm run db:migrate
```

重置数据库：
```bash
npx prisma migrate reset
```

### 查询数据

```sql
-- 查看所有用户
SELECT * FROM "User";

-- 查看验证码
SELECT u.email, vc.code, vc.type, vc."expiresAt", vc.used
FROM "VerificationCode" vc
JOIN "User" u ON u.id = vc."userId"
ORDER BY vc."createdAt" DESC;

-- 查看 API Keys
SELECT u.email, ak.name, ak."keyPrefix", ak."isActive"
FROM "ApiKey" ak
JOIN "User" u ON u.id = ak."userId";
```

---

## 📧 邮件服务配置 (可选)

### 使用 Resend (推荐)

1. 注册账号：https://resend.com/
2. 获取 API Key
3. 配置 `.env`：

```bash
RESEND_API_KEY="re_xxxxxxxxxxxxx"
FROM_EMAIL="ILAL <noreply@yourdomain.com>"
```

### 测试邮件发送

注册新用户后，检查邮箱是否收到验证码。

如果未配置 `RESEND_API_KEY`，验证码会打印在服务器日志中：

```bash
# 查看日志
tail -f logs/*.log

# 或直接查看控制台输出
```

---

## 🔐 生成安全密钥

### JWT Secret

```bash
openssl rand -base64 32
```

### API Key Secret

```bash
openssl rand -base64 32
```

### Verifier Private Key

如果需要部署新的 Verifier，使用以下命令生成私钥：

```bash
# 使用 cast (Foundry 工具链)
cast wallet new

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ **警告**: 永远不要在公共仓库中提交私钥！

---

## 🐳 Docker 部署 (可选)

### 1. 创建 Dockerfile

已包含在 `apps/api/Dockerfile`。

### 2. 使用 Docker Compose

```bash
cd apps/api
docker-compose up -d
```

### 3. 查看日志

```bash
docker-compose logs -f api
```

---

## 🔧 常见问题

### 1. 数据库连接失败

**错误**: `Can't reach database server`

**解决方法**:
- 确保 PostgreSQL 已启动
- 检查 `DATABASE_URL` 配置
- 测试连接：`psql -U postgres -d ilal_saas`

### 2. Prisma Client 未生成

**错误**: `Cannot find module '@prisma/client'`

**解决方法**:
```bash
npm run db:generate
```

### 3. 端口已被占用

**错误**: `EADDRINUSE: address already in use :::3001`

**解决方法**:
```bash
# 查找占用端口的进程
lsof -i :3001

# 杀死进程
kill -9 <PID>

# 或者修改 .env 中的 PORT
```

### 4. 邮箱验证码未收到

**解决方法**:
- 检查 `RESEND_API_KEY` 是否正确配置
- 查看服务器日志获取验证码
- 在开发环境中，验证码会打印在控制台

### 5. API Key 无法创建

**错误**: `Maximum API keys limit reached for FREE plan (2)`

**解决方法**:
- 删除现有的 API Key
- 或升级套餐（修改数据库中的 `plan` 字段）

```sql
-- 升级到 PRO 套餐
UPDATE "User" SET plan = 'PRO' WHERE email = 'user@example.com';
```

---

## 📊 监控和日志

### 查看日志

```bash
# 实时日志
tail -f logs/*.log

# 搜索错误
grep -i error logs/*.log

# 查看特定用户的日志
grep "userId.*clxxx" logs/*.log
```

### 日志级别

在 `.env` 中配置：

```bash
LOG_LEVEL="info"  # debug | info | warn | error
```

---

## 🚀 生产环境部署

### 环境变量检查清单

- [ ] `DATABASE_URL` 指向生产数据库
- [ ] `JWT_SECRET` 使用强随机密钥
- [ ] `API_KEY_SECRET` 使用强随机密钥
- [ ] `NODE_ENV` 设置为 `production`
- [ ] `VERIFIER_PRIVATE_KEY` 使用专用密钥
- [ ] `RESEND_API_KEY` 已配置
- [ ] `CORS_ORIGIN` 限制为特定域名

### 部署到 Vercel

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel --prod
```

### 部署到 Railway

1. 连接 GitHub 仓库
2. 选择 `apps/api` 目录
3. 添加 PostgreSQL 插件
4. 配置环境变量
5. 部署

### 部署到 Fly.io

```bash
# 安装 Fly CLI
curl -L https://fly.io/install.sh | sh

# 初始化
fly launch

# 部署
fly deploy
```

---

## 📚 下一步

现在环境已配置完成，你可以：

1. ✅ 运行自动化测试：`./test-api.sh`
2. ✅ 阅读 API 文档：`API_TEST_GUIDE.md`
3. ✅ 集成前端应用
4. ✅ 配置监控和告警
5. ✅ 部署到生产环境

祝你使用愉快！🎉
