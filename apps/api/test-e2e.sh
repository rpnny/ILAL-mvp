#!/bin/bash

# ILAL API 端到端测试脚本
# 自动启动 API 服务并运行测试

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║     ILAL API 端到端测试启动器                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 检查环境
echo "🔍 检查环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装"
    exit 1
fi

# 检查 tsx
if ! command -v tsx &> /dev/null && ! pnpm list -g tsx &> /dev/null; then
    echo "📦 安装 tsx..."
    pnpm add -g tsx
fi

echo "✅ 环境检查通过"
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件"
    echo "📝 从 .env.example 创建 .env..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件配置必要的环境变量"
    echo ""
fi

# 检查数据库连接
echo "🔍 检查数据库连接..."
if ! pnpm prisma db pull --schema=./prisma/schema.prisma &> /dev/null; then
    echo "⚠️  数据库连接失败或未迁移"
    echo "📦 运行数据库迁移..."
    pnpm db:migrate || {
        echo "❌ 数据库迁移失败"
        echo "💡 请确保 PostgreSQL 已安装并运行"
        echo "💡 请检查 .env 中的 DATABASE_URL 配置"
        exit 1
    }
fi

echo "✅ 数据库连接正常"
echo ""

# 检查 API 服务是否已运行
API_URL="http://localhost:3001"
echo "🔍 检查 API 服务..."

if curl -s "${API_URL}/api/v1/health" > /dev/null 2>&1; then
    echo "✅ API 服务已运行"
    RUN_TESTS_ONLY=true
else
    echo "⚠️  API 服务未运行"
    echo "🚀 启动 API 服务..."
    
    # 在后台启动 API 服务
    pnpm dev > /dev/null 2>&1 &
    API_PID=$!
    
    echo "⏳ 等待 API 服务启动..."
    for i in {1..30}; do
        if curl -s "${API_URL}/api/v1/health" > /dev/null 2>&1; then
            echo "✅ API 服务已启动 (PID: $API_PID)"
            break
        fi
        
        if [ $i -eq 30 ]; then
            echo "❌ API 服务启动超时"
            kill $API_PID 2>/dev/null || true
            exit 1
        fi
        
        sleep 1
    done
fi

echo ""
echo "🧪 运行端到端测试..."
echo ""

# 运行测试
tsx test-e2e.ts
TEST_EXIT_CODE=$?

# 如果是我们启动的服务，测试后关闭
if [ -n "$API_PID" ] && [ -z "$RUN_TESTS_ONLY" ]; then
    echo ""
    echo "🛑 关闭 API 服务..."
    kill $API_PID 2>/dev/null || true
    echo "✅ 服务已关闭"
fi

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 测试完成！所有测试通过！"
else
    echo "⚠️  测试完成，但有失败的测试"
fi

exit $TEST_EXIT_CODE
