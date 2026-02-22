# 🚀 生产环境部署指南

本指南提供将 ILAL API 部署到生产环境的详细步骤，支持多个平台。

---

## 📋 部署前检查清单

在部署之前，确保完成以下准备工作：

### 1. 代码准备
- [ ] 所有功能测试通过
- [ ] 代码已提交到 Git 仓库
- [ ] 移除所有调试代码和 console.log
- [ ] 更新 `README.md` 和文档

### 2. 环境变量准备
- [ ] `DATABASE_URL` - PostgreSQL 连接字符串
- [ ] `JWT_SECRET` - 强随机密钥（32+ 字符）
- [ ] `API_KEY_SECRET` - 强随机密钥（32+ 字符）
- [ ] `RESEND_API_KEY` - Resend 邮件服务 API Key
- [ ] `VERIFIER_PRIVATE_KEY` - 区块链验证私钥（可选）
- [ ] `FROM_EMAIL` - 发件人邮箱地址

### 3. 数据库准备
- [ ] PostgreSQL 数据库已创建
- [ ] 数据库连接字符串已获取
- [ ] 数据库迁移文件已准备

### 4. 安全检查
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 所有密钥都是生产级强度
- [ ] API Key 前缀已配置
- [ ] CORS 配置为特定域名

---

## 🎯 部署选项

根据你的需求选择合适的部署平台：

| 平台 | 特点 | 适用场景 | 价格 |
|------|------|---------|------|
| **Vercel** | 零配置，自动 HTTPS | 快速原型，小型项目 | 免费/专业版 $20/月 |
| **Railway** | 简单易用，内置数据库 | 中小型项目，快速部署 | 按使用量付费（$5起） |
| **Fly.io** | 边缘网络，低延迟 | 全球分布，高性能 | 按使用量付费（免费额度） |
| **AWS ECS/Fargate** | 企业级，可扩展 | 大型项目，复杂架构 | 按需付费 |
| **Docker + VPS** | 完全控制 | 自定义需求 | VPS 费用（$5-20/月） |

---

## 1️⃣ Vercel 部署（推荐：快速部署）

### 特点
- ✅ 零配置，自动 HTTPS
- ✅ 免费套餐可用
- ✅ 自动 CI/CD
- ⚠️ 需要 Serverless 适配
- ⚠️ 10 秒执行时间限制

### 步骤

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

#### 3. 配置 `vercel.json`

文件已创建在 `apps/api/vercel.json`：

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 4. 配置环境变量

```bash
# 在项目根目录运行
cd apps/api

# 添加环境变量
vercel env add DATABASE_URL production
# 粘贴你的 PostgreSQL 连接字符串

vercel env add JWT_SECRET production
# 粘贴生成的密钥

vercel env add API_KEY_SECRET production
vercel env add RESEND_API_KEY production
vercel env add FROM_EMAIL production
vercel env add VERIFIER_PRIVATE_KEY production
```

#### 5. 部署

```bash
# 预览部署（测试）
vercel

# 生产部署
vercel --prod
```

#### 6. 运行数据库迁移

```bash
# 连接到生产数据库
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

#### 7. 访问应用

```
https://your-app.vercel.app/api/v1/health
```

### 注意事项

⚠️ **Vercel 限制**:
- 函数执行时间：10 秒（Hobby）/ 60 秒（Pro）
- 不适合长时间运行的任务
- 适合 API 网关和轻量级服务

---

## 2️⃣ Railway 部署（推荐：全功能）

### 特点
- ✅ 支持长时间运行
- ✅ 内置 PostgreSQL
- ✅ 简单易用
- ✅ 自动 HTTPS
- ✅ 实时日志

### 步骤

#### 1. 创建 Railway 账号

访问 [Railway.app](https://railway.app) 并注册。

#### 2. 连接 GitHub

1. 在 Railway Dashboard 点击 **New Project**
2. 选择 **Deploy from GitHub repo**
3. 授权 Railway 访问你的仓库
4. 选择 `ilal` 仓库

#### 3. 配置项目

1. **Root Directory**: 设置为 `apps/api`
2. **Build Command**: 
   ```bash
   npm install && npx prisma generate && npm run build
   ```
3. **Start Command**:
   ```bash
   npx prisma migrate deploy && node dist/index.js
   ```

#### 4. 添加 PostgreSQL

1. 在 Railway Project 中点击 **New**
2. 选择 **Database** → **PostgreSQL**
3. Railway 会自动生成 `DATABASE_URL` 环境变量

#### 5. 配置环境变量

在 Railway Dashboard 的 **Variables** 标签页添加：

```bash
NODE_ENV=production
PORT=3001

