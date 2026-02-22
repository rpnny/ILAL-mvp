#!/bin/bash

# Railway 快速部署脚本
# 用法: ./scripts/quick-deploy-railway.sh

set -e

echo "🚂 Railway 快速部署"
echo "==================="
echo ""

# 检查是否安装 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安装"
    echo ""
    echo "请先安装 Railway CLI:"
    echo "  npm install -g @railway/cli"
    echo ""
    exit 1
fi

# 检查是否登录
if ! railway whoami &> /dev/null; then
    echo "请先登录 Railway:"
    railway login
fi

echo "✅ Railway CLI 已就绪"
echo ""

# 创建新项目
echo "📦 创建新项目..."
railway init

# 添加 PostgreSQL
echo "🗄️  添加 PostgreSQL 数据库..."
railway add --database postgres

# 链接项目
echo "🔗 链接项目..."
railway link

# 设置环境变量
echo "⚙️  配置环境变量..."
echo ""
echo "请输入以下环境变量（按回车跳过可选项）:"
echo ""

read -p "JWT_SECRET (留空自动生成): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
fi
railway variables set JWT_SECRET="$JWT_SECRET"

read -p "API_KEY_SECRET (留空自动生成): " API_KEY_SECRET
if [ -z "$API_KEY_SECRET" ]; then
    API_KEY_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
fi
railway variables set API_KEY_SECRET="$API_KEY_SECRET"

read -p "RESEND_API_KEY: " RESEND_API_KEY
if [ -n "$RESEND_API_KEY" ]; then
    railway variables set RESEND_API_KEY="$RESEND_API_KEY"
fi

read -p "FROM_EMAIL (例如: ILAL <noreply@yourdomain.com>): " FROM_EMAIL
if [ -n "$FROM_EMAIL" ]; then
    railway variables set FROM_EMAIL="$FROM_EMAIL"
fi

read -p "VERIFIER_PRIVATE_KEY (可选): " VERIFIER_PRIVATE_KEY
if [ -n "$VERIFIER_PRIVATE_KEY" ]; then
    railway variables set VERIFIER_PRIVATE_KEY="$VERIFIER_PRIVATE_KEY"
fi

# 设置其他环境变量
railway variables set NODE_ENV="production"
railway variables set PORT="3001"
railway variables set CHAIN_ID="84532"
railway variables set RPC_URL="https://base-sepolia-rpc.publicnode.com"
railway variables set SESSION_MANAGER_ADDRESS="0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2"
railway variables set VERIFIER_ADDRESS="0x0cDcD82E5efba9De4aCc255402968397F323AFBB"

echo ""
echo "✅ 环境变量配置完成"
echo ""

# 部署
echo "🚀 开始部署..."
railway up

echo ""
echo "✅ 部署完成！"
echo ""
echo "查看部署状态:"
echo "  railway status"
echo ""
echo "查看日志:"
echo "  railway logs"
echo ""
echo "获取 URL:"
echo "  railway domain"
echo ""
