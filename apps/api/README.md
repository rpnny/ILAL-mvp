# ILAL API Service

**生产级 SaaS API 服务** - 提供用户认证、邮箱验证、API Key 管理和区块链集成

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)](.)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](.)
[![TypeScript](https://img.shields.io/badge/typescript-5.6.0-blue)](.)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](../../LICENSE)

---

## ✨ 功能特性

### 核心功能 ✅
- **用户认证** - 注册、登录、Token 刷新
- **邮箱验证** - 6 位验证码，15 分钟有效期
- **API 密钥管理** - 创建、列表、更新、撤销
- **JWT 认证** - 访问令牌 + 刷新令牌
- **速率限制** - 基于套餐的请求限制
- **邮件服务** - Resend API 集成

### 安全特性 🔒
- ✅ bcrypt 密码加密
- ✅ JWT Token 认证
- ✅ API Key 加密存储
- ✅ 验证码一次性使用
- ✅ 验证码过期检查
- ✅ 防重放攻击
- ✅ 请求日志记录
- ✅ 速率限制保护

### 可选功能 ⚡
- **区块链集成** - Base Sepolia ZK 证明验证
- **使用统计** - API 调用追踪
- **计费系统** - 多套餐支持（FREE/PRO/ENTERPRISE）

---

## 🚀 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 初始化数据库
npm run db:generate
npm run db:push

# 4. 启动开发服务器
npm run dev
```

服务将运行在 `http://localhost:3001`

### 测试 API

```bash
# 健康检查
curl http://localhost:3001/api/v1/health

# 运行完整测试
./test-api.sh
```

---

## 📚 文档索引

### 🏁 新手入门
- **[环境配置](./SETUP.md)** - 本地开发环境设置
- **[API 测试指南](./API_TEST_GUIDE.md)** - 完整的 API 测试文档
- **[成功报告](./SUCCESS_REPORT.md)** - 功能测试结果

### 🚀 部署相关
- **[快速部署](./DEPLOYMENT_QUICK_START.md)** ⭐ 5 分钟快速部署
- **[完整部署指南](./docs/DEPLOYMENT_GUIDE.md)** - Vercel、Railway、Fly.io 等
- **[部署检查清单](./DEPLOYMENT_CHECKLIST.md)** - 生产环境检查清单
- **[邮件服务配置](./docs/EMAIL_SETUP.md)** - Resend API 配置

### 📖 API 文档
- **[API 参考](./docs/API.md)** - 完整的 API 端点文档
- **[错误代码](./docs/ERRORS.md)** - 错误代码说明

### 🔧 运维文档
- **[监控指南](./docs/MONITORING.md)** - 监控和告警配置
- **[故障排查](./docs/TROUBLESHOOTING.md)** - 常见问题解决
- **[性能优化](./docs/PERFORMANCE.md)** - 性能优化建议

---

## 📡 API 端点

### 认证相关
| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/verify-email` | 验证邮箱 |
| POST | `/api/v1/auth/login` | 用户登录 |
| POST | `/api/v1/auth/resend-code` | 重发验证码 |
| POST | `/api/v1/auth/refresh` | 刷新 Token |
| GET | `/api/v1/auth/me` | 获取用户信息 |

### API Key 管理
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/apikeys` | 列出 API Keys |
| POST | `/api/v1/apikeys` | 创建 API Key |
| PATCH | `/api/v1/apikeys/:id` | 更新 API Key |
| DELETE | `/api/v1/apikeys/:id` | 撤销 API Key |

### 其他
| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/health` | 健康检查 |
| POST | `/api/v1/verify` | ZK 证明验证（可选） |
| GET | `/api/v1/session/:address` | Session 状态（可选） |

---

## 🗄️ 数据库

### 支持的数据库
- **SQLite** - 开发环境（默认）
- **PostgreSQL** - 生产环境（推荐）

### 数据表
- `User` - 用户表
- `VerificationCode` - 验证码表
- `ApiKey` - API 密钥表
- `UsageRecord` - 使用记录表
- `Subscription` - 订阅表

### 数据库管理

```bash
# 生成 Prisma Client
npm run db:generate

# 推送 Schema（开发）
npm run db:push

# 运行迁移（生产）
npm run db:migrate

# 打开 Prisma Studio
npm run db:studio
```

---

## 🧪 测试

### 单元测试

```bash
npm test
```

### 集成测试

```bash
# 启动服务
npm run dev

# 运行测试脚本
./test-api.sh
```

### 测试覆盖率

```bash
npm run test:coverage
```

---

## 🔧 技术栈

### 核心技术
- **Node.js** 18+ - JavaScript 运行时
- **TypeScript** 5.6 - 类型安全
- **Express.js** 4.21 - Web 框架
- **Prisma** 5.22 - ORM

### 安全和认证
- **bcrypt** - 密码加密
- **jsonwebtoken** - JWT Token
- **Zod** - 数据验证

### 其他
- **Winston** - 日志记录
- **Resend** - 邮件服务
- **viem** - 区块链交互（可选）

---

## 📦 项目结构

```
apps/api/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.ts  # Prisma 客户端
│   │   ├── logger.ts    # 日志配置
│   │   └── constants.ts # 常量定义
│   ├── controllers/     # 控制器
│   │   ├── auth.controller.ts
│   │   ├── apikey.controller.ts
│   │   └── verify.controller.ts
│   ├── middleware/      # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── apikey.middleware.ts
│   │   └── ratelimit.middleware.ts
│   ├── routes/          # 路由
│   ├── services/        # 服务层
│   │   ├── email.service.ts
│   │   └── blockchain.service.ts
│   ├── utils/           # 工具函数
│   ├── server.ts        # Express 配置
│   └── index.ts         # 入口文件
├── prisma/
│   └── schema.prisma    # 数据库 Schema
├── scripts/             # 脚本
│   ├── generate-secrets.sh
│   └── quick-deploy-railway.sh
├── docs/                # 文档
└── test/                # 测试文件
```

---

## 🌍 环境变量

### 必需配置

```bash
# 数据库
DATABASE_URL="file:./prisma/dev.db"  # SQLite
# DATABASE_URL="postgresql://..."    # PostgreSQL

# JWT 配置
JWT_SECRET="your-strong-secret-here"
API_KEY_SECRET="your-api-key-secret-here"

# 服务器
PORT=3001
NODE_ENV="development"
```

### 可选配置

```bash
# 邮件服务
RESEND_API_KEY="re_your_key_here"
FROM_EMAIL="ILAL <noreply@yourdomain.com>"

# 区块链（可选）
VERIFIER_PRIVATE_KEY="0x..."
RPC_URL="https://base-sepolia-rpc.publicnode.com"
CHAIN_ID=84532
SESSION_MANAGER_ADDRESS="0x..."
VERIFIER_ADDRESS="0x..."

# CORS
CORS_ORIGIN="*"  # 生产环境改为具体域名
```

---

## 🔐 安全最佳实践

1. **永远不要提交 `.env` 到 Git**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **使用强随机密钥**
   ```bash
   openssl rand -base64 32
   ```

3. **生产环境配置**
   - 使用 PostgreSQL
   - 启用 HTTPS
   - 限制 CORS
   - 设置速率限制
   - 定期轮换密钥

4. **监控和日志**
   - 配置错误追踪（Sentry）
   - 设置日志聚合
   - 启用告警

---

## 📊 性能指标

### 目标性能
- 响应时间: < 500ms
- 吞吐量: 100+ req/s
- 可用性: 99.9%
- 错误率: < 0.1%

### 监控指标
- 请求响应时间
- 错误率
- 数据库连接数
- 内存使用
- CPU 使用

---

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

Apache-2.0 © 2026 ILAL Team

---

## 📞 支持

- **文档**: 查看 `docs/` 目录
- **Issue**: [GitHub Issues](https://github.com/your-org/ilal/issues)
- **讨论**: [GitHub Discussions](https://github.com/your-org/ilal/discussions)

---

## 🎯 路线图

### 已完成 ✅
- [x] 用户认证系统
- [x] 邮箱验证
- [x] API Key 管理
- [x] JWT Token 认证
- [x] 邮件服务集成
- [x] 数据库集成
- [x] 部署配置

### 计划中 📝
- [ ] 密码重置功能
- [ ] 双因素认证 (2FA)
- [ ] OAuth 登录（Google、GitHub）
- [ ] 使用统计仪表板
- [ ] Webhook 支持
- [ ] API 文档页面（Swagger）
- [ ] GraphQL API
- [ ] WebSocket 支持

---

## 🌟 致谢

感谢所有贡献者和支持者！

**Built with ❤️ by ILAL Team**

---

**最后更新**: 2026-02-17
