# PostgreSQL 安装指南

## 方式 1: 自动安装脚本（推荐）

在终端中运行以下命令：

```bash
cd /Users/ronny/Desktop/ilal
./install-postgresql.sh
```

脚本会自动完成以下步骤：
1. ✅ 安装 Homebrew（如果需要）
2. ✅ 安装 PostgreSQL
3. ✅ 启动 PostgreSQL 服务
4. ✅ 创建数据库 `ilal_dev`
5. ✅ 安装 pnpm
6. ✅ 配置环境变量（PostgreSQL）
7. ✅ 切换到 PostgreSQL Schema
8. ✅ 生成 Prisma Client
9. ✅ 运行数据库迁移

**需要输入 sudo 密码时请输入。**

---

## 方式 2: 手动安装

### 步骤 1: 安装 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

如果是 Apple Silicon Mac，还需要：
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 步骤 2: 安装 PostgreSQL

```bash
brew install postgresql@14
```

### 步骤 3: 启动 PostgreSQL

```bash
brew services start postgresql@14
```

### 步骤 4: 创建数据库

```bash
createdb ilal_dev
```

### 步骤 5: 安装 pnpm

```bash
sudo npm install -g pnpm
```

### 步骤 6: 配置环境变量

编辑 `apps/api/.env`：

```bash
cd /Users/ronny/Desktop/ilal/apps/api

# 备份旧的 .env
cp .env .env.sqlite

# 创建新的 .env
cat > .env << 'EOF'
# PostgreSQL 数据库
DATABASE_URL="postgresql://ronny@localhost:5432/ilal_dev"

# JWT
JWT_SECRET="你的随机密钥"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# API Key
API_KEY_SECRET="你的随机密钥"

# 服务器
PORT=3001
NODE_ENV="development"

# 区块链（Base Sepolia）
RPC_URL="https://base-sepolia-rpc.publicnode.com"
CHAIN_ID=84532
VERIFIER_PRIVATE_KEY="0x你的测试私钥"
SESSION_MANAGER_ADDRESS="0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2"
VERIFIER_ADDRESS="0x0cDcD82E5efba9De4aCc255402968397F323AFBB"

# 限流
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_FREE=10
RATE_LIMIT_MAX_REQUESTS_PRO=100
RATE_LIMIT_MAX_REQUESTS_ENTERPRISE=1000
EOF
```

生成随机密钥：
```bash
openssl rand -hex 32
```

### 步骤 7: 切换 Schema

```bash
cd apps/api

# 备份当前 schema
cp prisma/schema.prisma prisma/schema.sqlite.backup

# 使用 PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

### 步骤 8: 运行迁移

```bash
npx prisma generate
npx prisma migrate dev --name init_postgresql
```

### 步骤 9: 启动服务

```bash
npm run dev
```

---

## 验证安装

### 检查 PostgreSQL 状态

```bash
# 查看服务状态
brew services list | grep postgresql

# 连接数据库
psql -d ilal_dev

# 在 psql 中：
\dt          # 列出所有表
\d User      # 查看 User 表结构
\q           # 退出
```

### 运行测试

```bash
cd /Users/ronny/Desktop/ilal/apps/api
npx tsx test-e2e.ts
```

### 查看数据

```bash
npx prisma studio
```

---

## 常用命令

### PostgreSQL 服务管理

```bash
# 启动
brew services start postgresql@14

# 停止
brew services stop postgresql@14

# 重启
brew services restart postgresql@14

# 查看状态
brew services list
```

### 数据库管理

```bash
# 连接数据库
psql -d ilal_dev

# 列出所有数据库
psql -l

# 删除数据库
dropdb ilal_dev

# 创建数据库
createdb ilal_dev
```

### Prisma 命令

```bash
# 生成 Client
npx prisma generate

# 运行迁移
npx prisma migrate dev

# 重置数据库
npx prisma migrate reset

# 可视化界面
npx prisma studio

# 查看迁移状态
npx prisma migrate status
```

---

## 从 SQLite 迁移数据（可选）

如果你想保留 SQLite 中的测试数据：

```bash
# 1. 导出 SQLite 数据
cd apps/api
sqlite3 dev.db .dump > backup.sql

# 2. 清理并转换 SQL（需要手动编辑）
# 删除 SQLite 特定语法
# 转换类型等

# 3. 导入到 PostgreSQL
psql -d ilal_dev -f backup.sql
```

**注意**: 由于 SQLite 和 PostgreSQL 语法差异，可能需要手动调整 SQL。通常建议重新创建测试数据。

---

## 故障排除

### 无法连接数据库

```bash
# 检查服务是否运行
brew services list | grep postgresql

# 查看日志（路径因机器而异）
tail -f /opt/homebrew/var/log/postgresql@14.log

# 重启服务
brew services restart postgresql@14
```

### 权限错误

```bash
# 确保当前用户有数据库权限
psql -d postgres -c "CREATE USER $USER SUPERUSER;"
```

### 端口冲突

```bash
# 检查 5432 端口是否被占用
lsof -i:5432

# 修改 PostgreSQL 端口（编辑配置文件）
# /opt/homebrew/var/postgresql@14/postgresql.conf
# 修改 port = 5433
```

### Prisma 迁移错误

```bash
# 重置并重新迁移
npx prisma migrate reset
npx prisma migrate dev

# 强制同步（不推荐生产环境）
npx prisma db push
```

---

## 与 SQLite 对比

| 特性 | SQLite | PostgreSQL |
|------|--------|------------|
| 安装 | 无需安装 | 需要安装服务 |
| 性能 | 适合开发 | 生产级性能 |
| 并发 | 有限 | 高并发支持 |
| 类型 | 有限类型 | 丰富类型 |
| 事务 | 基本支持 | 完整 ACID |
| 扩展性 | 单文件 | 分布式支持 |
| 推荐用途 | 开发/测试 | 生产环境 |

---

## 下一步

安装完成后：

1. ✅ 启动 API 服务
2. ✅ 运行端到端测试
3. ✅ 创建测试用户和 API Keys
4. ✅ 开始开发或部署
