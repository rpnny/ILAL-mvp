# 🚂 Railway Web 部署指南

**预计时间**: 10-15 分钟

---

## 📋 准备工作

### 1. 已生成的密钥

你的生产环境密钥已经生成在 `.env.production` 文件中：

```bash
JWT_SECRET=4rhgCcWNOFug8PGrNEn0GjZwB5uQrNNb
API_KEY_SECRET=mMvSp8VWMqLYib0XQvjtWbvUVXW91HRJ
POSTGRES_PASSWORD=Geubvt1fZsJcN97MjZLlMaIZeUZrrMNV
```

### 2. 需要准备的信息

- ✅ GitHub 账号
- ✅ Resend API Key（你已经有了）
- ✅ 发件人邮箱地址

---

## 🚀 部署步骤

### 步骤 1: 访问 Railway

1. 打开浏览器，访问 [Railway.app](https://railway.app)
2. 点击 **"Login"** 或 **"Start a New Project"**
3. 使用 GitHub 账号登录

### 步骤 2: 创建新项目

1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 如果是第一次使用，点击 **"Configure GitHub App"**
   - 授权 Railway 访问你的 GitHub 仓库
4. 选择 `ilal` 仓库

### 步骤 3: 配置项目

在项目配置页面：

1. **Service Name**: 保持默认或改为 `ilal-api`

2. **Root Directory**: 
   - 点击 **"Settings"** 标签
   - 找到 **"Root Directory"** 设置
   - 输入: `apps/api`
   - 点击保存

3. **Build Command**: 
   - 在 **"Settings"** → **"Build"** 部分
   - 输入: `npm install && npx prisma generate && npm run build`

4. **Start Command**:
   - 在 **"Settings"** → **"Deploy"** 部分
   - 输入: `npx prisma migrate deploy && node dist/index.js`

### 步骤 4: 添加 PostgreSQL 数据库

1. 在项目页面，点击 **"New"** 按钮
2. 选择 **"Database"**
3. 选择 **"Add PostgreSQL"**
4. Railway 会自动创建数据库并生成连接字符串
5. 数据库的 `DATABASE_URL` 环境变量会自动添加到你的服务中

### 步骤 5: 配置环境变量

1. 点击你的服务（ilal-api）
2. 进入 **"Variables"** 标签
3. 点击 **"New Variable"** 或 **"Raw Editor"**（批量添加）

**复制以下内容并粘贴到 Raw Editor**:

```bash
# 基础配置
NODE_ENV=production
PORT=3001

# 数据库连接（自动生成，无需修改）
# DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT 配置（使用生成的密钥）
JWT_SECRET=4rhgCcWNOFug8PGrNEn0GjZwB5uQrNNb
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# API Key 配置（使用生成的密钥）
API_KEY_SECRET=mMvSp8VWMqLYib0XQvjtWbvUVXW91HRJ

# 邮件配置（替换为你的实际值）
RESEND_API_KEY=re_your_actual_key_here
FROM_EMAIL=ILAL <noreply@yourdomain.com>

# 区块链配置（可选，如不需要可以留空）
RPC_URL=https://base-sepolia-rpc.publicnode.com
CHAIN_ID=84532
SESSION_MANAGER_ADDRESS=0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2
VERIFIER_ADDRESS=0x0cDcD82E5efba9De4aCc255402968397F323AFBB
VERIFIER_PRIVATE_KEY=

# 限流配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_FREE=10
RATE_LIMIT_MAX_REQUESTS_PRO=100
RATE_LIMIT_MAX_REQUESTS_ENTERPRISE=1000

# 日志配置
LOG_LEVEL=info

# CORS（替换为你的前端域名）
CORS_ORIGIN=*
```

**⚠️ 重要：请替换以下值：**
- `RESEND_API_KEY` - 你的 Resend API Key
- `FROM_EMAIL` - 你的发件人邮箱
- `CORS_ORIGIN` - 你的前端域名（生产环境建议设置具体域名）
- `VERIFIER_PRIVATE_KEY` - 如果需要区块链功能，填入私钥

### 步骤 6: 部署

1. 配置完成后，Railway 会自动开始部署
2. 在 **"Deployments"** 标签可以看到部署进度
3. 等待构建和部署完成（约 2-5 分钟）

### 步骤 7: 获取应用 URL

1. 部署成功后，进入 **"Settings"** 标签
2. 找到 **"Networking"** 部分
3. 点击 **"Generate Domain"**
4. Railway 会自动生成一个域名，例如：
   ```
   https://ilal-api-production.up.railway.app
   ```

---

## ✅ 验证部署

### 1. 测试健康检查

在浏览器或终端测试：

```bash
curl https://your-app.up.railway.app/api/v1/health
```

期望响应：
```json
{
  "status": "ok",
  "service": "ILAL API",
  "timestamp": "2026-02-17T...",
  "database": "connected",
  "blockchain": {
    "connected": false,
    "note": "Blockchain features disabled"
  }
}
```

### 2. 测试用户注册

```bash
curl -X POST https://your-app.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!@#$",
    "name": "Test User"
  }'
```

如果成功，你应该：
1. 收到 JSON 响应，包含用户信息和 Token
2. 收到验证邮件（如果配置了 Resend）

---

## 🔧 查看日志和监控

### 查看实时日志

1. 在 Railway 项目页面
2. 点击你的服务
3. 进入 **"Deployments"** 标签
4. 点击最新的部署
5. 查看 **"View Logs"** 或 **"Build Logs"**

### 监控指标

1. 在 **"Metrics"** 标签查看：
   - CPU 使用率
   - 内存使用率
   - 网络流量
   - 请求延迟

---

## 🌐 绑定自定义域名（可选）

### 步骤 1: 在 Railway 添加域名

1. 进入 **"Settings"** → **"Networking"**
2. 在 **"Custom Domains"** 部分点击 **"Add Domain"**
3. 输入你的域名，例如：`api.yourdomain.com`

### 步骤 2: 配置 DNS

Railway 会提供 CNAME 记录，例如：

```
Type: CNAME
Name: api
Value: your-app.up.railway.app
```

在你的域名服务商（如 Cloudflare、Namecheap）添加这条记录。

### 步骤 3: 等待验证

- DNS 传播可能需要几分钟到几小时
- Railway 会自动配置 SSL 证书

---

## 🔄 更新部署

当你推送代码到 GitHub 时，Railway 会自动重新部署：

1. 提交代码：
   ```bash
   git add .
   git commit -m "Update API"
   git push origin main
   ```

2. Railway 自动检测并部署

3. 在 **"Deployments"** 标签查看进度

---

## ❌ 故障排查

### 问题 1: 构建失败

**错误**: `Cannot find module '@prisma/client'`

**解决方法**:
1. 检查 Build Command 是否包含 `npx prisma generate`
2. 在 Railway Settings → Build 中确认命令

### 问题 2: 应用无法启动

**错误**: `Error: RESEND_API_KEY not set`

**解决方法**:
1. 进入 Variables 标签
2. 检查是否添加了 `RESEND_API_KEY`
3. 如果不需要邮件功能，可以暂时留空

### 问题 3: 数据库连接失败

**错误**: `Can't reach database server`

**解决方法**:
1. 确认已添加 PostgreSQL 数据库
2. 检查 `DATABASE_URL` 变量是否正确
3. 尝试重新部署

### 问题 4: 查看详细错误

1. 进入 **"Deployments"** 标签
2. 点击失败的部署
3. 查看 **"Build Logs"** 和 **"Deploy Logs"**
4. 搜索错误信息

---

## 📊 成本估算

Railway 按使用量计费：

**免费额度**:
- $5 免费额度/月
- 足够小型应用使用

**付费后**:
- PostgreSQL: ~$5/月（512MB RAM）
- API 服务: ~$5/月（512MB RAM）
- 带宽: 按流量计费

**预计总成本**: $5-15/月（小到中型应用）

---

## 🎉 部署完成检查清单

- [ ] Railway 项目已创建
- [ ] PostgreSQL 数据库已添加
- [ ] 所有环境变量已配置
- [ ] Root Directory 设置为 `apps/api`
- [ ] 构建和部署成功
- [ ] 健康检查 API 返回 200 OK
- [ ] 用户注册功能正常
- [ ] 邮件发送正常（如配置）
- [ ] 域名已绑定（如需要）

---

## 📚 相关资源

- [Railway 官方文档](https://docs.railway.app)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)
- [完整部署指南](./docs/DEPLOYMENT_GUIDE.md)
- [邮件配置指南](./docs/EMAIL_SETUP.md)

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看 Railway 日志
2. 参考完整部署指南
3. 检查环境变量配置
4. 联系团队支持

---

**祝你部署顺利！** 🚀

---

*创建时间: 2026-02-17*
*预计部署时间: 10-15 分钟*
