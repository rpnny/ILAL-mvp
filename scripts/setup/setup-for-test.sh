#!/bin/bash

# ILAL 测试环境自动配置脚本

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║     ILAL 测试环境自动配置                        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "ℹ️  $1"
}

# 步骤 1: 检查和安装 Homebrew
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 1: 检查 Homebrew"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v brew &> /dev/null; then
    success "Homebrew 已安装"
else
    warning "Homebrew 未安装，正在安装..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    success "Homebrew 安装完成"
fi

# 步骤 2: 安装 PostgreSQL
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 2: 检查 PostgreSQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v psql &> /dev/null; then
    success "PostgreSQL 已安装"
else
    warning "PostgreSQL 未安装，正在安装..."
    brew install postgresql@14
    success "PostgreSQL 安装完成"
fi

# 启动 PostgreSQL
if brew services list | grep postgresql@14 | grep started &> /dev/null; then
    success "PostgreSQL 服务已运行"
else
    info "启动 PostgreSQL 服务..."
    brew services start postgresql@14
    sleep 3
    success "PostgreSQL 服务已启动"
fi

# 创建数据库
echo ""
info "创建数据库 ilal_saas..."
if createdb ilal_saas 2>/dev/null; then
    success "数据库创建成功"
else
    warning "数据库可能已存在（这是正常的）"
fi

# 步骤 3: 安装 pnpm
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 3: 检查 pnpm"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v pnpm &> /dev/null; then
    success "pnpm 已安装"
else
    warning "pnpm 未安装，正在安装..."
    brew install pnpm
    success "pnpm 安装完成"
fi

# 步骤 4: 配置环境变量
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 4: 配置环境变量"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/apps/api"

if [ -f ".env" ]; then
    warning ".env 文件已存在，备份为 .env.backup"
    cp .env .env.backup
fi

info "生成 .env 文件..."

# 生成随机密钥
JWT_SECRET=$(openssl rand -hex 64)
API_KEY_SECRET=$(openssl rand -hex 64)
TEST_PRIVATE_KEY="0x$(openssl rand -hex 32)"

cat > .env << EOF
# ============ 数据库配置 ============
DATABASE_URL="postgresql://$(whoami)@localhost:5432/ilal_saas"

# ============ JWT 配置 ============
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# ============ API Key 加密 ============
API_KEY_SECRET="$API_KEY_SECRET"

# ============ 服务器配置 ============
PORT=3001
NODE_ENV="development"

# ============ 区块链配置 ============
RPC_URL="https://base-sepolia-rpc.publicnode.com"
CHAIN_ID=84532

# ⚠️ 测试私钥（仅用于开发，测试网无余额）
# 如果你有真实的私钥，请替换下面的值
VERIFIER_PRIVATE_KEY="$TEST_PRIVATE_KEY"

# 合约地址（Base Sepolia）
SESSION_MANAGER_ADDRESS="0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2"
VERIFIER_ADDRESS="0x0cDcD82E5efba9De4aCc255402968397F323AFBB"

# ============ 限流配置 ============
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_FREE=10
RATE_LIMIT_MAX_REQUESTS_PRO=100
RATE_LIMIT_MAX_REQUESTS_ENTERPRISE=1000
EOF

success ".env 文件已创建"

echo ""
warning "⚠️  重要提示："
echo "   当前使用的是测试私钥（没有余额）"
echo "   区块链相关的测试可能会失败"
echo "   但认证、API Key、计费等功能可以正常测试"
echo ""
echo "   如需测试区块链功能，请编辑 .env 文件"
echo "   替换真实的 VERIFIER_PRIVATE_KEY"

# 步骤 5: 安装依赖
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 5: 安装依赖"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "正在安装 npm 包..."
pnpm install
success "依赖安装完成"

# 步骤 6: 数据库迁移
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 6: 数据库迁移"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "运行 Prisma 迁移..."
pnpm db:migrate
success "数据库迁移完成"

# 完成
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     配置完成！                                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
success "测试环境已准备就绪！"
echo ""
echo "下一步："
echo "  1. (可选) 编辑 .env 文件，替换真实的私钥"
echo "  2. 运行测试："
echo ""
echo "     ./test-e2e.sh"
echo ""
echo "  3. 或手动启动服务："
echo ""
echo "     pnpm dev"
echo ""

# 询问是否立即运行测试
echo ""
read -p "是否立即运行测试？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    info "正在运行测试..."
    ./test-e2e.sh
fi
