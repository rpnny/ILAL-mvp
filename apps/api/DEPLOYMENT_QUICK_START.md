# 🚀 快速部署指南

**最快 5 分钟完成部署！**

---

## 🎯 推荐部署方案

根据你的需求选择：

| 场景 | 推荐平台 | 预计时间 |
|------|---------|---------|
| 快速测试 | Railway | 5 分钟 |
| 正式上线 | Railway/Fly.io | 10 分钟 |
| 企业级 | AWS/自建 | 30+ 分钟 |

---

## ⚡ 方案 1: Railway（最快）

### 特点
- ✅ **最简单** - 一键部署
- ✅ **内置数据库** - 无需单独配置
- ✅ **自动 HTTPS** - 开箱即用
- ✅ **免费开始** - $5/月起

### 部署步骤

#### 方法 A: 使用自动化脚本（推荐）

```bash
cd apps/api

# 运行快速部署脚本
./scripts/quick-deploy-railway.sh
```

脚本会自动：
1. 创建 Railway 项目
2. 添加 PostgreSQL 数据库
3. 配置所有环境变量
4. 部署应用

#### 方法 B: 手动部署

1. **访问 [Railway.app](https://railway.app)**

2. **点击 "New Project"**

3. **选择 "Deploy from GitHub repo"**
   - 连接 GitHub 账号
   - 选择 `ilal` 仓库
   - Root Directory: `apps/api`

4. **添加 PostgreSQL**
   - 点击 "New" → "Database" → "PostgreSQL"
   - Railway 自动配置 `DATABASE_URL`

5. **配置环境变量**

   在 Variables 标签页添加：
   
   ```bash
   NODE_ENV=production
   PORT=3001
   
   # 必需
   JWT_SECRET=<运行: openssl rand -base64 32>
   API_KEY_SECRET=<运行: openssl rand -base64 32>
   RESEND_API_KEY=re_your_key_here
   FROM_EMAIL=ILAL <noreply@yourdomain.com>
   
   # 可选（区块链功能）
   VERIFIER_PRIVATE_KEY=0x...
   RPC_URL=https://base-sepolia-rpc.publicnode.com
   CHAIN_ID=84532
   SESSION_MANAGER_ADDRESS=0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2
   VERIFIER_ADDRESS=0x0cDcD82E5efba9De4aCc255402968397F323AFBB
   ```

6. **部署**
   
   Railway 会自动构建和部署

7. **测试**
   
   ```bash
   curl https://your-app.up.railway.app/api/v1/health
   ```

### 获取生产 URL

```bash
# 使用 Railway CLI
railway domain

# 或在 Dashboard 的 Settings → Networking 查看
```

---

## ⚡ 方案 2: Vercel（适合轻量级 API）

### 特点
- ✅ **零配置** - 自动检测
- ✅ **免费套餐** - Hobby 计划免费
- ⚠️ **限制** - 10 秒执行时间

### 部署步骤

1. **安装 Vercel CLI**

```bash
npm install -g vercel
```

2. **登录**

```bash
vercel login
```

3. **部署**

```bash
cd apps/api
vercel --prod
```

4. **配置环境变量**

```bash
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add API_KEY_SECRET production
vercel env add RESEND_API_KEY production
vercel env add FROM_EMAIL production
```

5. **重新部署**

```bash
vercel --prod
```

---

## ⚡ 方案 3: Fly.io（全球边缘网络）

### 特点
- ✅ **边缘网络** - 全球低延迟
- ✅ **免费额度** - 3 个共享 CPU VM
- ✅ **Docker 原生** - 完全控制

### 部署步骤

1. **安装 Fly CLI**

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

2. **登录**

```bash
flyctl auth login
```

3. **初始化项目**

```bash
cd apps/api
flyctl launch

# 选择:
# - PostgreSQL: Yes
# - Redis: No
```

4. **配置密钥**

```bash
flyctl secrets set \
  JWT_SECRET="$(openssl rand -base64 32)" \
  API_KEY_SECRET="$(openssl rand -base64 32)" \
  RESEND_API_KEY="re_your_key" \
  FROM_EMAIL="ILAL <noreply@yourdomain.com>"
```

5. **部署**

```bash
flyctl deploy
```

6. **测试**

```bash
curl https://your-app.fly.dev/api/v1/health
```

---

## 🔧 部署前准备

### 1. 生成密钥

```bash
# 进入 API 目录
cd apps/api

# 运行密钥生成脚本
./scripts/generate-secrets.sh
```

这会生成 `.env.production` 文件，包含：
- JWT_SECRET
- API_KEY_SECRET
- POSTGRES_PASSWORD

### 2. 配置 Resend API

1. 访问 [Resend.com](https://resend.com)
2. 注册账号
3. 创建 API Key
4. 复制 API Key（以 `re_` 开头）

详细步骤见 [EMAIL_SETUP.md](./docs/EMAIL_SETUP.md)

### 3. 准备数据库

选项 A: **使用平台内置数据库**（推荐）
- Railway: 自动创建
- Fly.io: 通过 `flyctl launch` 创建

选项 B: **使用外部数据库**
- [Supabase](https://supabase.com) - 免费 500MB
- [Neon](https://neon.tech) - 免费 3GB
- [ElephantSQL](https://elephantsql.com) - 免费 20MB

---

## ✅ 部署检查清单

部署完成后，确认：

- [ ] 健康检查返回 200 OK
  ```bash
  curl https://your-app-url/api/v1/health
  ```

- [ ] 注册新用户成功
  ```bash
  curl -X POST https://your-app-url/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test1234!@#$"}'
  ```

- [ ] 收到验证邮件

- [ ] 数据库连接正常

- [ ] 环境变量配置正确

- [ ] HTTPS 已启用

---

## 🚨 常见问题

### 问题 1: 构建失败

**错误**: `Module not found: Can't resolve '@prisma/client'`

**解决**:
```bash
# 确保 Prisma Client 已生成
npm run db:generate
```

### 问题 2: 数据库连接失败

**错误**: `Can't reach database server`

**解决**:
- 检查 `DATABASE_URL` 格式是否正确
- 确认数据库服务已启动
- 运行数据库迁移：`npx prisma migrate deploy`

### 问题 3: 邮件发送失败

**错误**: `RESEND_API_KEY not set`

**解决**:
1. 确认已配置 `RESEND_API_KEY` 环境变量
2. API Key 以 `re_` 开头
3. 检查 Resend Dashboard 的使用配额

---

## 📊 监控部署

### Railway

```bash
# 查看日志
railway logs

# 查看状态
railway status

# 打开仪表板
railway open
```

### Vercel

```bash
# 查看部署列表
vercel ls

# 查看日志
vercel logs
```

### Fly.io

```bash
# 查看日志
flyctl logs

# 查看状态
flyctl status

# 打开仪表板
flyctl dashboard
```

---

## 🎉 部署成功！

现在你可以：

1. **测试 API**
   ```bash
   curl https://your-app-url/api/v1/health
   ```

2. **集成前端**
   ```typescript
   import { ILALApiClient } from '@ilal/sdk';
   
   const client = new ILALApiClient({
     baseUrl: 'https://your-app-url',
     apiKey: 'ilal_live_...',
   });
   ```

3. **监控运行状态**
   - 查看平台仪表板
   - 设置告警
   - 监控日志

4. **绑定自定义域名**（可选）
   - Railway: Settings → Networking → Custom Domains
   - Vercel: Settings → Domains
   - Fly.io: `flyctl certs add yourdomain.com`

---

## 📚 相关文档

- [完整部署指南](./docs/DEPLOYMENT_GUIDE.md) - 详细步骤和最佳实践
- [邮件配置](./docs/EMAIL_SETUP.md) - Resend API 配置
- [API 测试指南](./API_TEST_GUIDE.md) - 测试 API 端点
- [环境配置](./SETUP.md) - 本地开发环境

---

**需要帮助？** 查看完整文档或联系支持团队。

祝你部署顺利！🚀