# 自动生成（来自 PostgreSQL 服务）
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 手动添加
JWT_SECRET=your_strong_jwt_secret_here
API_KEY_SECRET=your_strong_api_key_secret_here
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=ILAL <noreply@yourdomain.com>

# 可选
VERIFIER_PRIVATE_KEY=0x...
SESSION_MANAGER_ADDRESS=0x...
VERIFIER_ADDRESS=0x...
RPC_URL=https://base-sepolia-rpc.publicnode.com
CHAIN_ID=84532

# CORS（根据需要配置）
CORS_ORIGIN=https://yourdomain.com
```

#### 6. 部署

Railway 会自动检测代码变更并部署。也可以手动触发：

1. 点击 **Deploy**
2. 等待构建完成
3. 查看部署日志

#### 7. 获取生产 URL

Railway 会自动分配一个 URL，例如：
```
https://ilal-api-production.up.railway.app
```

你也可以绑定自定义域名。

#### 8. 测试

```bash
curl https://your-app.up.railway.app/api/v1/health
```

### Railway 优势

- ✅ **内置数据库**: 无需单独配置 PostgreSQL
- ✅ **实时日志**: 方便调试
- ✅ **环境变量管理**: 简单直观
- ✅ **自动重启**: 服务崩溃自动恢复
- ✅ **监控面板**: CPU、内存、网络监控

---

## 3️⃣ Fly.io 部署（推荐：边缘网络）

### 特点
- ✅ 全球边缘网络
- ✅ 低延迟
- ✅ Docker 原生支持
- ✅ 免费额度充足

### 步骤

#### 1. 安装 Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
iwr https://fly.io/install.ps1 -useb | iex
```

#### 2. 登录 Fly.io

```bash
flyctl auth login
```

#### 3. 初始化项目

```bash
cd apps/api
flyctl launch
```

按提示选择：
- **App name**: `ilal-api` 或自定义
- **Region**: 选择离用户最近的区域
- **PostgreSQL**: 选择 **Yes** 创建数据库
- **Redis**: 选择 **No**（暂不需要）

#### 4. 配置 `fly.toml`

Fly 会自动生成 `fly.toml` 文件，编辑它：

```toml
app = "ilal-api"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3001"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  interval = "30s"
  timeout = "5s"
  grace_period = "10s"
  method = "GET"
  path = "/api/v1/health"
```

#### 5. 配置密钥

```bash
# 设置环境变量
flyctl secrets set \
  JWT_SECRET="your_jwt_secret" \
  API_KEY_SECRET="your_api_key_secret" \
  RESEND_API_KEY="re_your_key" \
  FROM_EMAIL="ILAL <noreply@yourdomain.com>" \
  VERIFIER_PRIVATE_KEY="0x..."
```

#### 6. 部署

```bash
flyctl deploy
```

#### 7. 运行数据库迁移

```bash
# 获取数据库连接字符串
flyctl postgres connect -a your-postgres-app

# 在本地运行迁移
DATABASE_URL="your-fly-postgres-url" npx prisma migrate deploy
```

#### 8. 访问应用

```bash
https://ilal-api.fly.dev/api/v1/health
```

### Fly.io 优势

- ✅ **全球部署**: 自动在多个区域部署
- ✅ **低延迟**: 边缘网络
- ✅ **弹性伸缩**: 自动扩展
- ✅ **免费额度**: 3 个共享 CPU VM

---

## 4️⃣ Docker + VPS 部署（完全控制）

适合需要完全控制服务器的场景。

### 步骤

#### 1. 准备 VPS

选择云服务商（如 DigitalOcean、Linode、AWS Lightsail）：
- **配置**: 1GB RAM, 1 CPU（最低）
- **操作系统**: Ubuntu 22.04 LTS

#### 2. 安装 Docker

```bash
# SSH 登录 VPS
ssh root@your-vps-ip

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装 Docker Compose
sudo apt install docker-compose -y
```

#### 3. 创建 `docker-compose.yml`

在 VPS 上创建项目目录：

