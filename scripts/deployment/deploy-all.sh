#!/bin/bash
# ILAL 项目全自动部署脚本
# 使用方法: ./deploy-all.sh [deploy-key]

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo ""
echo "=========================================="
echo "  🚀 ILAL 项目全自动部署脚本"
echo "=========================================="
echo ""

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ============================================
# 步骤 1: 检查环境
# ============================================
info "步骤 1/5: 检查部署环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    error "Node.js 未安装"
fi
success "Node.js $(node -v) ✓"

# 检查 npm
if ! command -v npm &> /dev/null; then
    error "npm 未安装"
fi
success "npm $(npm -v) ✓"

# 检查 git
if ! command -v git &> /dev/null; then
    warning "git 未安装（可选）"
else
    success "git $(git --version | cut -d' ' -f3) ✓"
fi

echo ""

# ============================================
# 步骤 2: 构建前端
# ============================================
info "步骤 2/5: 构建前端应用..."

cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    info "安装前端依赖..."
    npm install
fi

info "构建生产版本..."
npm run build

if [ $? -eq 0 ]; then
    success "前端构建成功！"
    
    # 显示构建统计
    if [ -d ".next" ]; then
        BUILD_SIZE=$(du -sh .next | cut -f1)
        info "构建大小: $BUILD_SIZE"
    fi
else
    error "前端构建失败"
fi

echo ""

# ============================================
# 步骤 3: 构建机器人
# ============================================
info "步骤 3/5: 构建做市机器人..."

cd "$PROJECT_ROOT/bot"

if [ ! -d "node_modules" ]; then
    info "安装机器人依赖..."
    npm install
fi

info "编译 TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    success "机器人构建成功！"
else
    error "机器人构建失败"
fi

# 检查 .env 配置
if [ ! -f ".env" ]; then
    warning ".env 文件不存在，复制示例文件..."
    cp .env.example .env
    warning "请编辑 .env 文件设置 PRIVATE_KEY"
else
    # 检查私钥是否配置
    if grep -q "0x0000000000000000000000000000000000000000000000000000000000000000" .env; then
        warning "检测到占位符私钥，请在 .env 中设置真实私钥"
    else
        success ".env 配置已就绪"
    fi
fi

echo ""

# ============================================
# 步骤 4: 准备子图部署
# ============================================
info "步骤 4/5: 准备子图部署..."

cd "$PROJECT_ROOT/subgraph"

if [ ! -d "node_modules" ]; then
    info "安装子图依赖..."
    npm install
fi

info "准备 Base Sepolia 配置..."
npm run prepare:base-sepolia

info "生成代码..."
npm run codegen

info "构建子图..."
npm run build

if [ $? -eq 0 ]; then
    success "子图构建成功！"
else
    error "子图构建失败"
fi

echo ""

# ============================================
# 步骤 5: 部署子图（如果提供了 Deploy Key）
# ============================================
DEPLOY_KEY="$1"

if [ -n "$DEPLOY_KEY" ]; then
    info "步骤 5/5: 部署子图到 The Graph Studio..."
    
    # 认证
    info "认证中..."
    npx graph auth --studio "$DEPLOY_KEY"
    
    # 部署
    info "部署中..."
    npx graph deploy --studio ilal-base-sepolia
    
    if [ $? -eq 0 ]; then
        success "子图部署成功！"
        info "请等待 5-10 分钟进行同步"
    else
        error "子图部署失败"
    fi
else
    warning "步骤 5/5: 跳过子图部署（未提供 Deploy Key）"
    echo ""
    info "要部署子图，请："
    echo "  1. 访问 https://thegraph.com/studio/"
    echo "  2. 创建账号并获取 Deploy Key"
    echo "  3. 运行: ./deploy-all.sh <YOUR_DEPLOY_KEY>"
fi

echo ""

# ============================================
# 部署总结
# ============================================
echo "=========================================="
echo "  📊 部署总结"
echo "=========================================="
echo ""

success "✅ 前端: 构建完成"
echo "   启动命令: cd frontend && npm run start"
echo "   访问地址: http://localhost:3000"
echo ""

success "✅ 机器人: 构建完成"
echo "   配置检查: cd bot && npm run test:config"
echo "   启动命令: cd bot && npm run start"
echo ""

if [ -n "$DEPLOY_KEY" ]; then
    success "✅ 子图: 部署完成"
    echo "   查看状态: https://thegraph.com/studio/"
else
    warning "⏳ 子图: 等待部署"
    echo "   设置指南: cat GRAPH_STUDIO_SETUP.md"
fi

echo ""
echo "=========================================="
success "🎉 部署流程完成！"
echo "=========================================="
echo ""

info "下一步操作："
echo "  1. 启动前端: cd frontend && npm run start"
echo "  2. 配置机器人私钥: nano bot/.env"
echo "  3. 启动机器人: cd bot && npm run start"
if [ -z "$DEPLOY_KEY" ]; then
    echo "  4. 部署子图: ./deploy-all.sh <YOUR_DEPLOY_KEY>"
fi

echo ""
