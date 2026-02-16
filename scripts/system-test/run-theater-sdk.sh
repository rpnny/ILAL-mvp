#!/bin/bash

# ILAL Mock Theater - SDK 版本启动脚本

set -e

echo "🎭 ILAL Mock Theater - SDK 版本"
echo "========================================"
echo ""

# 检查环境变量
if [ -z "$ACCOUNT_A_KEY" ] || [ -z "$ACCOUNT_B_KEY" ]; then
  echo "❌ 错误: 请先设置环境变量"
  echo ""
  echo "使用方法:"
  echo "  export ACCOUNT_A_KEY=\"0x...\""
  echo "  export ACCOUNT_B_KEY=\"0x...\""
  echo "  ./run-theater-sdk.sh"
  echo ""
  exit 1
fi

# 可选参数
export TEST_ROUNDS="${TEST_ROUNDS:-2}"
export SWAP_INTERVAL="${SWAP_INTERVAL:-8000}"
export MIN_SWAP="${MIN_SWAP:-0.5}"
export MAX_SWAP="${MAX_SWAP:-2}"
export LIQUIDITY_AMOUNT="${LIQUIDITY_AMOUNT:-0.003}"

echo "📦 参数配置:"
echo "  TEST_ROUNDS: $TEST_ROUNDS"
echo "  SWAP_INTERVAL: ${SWAP_INTERVAL}ms"
echo "  SWAP_AMOUNT: $MIN_SWAP - $MAX_SWAP USDC"
echo "  LIQUIDITY: $LIQUIDITY_AMOUNT WETH"
echo ""

# 检查 SDK 是否已构建
SDK_PATH="../../packages/sdk/dist/index.js"
if [ ! -f "$SDK_PATH" ]; then
  echo "⚠️  SDK 未构建，正在构建..."
  cd ../../packages/sdk
  npm run build
  cd -
  echo "✅ SDK 构建完成"
  echo ""
fi

# 运行测试
echo "🚀 启动测试..."
echo ""

npx tsx mock-theater-sdk.ts

echo ""
echo "✅ 测试执行完成"
