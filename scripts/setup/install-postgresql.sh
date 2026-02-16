#!/bin/bash

# ILAL PostgreSQL 安装脚本
# 需要手动运行并输入 sudo 密码

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║     ILAL PostgreSQL 安装向导                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 检查是否是 macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 此脚本仅支持 macOS"
    exit 1
fi

# 步骤 1: 安装 Homebrew
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 1: 检查 Homebrew"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v brew &> /dev/null; then
    echo "✅ Homebrew 已安装: $(brew --version | head -n1)"
else
    echo "⚠️  Homebrew 未安装，正在安装..."
    echo "📝 需要输入 sudo 密码"
    
    # 临时取消 CI 模式，允许交互式安装
    unset CI
    NONINTERACTIVE=0 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # 配置 PATH（Apple Silicon Mac）
    if [[ -d "/opt/homebrew/bin" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    echo "✅ Homebrew 安装完成"
fi

# 步骤 2: 安装 PostgreSQL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 2: 安装 PostgreSQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL 已安装: $(psql --version)"
else
    echo "⚠️  PostgreSQL 未安装，正在安装..."
    brew install postgresql@14
    echo "✅ PostgreSQL 安装完成"
fi

# 步骤 3: 启动 PostgreSQL 服务
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 3: 启动 PostgreSQL 服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 配置 PATH（确保能找到 psql）
if [[ -d "/opt/homebrew/opt/postgresql@14/bin" ]]; then
    export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
elif [[ -d "/usr/local/opt/postgresql@14/bin" ]]; then
    export PATH="/usr/local/opt/postgresql@14/bin:$PATH"
fi

# 启动服务
if brew services list | grep postgresql@14 | grep started > /dev/null; then
    echo "✅ PostgreSQL 服务已在运行"
else
    echo "⚠️  启动 PostgreSQL 服务..."
    brew services start postgresql@14
    sleep 3
    echo "✅ PostgreSQL 服务已启动"
fi

# 步骤 4: 创建数据库
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 4: 创建数据库"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 等待 PostgreSQL 完全启动
echo "⏳ 等待 PostgreSQL 启动..."
for i in {1..30}; do
    if psql -U $USER -d postgres -c '\q' 2>/dev/null; then
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# 创建数据库
if psql -U $USER -d postgres -lqt | cut -d \| -f 1 | grep -qw ilal_dev; then
    echo "✅ 数据库 ilal_dev 已存在"
else
    echo "⚠️  创建数据库 ilal_dev..."
    createdb ilal_dev
    echo "✅ 数据库创建成功"
fi

# 步骤 5: 安装 pnpm（全局）
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 5: 安装 pnpm"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v pnpm &> /dev/null; then
    echo "✅ pnpm 已安装: $(pnpm --version)"
else
    echo "⚠️  安装 pnpm..."
    sudo npm install -g pnpm
    echo "✅ pnpm 安装完成"
fi

# 步骤 6: 配置 API 环境变量
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 6: 配置环境变量"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/apps/api"

# 备份旧的 .env
if [ -f ".env" ]; then
    echo "📦 备份现有 .env 为 .env.sqlite"
    cp .env .env.sqlite
fi

# 生成新的 .env（PostgreSQL）
JWT_SECRET=$(openssl rand -hex 32)
API_KEY_SECRET=$(openssl rand -hex 32)
TEST_KEY=$(openssl rand -hex 32)

cat > .env << EOF
# PostgreSQL 数据库
DATABASE_URL="postgresql://ronny@localhost:5432/ilal_dev"

# JWT
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# API Key
API_KEY_SECRET="$API_KEY_SECRET"

# 服务器
PORT=3001
NODE_ENV="development"

# 区块链（Base Sepolia）
RPC_URL="https://base-sepolia-rpc.publicnode.com"
CHAIN_ID=84532
VERIFIER_PRIVATE_KEY="0x$TEST_KEY"
SESSION_MANAGER_ADDRESS="0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2"
VERIFIER_ADDRESS="0x0cDcD82E5efba9De4aCc255402968397F323AFBB"

# 限流
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_FREE=10
RATE_LIMIT_MAX_REQUESTS_PRO=100
RATE_LIMIT_MAX_REQUESTS_ENTERPRISE=1000
EOF

echo "✅ 环境变量已配置（PostgreSQL）"

# 步骤 7: 切换到 PostgreSQL Schema
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 7: 切换数据库 Schema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 备份当前 schema
cp prisma/schema.prisma prisma/schema.sqlite.backup

# 使用 PostgreSQL schema
if [ -f "prisma/schema.postgresql.prisma" ]; then
    cp prisma/schema.postgresql.prisma prisma/schema.prisma
    echo "✅ 已切换到 PostgreSQL Schema"
else
    echo "❌ 未找到 PostgreSQL Schema 文件"
    exit 1
fi

# 步骤 8: 生成 Prisma Client
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 8: 生成 Prisma Client"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx prisma generate

# 步骤 9: 运行数据库迁移
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 9: 运行数据库迁移"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx prisma migrate dev --name init_postgresql

echo "✅ 数据库迁移完成"

# 完成
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     安装完成！                                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "🎉 PostgreSQL 已成功配置！"
echo ""
echo "数据库信息："
echo "  主机: localhost"
echo "  端口: 5432"
echo "  数据库: ilal_dev"
echo "  用户: $USER"
echo ""
echo "启动 API 服务："
echo "  cd $(dirname "$0")/apps/api"
echo "  npm run dev"
echo ""
echo "运行测试："
echo "  npx tsx test-e2e.ts"
echo ""
echo "管理数据库："
echo "  npx prisma studio"
echo "  psql -d ilal_dev"
echo ""
echo "⚠️  注意："
echo "  - SQLite 数据已备份为 dev.db"
echo "  - SQLite Schema 已备份为 schema.sqlite.backup"
echo "  - 旧的 .env 已备份为 .env.sqlite"
echo ""
