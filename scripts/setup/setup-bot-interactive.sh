#!/bin/bash
# 交互式机器人配置和启动助手

set -e

# 颜色输出
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

clear
echo "=========================================="
echo "  🤖 ILAL 机器人配置和启动助手"
echo "=========================================="
echo ""

# 进入 bot 目录
cd "$(dirname "$0")/bot"

info "步骤 1: 配置私钥"
echo ""
echo "您有两种方式设置私钥："
echo ""
echo "  1. 手动编辑 .env 文件（推荐，更安全）"
echo "  2. 在此处输入私钥（会自动保存到 .env）"
echo ""
read -p "请选择 (1/2): " CHOICE

if [ "$CHOICE" = "1" ]; then
    echo ""
    info "正在打开 .env 文件..."
    sleep 1
    
    # 尝试使用不同的编辑器
    if command -v code &> /dev/null; then
        code .env
        info "已在 VS Code 中打开 .env 文件"
    elif command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    else
        open -a TextEdit .env
        info "已在文本编辑器中打开 .env 文件"
    fi
    
    echo ""
    info "请在 .env 文件中设置："
    echo "  PRIVATE_KEY=0x<您的私钥>"
    echo ""
    read -p "设置完成后按 Enter 继续..."

elif [ "$CHOICE" = "2" ]; then
    echo ""
    warning "注意：私钥是敏感信息，请确保环境安全"
    echo ""
    read -sp "请输入您的私钥（0x开头）: " PRIVATE_KEY
    echo ""
    
    if [ -z "$PRIVATE_KEY" ]; then
        error "未提供私钥"
        exit 1
    fi
    
    # 验证私钥格式
    if ! [[ "$PRIVATE_KEY" =~ ^0x[a-fA-F0-9]{64}$ ]]; then
        warning "私钥格式可能不正确（应该是 0x 开头的 66 位字符）"
        read -p "是否继续？(y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ]; then
            exit 1
        fi
    fi
    
    # 备份原 .env
    if [ -f ".env" ]; then
        cp .env .env.backup
        info "已备份原 .env 文件到 .env.backup"
    fi
    
    # 更新 .env 文件
    if [ -f ".env" ]; then
        # 替换现有的 PRIVATE_KEY 行
        sed -i.tmp "s|^PRIVATE_KEY=.*|PRIVATE_KEY=$PRIVATE_KEY|g" .env
        rm .env.tmp
    else
        # 创建新的 .env 文件
        cat > .env << EOF
# ILAL Market Maker Bot 环境变量
RPC_URL=https://sepolia.base.org
PRIVATE_KEY=$PRIVATE_KEY

# Telegram 告警（可选）
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EOF
    fi
    
    success "私钥已保存到 .env 文件"
else
    error "无效的选择"
    exit 1
fi

clear
echo "=========================================="
echo "  ✅ 配置验证"
echo "=========================================="
echo ""

info "步骤 2: 验证配置"
echo ""

npm run test:config

if [ $? -ne 0 ]; then
    error "配置验证失败"
    exit 1
fi

echo ""
read -p "配置验证通过！是否立即启动机器人？(y/n): " START_BOT

if [ "$START_BOT" != "y" ]; then
    info "已取消启动"
    echo ""
    info "您可以稍后手动启动："
    echo "  cd bot"
    echo "  npm run start"
    exit 0
fi

clear
echo "=========================================="
echo "  🚀 启动机器人"
echo "=========================================="
echo ""

warning "重要提示："
echo "  - 机器人将在前台运行"
echo "  - 按 Ctrl+C 可以停止"
echo "  - 日志会保存到 logs/bot.log"
echo ""
read -p "按 Enter 开始启动..."

echo ""
info "正在启动 ILAL 做市机器人..."
echo ""

# 启动机器人
npm run start
