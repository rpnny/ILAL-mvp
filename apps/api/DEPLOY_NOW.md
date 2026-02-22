# 🚀 立即部署 - 快速参考

**你的生产环境密钥已生成！现在可以开始部署了。**

---

## 📋 第 1 步：访问 Railway

👉 **打开浏览器访问**: [Railway.app](https://railway.app)

1. 使用 GitHub 账号登录
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 选择 `ilal` 仓库

---

## ⚙️ 第 2 步：配置项目

### Root Directory
```
apps/api
```

### Build Command
```bash
npm install && npx prisma generate && npm run build
```

### Start Command
```bash
npx prisma migrate deploy && node dist/index.js
```

---

## 🗄️ 第 3 步：添加数据库

1. 点击 **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway 会自动配置 `DATABASE_URL`

---

## 🔐 第 4 步：配置环境变量

进入 **"Variables"** 标签，点击 **"Raw Editor"**，复制粘贴以下内容：

```bash
# 基础配置
NODE_ENV=production
PORT=3001

# JWT 配置（已生成）
JWT_SECRET=4rhgCcWNOFug8PGrNEn0GjZwB5uQrNNb
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# API Key 配置（已生成）
API_KEY_SECRET=mMvSp8VWMqLYib0XQvjtWbvUVXW91HRJ

# ⚠️ 邮件配置（请替换为你的实际值）
RESEND_API_KEY=re_your_actual_key_here
FROM_EMAIL=ILAL <noreply@yourdomain.com>

# 区块链配置（可选）
RPC_URL=https://base-sepolia-rpc.publicnode.com
CHAIN_ID=84532
SESSION_MANAGER_ADDRESS=0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2
VERIFIER_ADDRESS=0x0cDcD82E5efba9De4aCc255402968397F323AFBB
VERIFIER_PRIVATE_KEY=

# 其他配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_FREE=10
RATE_LIMIT_MAX_REQUESTS_PRO=100
RATE_LIMIT_MAX_REQUESTS_ENTERPRISE=1000
LOG_LEVEL=info
CORS_ORIGIN=*
```

**⚠️ 必须替换：**
- `RESEND_API_KEY` - 你的 Resend API Key
- `FROM_EMAIL` - 你的发件人邮箱

---

## 🚀 第 5 步：部署

配置完成后，Railway 会自动部署。等待 2-5 分钟。

---

## 🌐 第 6 步：获取 URL

1. 进入 **"Settings"** → **"Networking"**
2. 点击 **"Generate Domain"**
3. 获得 URL，例如：`https://ilal-api-production.up.railway.app`

---

## ✅ 第 7 步：测试

在终端测试（替换为你的实际 URL）：

```bash
# 测试健康检查
curl https://your-app.up.railway.app/api/v1/health

# 测试注册
curl -X POST https://your-app.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!@#$"}'
```

---

## 📚 详细文档

- **完整步骤**: `RAILWAY_DEPLOYMENT_GUIDE.md`
- **环境变量**: `.env.production`
- **邮件配置**: `docs/EMAIL_SETUP.md`

---

## 🆘 遇到问题？

查看 Railway 的 **"Deployments"** → **"Logs"** 获取错误信息。

---

**预计时间**: 10-15 分钟
**开始时间**: 现在！👇

👉 [打开 Railway.app](https://railway.app)
