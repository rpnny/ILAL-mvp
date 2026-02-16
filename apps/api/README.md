# ILAL API Service

企业级 REST API 服务 - 提供认证、计费、ZK Proof 验证和 Session 管理。

## 功能

- 🔐 **用户认证** - 注册、登录、JWT Token 管理
- 🔑 **API Key 管理** - 生成、撤销、权限控制
- ⚡ **ZK Proof 验证** - 链上验证 ZK Proof 并激活 Session
- 📊 **使用追踪** - 实时记录 API 调用和计费
- 💰 **套餐管理** - 免费、专业版、企业版三档套餐
- 🛡️ **安全防护** - 限流、配额检查、API Key 加密

## 技术栈

- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **认证**: JWT + bcrypt
- **区块链**: viem (Base Sepolia)
- **日志**: Winston
- **安全**: Helmet, CORS, Rate Limiting

## 快速开始

### 1. 环境配置

复制环境变量模板：

\`\`\`bash
cp .env.example .env
\`\`\`

编辑 `.env` 配置数据库和区块链参数：

\`\`\`env
DATABASE_URL="postgresql://user:password@localhost:5432/ilal_saas"
JWT_SECRET="your-secret-key"
VERIFIER_PRIVATE_KEY="0x..."
\`\`\`

### 2. 安装依赖

\`\`\`bash
pnpm install
\`\`\`

### 3. 数据库设置

\`\`\`bash
# 生成 Prisma Client
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# (可选) 打开 Prisma Studio 查看数据
pnpm db:studio
\`\`\`

### 4. 启动服务

\`\`\`bash
# 开发模式（热重载）
pnpm dev

# 生产模式
pnpm build
pnpm start
\`\`\`

服务将在 `http://localhost:3001` 启动。

## API 端点

### 认证

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/auth/me` - 获取当前用户信息

### API Key 管理

- `GET /api/v1/apikeys` - 列出所有 API Keys
- `POST /api/v1/apikeys` - 创建新的 API Key
- `PATCH /api/v1/apikeys/:id` - 更新 API Key
- `DELETE /api/v1/apikeys/:id` - 撤销 API Key

### ZK Proof 验证

- `POST /api/v1/verify` - 验证 ZK Proof 并激活 Session
- `GET /api/v1/session/:address` - 查询 Session 状态

### 使用统计和计费

- `GET /api/v1/usage/stats` - 获取使用统计
- `GET /api/v1/billing/plans` - 获取套餐列表
- `POST /api/v1/billing/upgrade` - 升级套餐
- `GET /api/v1/billing/invoices` - 获取账单历史

### 健康检查

- `GET /api/v1/health` - 服务健康检查

## 认证方式

### JWT 认证（用于用户管理）

在请求头中包含 JWT Token：

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### API Key 认证（用于 API 调用）

在请求头中包含 API Key：

\`\`\`
X-API-Key: ilal_live_xxxxxxxxxxxxx
\`\`\`

## 套餐限制

| 套餐 | 月调用次数 | 限流 | 价格 |
|------|-----------|------|------|
| 免费版 | 100 | 10/min | $0 |
| 专业版 | 10,000 | 100/min | $99/月 |
| 企业版 | 无限制 | 1000/min | 定制 |

## 开发

### 数据库操作

\`\`\`bash
# 创建新迁移
pnpm db:migrate

# 重置数据库
prisma migrate reset

# 推送 schema 变更（开发用）
pnpm db:push

# 打开 Prisma Studio
pnpm db:studio
\`\`\`

### 日志

日志使用 Winston，输出到控制台和文件：

- `logs/error.log` - 错误日志
- `logs/combined.log` - 所有日志

### 目录结构

\`\`\`
src/
├── config/         # 配置文件
│   ├── database.ts
│   ├── constants.ts
│   └── logger.ts
├── controllers/    # 控制器
│   ├── auth.controller.ts
│   ├── apikey.controller.ts
│   ├── verify.controller.ts
│   └── billing.controller.ts
├── middleware/     # 中间件
│   ├── auth.middleware.ts
│   ├── apikey.middleware.ts
│   ├── ratelimit.middleware.ts
│   └── usage.middleware.ts
├── routes/         # 路由
│   ├── auth.routes.ts
│   ├── apikey.routes.ts
│   ├── verify.routes.ts
│   └── billing.routes.ts
├── services/       # 服务层
│   ├── blockchain.service.ts
│   └── billing.service.ts
├── utils/          # 工具函数
│   ├── apiKey.ts
│   ├── jwt.ts
│   └── password.ts
├── server.ts       # Express 服务器
└── index.ts        # 入口文件
\`\`\`

## 部署

### Docker

\`\`\`bash
docker build -t ilal-api .
docker run -p 3001:3001 --env-file .env ilal-api
\`\`\`

### 环境变量检查清单

- [ ] `DATABASE_URL` - PostgreSQL 连接字符串
- [ ] `JWT_SECRET` - JWT 签名密钥
- [ ] `API_KEY_SECRET` - API Key 加密盐
- [ ] `VERIFIER_PRIVATE_KEY` - 验证者钱包私钥
- [ ] `SESSION_MANAGER_ADDRESS` - SessionManager 合约地址
- [ ] `VERIFIER_ADDRESS` - Verifier 合约地址

## 监控和日志

推荐使用：

- **日志**: Winston + ELK Stack
- **监控**: Prometheus + Grafana
- **错误追踪**: Sentry

## 安全建议

1. 使用强随机密钥作为 `JWT_SECRET` 和 `API_KEY_SECRET`
2. 定期轮换 API Keys
3. 启用 HTTPS（生产环境）
4. 配置防火墙和 IP 白名单
5. 定期备份数据库
6. 监控异常访问模式

## License

Apache-2.0
