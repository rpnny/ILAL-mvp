#!/bin/bash
###############################################################################
# 修复 SimpleSwapRouter 路由授权
#
# 问题: SimpleSwapRouter 未在 Registry 中被授权
# 解决: 调用 Registry.approveRouter(simpleSwapRouter, true)
# 前提: 需要治理地址的私钥
###############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
REGISTRY="0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD"
SWAP_ROUTER="0x2AAF6C551168DCF22804c04DdA2c08c82031F289"
RPC_URL="https://sepolia.base.org"

echo "🔧 修复 SimpleSwapRouter 路由授权"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Registry:    $REGISTRY"
echo "  SwapRouter:  $SWAP_ROUTER"
echo "  网络:        Base Sepolia"
echo ""

# 检查当前状态
echo "📋 当前状态检查..."
CURRENT=$(cast call $REGISTRY "isRouterApproved(address)(bool)" $SWAP_ROUTER --rpc-url $RPC_URL)
echo "  当前授权状态: $CURRENT"

if [ "$CURRENT" = "true" ]; then
    echo -e "${GREEN}✅ 路由已经被授权，无需操作！${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}⚠️  路由未授权，准备发送交易...${NC}"
echo ""

# 检查私钥
if [ -z "$PRIVATE_KEY" ]; then
    echo "请设置治理地址的私钥环境变量:"
    echo ""
    echo "  export PRIVATE_KEY=your_private_key_here"
    echo "  bash scripts/fix-router-approval.sh"
    echo ""
    echo "或者一行执行:"
    echo ""
    echo "  PRIVATE_KEY=your_private_key_here bash scripts/fix-router-approval.sh"
    echo ""
    exit 1
fi

# 发送交易
echo "📤 发送 approveRouter 交易..."
TX_HASH=$(cast send $REGISTRY \
    "approveRouter(address,bool)" \
    $SWAP_ROUTER \
    true \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json | jq -r '.transactionHash')

echo "  交易哈希: $TX_HASH"
echo ""

# 等待确认
echo "⏳ 等待交易确认..."
cast receipt $TX_HASH --rpc-url $RPC_URL --json | jq '{status, blockNumber, gasUsed}'

# 验证结果
echo ""
echo "📋 验证修复结果..."
RESULT=$(cast call $REGISTRY "isRouterApproved(address)(bool)" $SWAP_ROUTER --rpc-url $RPC_URL)
echo "  授权状态: $RESULT"

if [ "$RESULT" = "true" ]; then
    echo ""
    echo -e "${GREEN}✅ 修复成功！SimpleSwapRouter 已被授权${NC}"
    echo "  BaseScan: https://sepolia.basescan.org/tx/$TX_HASH"
else
    echo ""
    echo -e "${RED}❌ 修复失败，请检查交易详情${NC}"
    exit 1
fi
