#!/bin/bash

# 生成生产环境密钥脚本
# 用法: ./scripts/generate-secrets.sh

set -e

echo "🔐 生成生产环境密钥"
echo "===================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 生成强随机密钥
generate_secret() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# JWT Secret
JWT_SECRET=$(generate_secret)
echo -e "${BLUE}JWT_SECRET:${NC}"
echo "$JWT_SECRET"
echo ""

# API Key Secret
API_KEY_SECRET=$(generate_secret)
echo -e "${BLUE}API_KEY_SECRET:${NC}"
echo "$API_KEY_SECRET"
echo ""

# PostgreSQL Password
POSTGRES_PASSWORD=$(generate_secret)
echo -e "${BLUE}POSTGRES_PASSWORD:${NC}"
echo "$POSTGRES_PASSWORD"
echo ""

# 生成 .env.production 文件
echo -e "${YELLOW}生成 .env.production 文件...${NC}"

cat > .env.production << EOF
# ============ 自动生成的生产环境配置 ============
# 生成时间: $(date)

# ============ 数据库配置 ============
# 请替换为你的实际数据库 URL
DATABASE_URL="postgresql://username:password@host:5432/database"

# ============ JWT 配置 ============
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# ============ API Key 配置 ============
API_KEY_SECRET="$API_KEY_SECRET"

# ============ 服务器配置 ============
PORT=3001
NODE_ENV="production"
CORS_ORIGIN="https://yourdomain.com"

# ============ 区块链配置 ============
RPC_URL="https://base-sepolia-rpc.publicnode.com"
CHAIN_ID=84532
VERIFIER_PRIVATE_KEY=""

# 合约地址 (Base Sepolia)
SESSION_MANAGER_ADDRESS="0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2"
VERIFIER_ADDRESS="0x0cDcD82E5efba9De4aCc255402968397F323AFBB"

# ============ 邮件配置 ============
RESEND_API_KEY=""
FROM_EMAIL="ILAL <noreply@yourdomain.com>"

# ============ 限流配置 ============
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS_FREE=10
RATE_LIMIT_MAX_REQUESTS_PRO=100
RATE_LIMIT_MAX_REQUESTS_ENTERPRISE=1000

# ============ 日志配置 ============
LOG_LEVEL="info"
EOF

echo -e "${GREEN}✅ .env.production 文件已生成${NC}"
echo ""

echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo "1. 请将 .env.production 文件添加到 .gitignore"
echo "2. 请替换以下占位符为实际值:"
echo "   - DATABASE_URL"
echo "   - RESEND_API_KEY"
echo "   - VERIFIER_PRIVATE_KEY (如需要)"
echo "   - FROM_EMAIL"
echo "   - CORS_ORIGIN"
echo ""
echo -e "${GREEN}完成！${NC}"
