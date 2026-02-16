#!/bin/bash

# ILAL SDK 发布脚本
# 使用方法: ./publish.sh

set -e  # 遇到错误立即退出

echo "🚀 ILAL SDK 发布脚本"
echo "===================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 packages/sdk 目录下运行此脚本"
    exit 1
fi

# 检查包名
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

echo "📦 准备发布: $PACKAGE_NAME@$PACKAGE_VERSION"
echo ""

# 1. 清理旧的构建
echo "🧹 清理旧的构建..."
rm -rf dist
echo "✅ 清理完成"
echo ""

# 2. 重新安装依赖（确保是最新的）
echo "📥 安装依赖..."
npm install
echo "✅ 依赖安装完成"
echo ""

# 3. 重新构建
echo "🔨 构建 SDK..."
npm run build
echo "✅ 构建完成"
echo ""

# 4. 运行测试
echo "🧪 运行测试..."
cd ../../scripts/system-test
npx tsx test-sdk-basic.ts
cd ../../packages/sdk
echo "✅ 测试通过"
echo ""

# 5. 预览发布内容
echo "👀 预览发布内容..."
npm pack --dry-run
echo ""

# 6. 检查 NPM 登录状态
echo "🔑 检查 NPM 登录状态..."
if npm whoami &> /dev/null; then
    NPM_USER=$(npm whoami)
    echo "✅ 已登录为: $NPM_USER"
    echo ""
    
    # 7. 询问是否继续发布
    echo "❓ 准备发布 $PACKAGE_NAME@$PACKAGE_VERSION (alpha 标签)"
    echo ""
    read -p "确认发布？(y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🚀 正在发布到 NPM..."
        npm publish --tag alpha --access public
        echo ""
        echo "🎉 发布成功！"
        echo ""
        echo "📦 你的包已发布："
        echo "   名称: $PACKAGE_NAME"
        echo "   版本: $PACKAGE_VERSION"
        echo "   标签: alpha"
        echo ""
        echo "📥 安装命令："
        echo "   npm install $PACKAGE_NAME@alpha"
        echo ""
        echo "🌐 查看你的包："
        echo "   https://www.npmjs.com/package/$PACKAGE_NAME"
        echo ""
    else
        echo "❌ 取消发布"
        exit 0
    fi
else
    echo "❌ 未登录 NPM"
    echo ""
    echo "请先执行以下命令登录："
    echo "  npm login"
    echo ""
    echo "然后重新运行此脚本"
    exit 1
fi
