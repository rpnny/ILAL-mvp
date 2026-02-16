#!/bin/bash

# 警告：此脚本包含明文密码，仅用于临时安装
# 安装完成后请立即删除此文件

PASSWORD="Daisy19"

echo "╔══════════════════════════════════════════════════╗"
echo "║     PostgreSQL 自动安装（使用 sudo）             ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "⚠️  警告：此脚本包含明文密码"
echo "    安装完成后将自动删除"
echo ""

# 步骤 1: 安装 Homebrew
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 1: 安装 Homebrew"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v brew &> /dev/null; then
    echo "✅ Homebrew 已安装"
else
    echo "🔧 正在安装 Homebrew..."
    echo "$PASSWORD" | sudo -S echo "获取 sudo 权限成功"
    
    # 使用非交互模式安装
    NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # 配置 PATH
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

brew install postgresql@14

# 步骤 3: 启动服务
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 3: 启动 PostgreSQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

brew services start postgresql@14

# 配置 PATH
if [[ -d "/opt/homebrew/opt/postgresql@14/bin" ]]; then
    export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
elif [[ -d "/usr/local/opt/postgresql@14/bin" ]]; then
    export PATH="/usr/local/opt/postgresql@14/bin:$PATH"
fi

# 等待启动
sleep 3

# 步骤 4: 创建数据库
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 4: 创建数据库"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

createdb ilal_dev

# 步骤 5: 安装 pnpm
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 5: 安装 pnpm"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "$PASSWORD" | sudo -S npm install -g pnpm

# 步骤 6: 配置项目
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 6: 配置 ILAL 项目"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/apps/api"

# 备份
cp .env .env.sqlite 2>/dev/null || true
cp prisma/schema.prisma prisma/schema.sqlite.backup 2>/dev/null || true

# 生成密钥
JWT_SECRET=$(openssl rand -hex 32)
API_KEY_SECRET=$(openssl rand -hex 32)
TEST_KEY=$(openssl rand -hex 32)

# 创建新 .env
cat > .env << EOF
DATABASE_URL="postgresql://ronny@localhost:5432/ilal_dev"
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
API_KEY_SECRET="$API_KEY_SECRET"
PORT=3001
NODE_ENV="development"
RPC_URL="https://base-sepolia-rpc.publicnode.com"
CHAIN_ID=84532
VERIFIER_PRIVATE_KEY="0x$TEST_KEY"
SESSION_MANAGER_ADDRESS="0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2"
VERIFIER_ADDRESS="0x0cDcD82E5efba9De4aCc255402968397F323AFBB"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_FREE=10
RATE_LIMIT_MAX_REQUESTS_PRO=100
RATE_LIMIT_MAX_REQUESTS_ENTERPRISE=1000
EOF

# 切换 Schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma

echo "✅ 配置完成"

# 步骤 7: 生成并迁移
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 7: 数据库迁移"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx prisma generate
npx prisma migrate dev --name init_postgresql

# 完成
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     安装完成！                                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "🎉 PostgreSQL 已成功安装并配置！"
echo ""
echo "启动服务："
echo "  cd $(dirname "$0")/apps/api"
echo "  npm run dev"
echo ""
echo "运行测试："
echo "  npx tsx test-e2e.ts"
echo ""

# 删除此脚本（包含密码）
echo "🗑️  正在删除包含密码的安装脚本..."
rm -f "$0"
echo "✅ 已删除安装脚本"
echo ""
