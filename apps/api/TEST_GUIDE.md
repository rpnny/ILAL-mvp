# ILAL API 测试指南

## 端到端测试

本指南帮助你运行完整的端到端测试，验证 SaaS 架构的所有功能。

## 前置要求

### 1. 安装 PostgreSQL

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# 创建数据库
createdb ilal_saas

# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb ilal_saas
```

### 2. 配置环境变量

```bash
cd apps/api
cp .env.example .env
```

编辑 `.env` 文件，至少配置以下必需变量：

```bash
# 数据库（必需）
DATABASE_URL="postgresql://postgres@localhost:5432/ilal_saas"

# JWT 密钥（必需 - 生产环境请使用强随机字符串）
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
API_KEY_SECRET="your-super-secret-api-key-salt-change-in-production"

# 区块链（必需）
VERIFIER_PRIVATE_KEY="0x..."
SESSION_MANAGER_ADDRESS="0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2"
VERIFIER_ADDRESS="0x0cDcD82E5efba9De4aCc255402968397F323AFBB"
```

### 3. 安装依赖

```bash
pnpm install
```

### 4. 运行数据库迁移

```bash
pnpm db:migrate
```

## 运行测试

### 方式 1: 自动化脚本（推荐）

这个脚本会自动检查环境、启动 API 服务、运行测试、关闭服务：

```bash
./test-e2e.sh
```

### 方式 2: 手动运行

#### 步骤 1: 启动 API 服务

在一个终端窗口运行：

```bash
pnpm dev
```

#### 步骤 2: 运行测试

在另一个终端窗口运行：

```bash
tsx test-e2e.ts
```

或指定不同的 API URL：

```bash
API_BASE_URL=https://api.ilal.tech tsx test-e2e.ts
```

## 测试内容

测试脚本会执行以下 13 个测试：

### 1️⃣ 健康检查
- 测试 `/api/v1/health` 端点
- 验证服务正常运行
- 检查区块链连接

### 2️⃣ 用户注册
- 创建新用户账号
- 验证邮箱格式
- 验证密码强度
- 获取 JWT Token

### 3️⃣ 用户登录
- 使用邮箱密码登录
- 获取新的 JWT Token

### 4️⃣ 获取用户信息
- 使用 JWT Token 认证
- 查询当前用户信息

### 5️⃣ 创建 API Key
- 生成新的 API Key
- 配置权限和限流
- 获取完整 Key（只显示一次）

### 6️⃣ 列出 API Keys
- 查看所有 API Keys
- 验证列表功能

### 7️⃣ 使用 API Key
- 使用 API Key 调用接口
- 查询 Session 状态

### 8️⃣ 获取使用统计
- 查看 API 调用次数
- 验证计费追踪
- 检查配额余额

### 9️⃣ 获取套餐列表
- 查看所有可用套餐
- 验证定价信息

### 🔟 Token 刷新
- 使用 Refresh Token
- 获取新的 Access Token

### 1️⃣1️⃣ 更新 API Key
- 修改 API Key 名称
- 调整限流配置

### 1️⃣2️⃣ 撤销 API Key
- 禁用 API Key
- 验证撤销成功

### 1️⃣3️⃣ 验证撤销
- 确认撤销的 Key 无法使用
- 验证安全性

## 测试输出

成功的测试输出示例：

```
╔══════════════════════════════════════════════════╗
║     ILAL API 端到端测试                         ║
╚══════════════════════════════════════════════════╝

[步骤 1] 健康检查
✅ 服务正常: ILAL API
ℹ️  网络: base-sepolia, 区块: 12345678

[步骤 2] 用户注册
✅ 注册成功: test-1234567890@example.com
ℹ️  用户 ID: clx123456
ℹ️  套餐: FREE

...

╔══════════════════════════════════════════════════╗
║     测试结果总结                                  ║
╚══════════════════════════════════════════════════╝

总计: 13 个测试
通过: 13 个
失败: 0 个

🎉 所有测试通过！SaaS 架构运行正常！
```

## 常见问题

### Q: 数据库连接失败

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**解决**:
1. 确认 PostgreSQL 正在运行:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. 检查 `DATABASE_URL` 配置:
   ```bash
   echo $DATABASE_URL
   ```

3. 测试数据库连接:
   ```bash
   psql $DATABASE_URL
   ```

### Q: API 服务启动失败

**错误**: `Error: VERIFIER_PRIVATE_KEY not configured`

**解决**:
1. 检查 `.env` 文件是否存在
2. 确认所有必需的环境变量已配置
3. 重新加载环境变量:
   ```bash
   source .env
   ```

### Q: 测试失败：Unauthorized

**错误**: `API Error: Unauthorized`

**解决**:
1. 确认 `JWT_SECRET` 已配置
2. 检查 Token 是否过期
3. 重新运行测试生成新 Token

### Q: ZK Proof 验证失败

这是正常的，因为测试中使用的是模拟数据。真实的 Proof 需要：
1. 有效的 EAS 认证数据
2. 正确的 ZK Proof 生成
3. 链上验证通过

测试会跳过实际的 Proof 验证，只测试 API 调用流程。

## 测试数据清理

测试会创建临时数据：
- 测试用户账号（`test-[timestamp]@example.com`）
- API Keys
- 使用记录

如需清理：

```bash
# 连接数据库
psql $DATABASE_URL

# 删除测试用户
DELETE FROM "User" WHERE email LIKE 'test-%@example.com';

# 退出
\q
```

或重置整个数据库：

```bash
pnpm prisma migrate reset
```

## 性能测试

测试完成后会显示响应时间。正常范围：

- 健康检查: < 100ms
- 注册/登录: < 300ms
- API Key 操作: < 200ms
- Session 查询: < 500ms（含区块链查询）

## CI/CD 集成

在 GitHub Actions 中运行测试：

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: ilal_saas_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
        working-directory: apps/api
      
      - name: Run migrations
        run: pnpm db:migrate
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ilal_saas_test
      
      - name: Run E2E tests
        run: ./test-e2e.sh
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ilal_saas_test
          JWT_SECRET: test-secret
          API_KEY_SECRET: test-api-secret
          VERIFIER_PRIVATE_KEY: ${{ secrets.VERIFIER_PRIVATE_KEY }}
```

## 下一步

测试通过后，你可以：

1. **开发 Dashboard** - 构建用户管理界面
2. **部署到生产** - 使用 Docker 或云服务
3. **集成监控** - 添加 Prometheus/Grafana
4. **性能优化** - 添加 Redis 缓存

## 获取帮助

- 📖 查看 API 文档: `docs/API.md`
- 🏗️ 了解架构: `../../SAAS_ARCHITECTURE.md`
- 💬 加入 Discord: https://discord.gg/ilal
- 📧 发送邮件: support@ilal.tech