```bash
mkdir -p /opt/ilal-api
cd /opt/ilal-api
```

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: ilal_saas
      POSTGRES_USER: ilal
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - ilal-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ilal"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://ilal:${POSTGRES_PASSWORD}@postgres:5432/ilal_saas
      JWT_SECRET: ${JWT_SECRET}
      API_KEY_SECRET: ${API_KEY_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      FROM_EMAIL: ${FROM_EMAIL}
      VERIFIER_PRIVATE_KEY: ${VERIFIER_PRIVATE_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - ilal-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/v1/health')"]
      interval: 30s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    networks:
      - ilal-network

volumes:
  postgres_data:

networks:
  ilal-network:
    driver: bridge
```

#### 4. 创建 `.env` 文件

```bash
cat > .env << EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
API_KEY_SECRET=$(openssl rand -base64 32)
RESEND_API_KEY=re_your_key
FROM_EMAIL=ILAL <noreply@yourdomain.com>
VERIFIER_PRIVATE_KEY=0x...
EOF
```

#### 5. 配置 Nginx（可选，用于 HTTPS）

创建 `nginx.conf`：

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3001;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### 6. 部署代码

```bash
# 克隆仓库
git clone https://github.com/your-org/ilal.git
cd ilal/apps/api

# 或者使用 rsync 上传
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ root@your-vps-ip:/opt/ilal-api/
```

#### 7. 启动服务

```bash
cd /opt/ilal-api
docker-compose up -d
```

#### 8. 运行数据库迁移

```bash
docker-compose exec api npx prisma migrate deploy
```

#### 9. 查看日志

```bash
docker-compose logs -f api
```

#### 10. 配置 SSL（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d yourdomain.com
```

---

## 🔒 生产环境安全清单

### 1. 密钥管理
- [ ] 所有密钥都使用强随机生成
- [ ] 密钥定期轮换（建议 6 个月）
- [ ] 使用密钥管理服务（AWS Secrets Manager、HashiCorp Vault）

### 2. 数据库安全
- [ ] 使用 SSL 连接
- [ ] 启用自动备份
- [ ] 限制数据库访问 IP
- [ ] 定期更新密码

### 3. API 安全
- [ ] 配置 CORS 为特定域名
- [ ] 启用速率限制
- [ ] 使用 HTTPS
- [ ] 添加 API 版本控制
- [ ] 实施 IP 白名单（如需要）

### 4. 监控和日志
- [ ] 配置错误监控（Sentry）
- [ ] 设置日志聚合（LogRocket、Datadog）
- [ ] 配置告警（邮件、Slack）
- [ ] 监控服务器资源

---

## 📊 监控和维护

### 1. 健康检查

所有平台都支持健康检查端点：

```bash
GET /api/v1/health
```

### 2. 日志查看

**Railway**:
```bash
railway logs
```

**Fly.io**:
```bash
flyctl logs
```

**Docker**:
```bash
docker-compose logs -f api
```

### 3. 数据库备份

**自动备份脚本**:

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DATABASE_URL="your-database-url"

# 导出数据库
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/ilal_backup_$DATE.sql"

# 压缩
gzip "$BACKUP_DIR/ilal_backup_$DATE.sql"

# 上传到 S3（可选）
# aws s3 cp "$BACKUP_DIR/ilal_backup_$DATE.sql.gz" s3://your-bucket/backups/

# 清理 7 天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

设置 Cron 任务：
```bash
# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh
```

---

## 🚨 故障排查

### 问题 1: 数据库连接失败

**检查**:
```bash
# 测试数据库连接
psql "$DATABASE_URL"
```

**解决**:
- 检查 `DATABASE_URL` 格式
- 确认数据库服务正在运行
- 检查防火墙规则

### 问题 2: 应用无法启动

**检查日志**:
```bash
# Railway
railway logs

# Docker
docker-compose logs api
```

**常见原因**:
- 环境变量缺失
- 数据库迁移未运行
- 端口冲突

### 问题 3: 邮件发送失败

**检查**:
- Resend API Key 是否正确
- 域名是否已验证
- 查看 Resend Dashboard 日志

---

## 📚 相关资源

- [Vercel 文档](https://vercel.com/docs)
- [Railway 文档](https://docs.railway.app)
- [Fly.io 文档](https://fly.io/docs)
- [Docker 文档](https://docs.docker.com)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)

---

## ✅ 部署完成检查清单

- [ ] 应用成功部署并运行
- [ ] 健康检查返回 200 OK
- [ ] 数据库连接正常
- [ ] 数据库迁移已运行
- [ ] 环境变量已正确配置
- [ ] HTTPS 已启用
- [ ] 邮件服务正常工作
- [ ] 日志监控已配置
- [ ] 备份策略已实施
- [ ] 域名已绑定（可选）

恭喜！你的 ILAL API 已成功部署到生产环境！🎉

---

**下一步**: 
- [邮件服务配置](./EMAIL_SETUP.md)
- [监控和告警设置](./MONITORING.md)
- [性能优化指南](./PERFORMANCE.md)
