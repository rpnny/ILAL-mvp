#!/bin/bash
# 交互式子图部署助手

set -e

# 颜色输出
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

clear
echo "=========================================="
echo "  📊 The Graph Studio 交互式部署助手"
echo "=========================================="
echo ""

info "步骤 1: 打开 The Graph Studio"
echo ""
echo "正在为您打开 The Graph Studio 网站..."
sleep 2
open "https://thegraph.com/studio/"

echo ""
info "请在浏览器中完成以下操作："
echo ""
echo "  1️⃣  点击 'Connect Wallet' 连接您的钱包"
echo "  2️⃣  选择 MetaMask 或其他钱包"
echo "  3️⃣  授权连接"
echo "  4️⃣  同意服务条款"
echo ""
read -p "完成后按 Enter 继续..."

clear
echo "=========================================="
echo "  📊 创建 Subgraph"
echo "=========================================="
echo ""

info "步骤 2: 创建新的 Subgraph"
echo ""
echo "在 The Graph Studio 页面："
echo ""
echo "  1️⃣  点击 'Create a Subgraph' 按钮"
echo "  2️⃣  填写以下信息："
echo ""
echo "      Subgraph Name: ilal-base-sepolia"
echo "      Subtitle: ILAL Compliance Layer"
echo "      Description: Institutional Liquidity Access Layer with ZK proofs"
echo "      Network: base-sepolia"
echo ""
echo "  3️⃣  点击 'Create Subgraph'"
echo ""
read -p "完成后按 Enter 继续..."

clear
echo "=========================================="
echo "  🔑 获取 Deploy Key"
echo "=========================================="
echo ""

info "步骤 3: 复制 Deploy Key"
echo ""
echo "创建 Subgraph 后，页面会显示类似这样的命令："
echo ""
echo "  graph auth --studio <YOUR_DEPLOY_KEY>"
echo ""
echo "请复制 <YOUR_DEPLOY_KEY> 部分（32 位十六进制字符串）"
echo ""
read -p "请粘贴您的 Deploy Key: " DEPLOY_KEY

if [ -z "$DEPLOY_KEY" ]; then
    warning "未提供 Deploy Key，退出"
    exit 1
fi

# 验证 Deploy Key 格式（应该是 32 位十六进制）
if ! [[ "$DEPLOY_KEY" =~ ^[a-fA-F0-9]{32}$ ]]; then
    warning "Deploy Key 格式可能不正确（应该是 32 位十六进制字符）"
    read -p "是否继续？(y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

clear
echo "=========================================="
echo "  🚀 开始部署"
echo "=========================================="
echo ""

info "步骤 4: 认证和部署"
echo ""

cd "$(dirname "$0")/subgraph"

info "正在认证..."
npx graph auth --studio "$DEPLOY_KEY"

if [ $? -eq 0 ]; then
    success "认证成功！"
else
    warning "认证失败，请检查 Deploy Key 是否正确"
    exit 1
fi

echo ""
info "正在部署子图到 The Graph Studio..."
echo ""

npx graph deploy --studio ilal-base-sepolia

if [ $? -eq 0 ]; then
    echo ""
    success "🎉 子图部署成功！"
    echo ""
    info "下一步："
    echo "  1. 等待 5-10 分钟进行链上数据同步"
    echo "  2. 在 The Graph Studio 查看同步状态"
    echo "  3. 同步完成后获取 Query URL"
    echo "  4. 更新前端配置使用子图数据"
    echo ""
    info "在 The Graph Studio 页面可以看到："
    echo "  - 同步进度"
    echo "  - Query URL"
    echo "  - GraphQL Playground"
else
    warning "部署失败，请检查错误信息"
    exit 1
fi
