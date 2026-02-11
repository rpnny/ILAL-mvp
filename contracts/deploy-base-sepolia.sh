#!/bin/bash

# ILAL Base Sepolia 部署脚本
# 使用方法: ./deploy-base-sepolia.sh

set -e

echo "🚀 ILAL - Base Sepolia 部署"
echo "=================================="
echo ""

# ============ 检查环境 ============

if [ ! -f .env ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "   请复制 .env.example 并填入真实值"
    echo "   cp .env.example .env"
    exit 1
fi

source .env

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ 错误: PRIVATE_KEY 未设置"
    echo "   请在 .env 中设置 PRIVATE_KEY"
    exit 1
fi

if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    echo "❌ 错误: BASE_SEPOLIA_RPC_URL 未设置"
    echo "   请在 .env 中设置 BASE_SEPOLIA_RPC_URL"
    exit 1
fi

# ============ 获取部署者地址 ============

DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)
echo "📍 部署者地址: $DEPLOYER"
echo ""

# ============ 检查余额 ============

echo "💰 检查账户余额..."
BALANCE=$(cast balance $DEPLOYER --rpc-url $BASE_SEPOLIA_RPC_URL)
BALANCE_ETH=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)

echo "   余额: $BALANCE_ETH ETH"

if [ $(echo "$BALANCE_ETH < 0.5" | bc) -eq 1 ]; then
    echo "⚠️  警告: 余额较低，建议至少 0.5 ETH"
    echo "   获取测试 ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
    echo ""
    read -p "是否继续? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# ============ 检查链 ID ============

echo "🔗 检查网络..."
CHAIN_ID=$(cast chain-id --rpc-url $BASE_SEPOLIA_RPC_URL)
echo "   Chain ID: $CHAIN_ID"

if [ "$CHAIN_ID" != "84532" ]; then
    echo "❌ 错误: 链 ID 不正确 (期望 84532, 实际 $CHAIN_ID)"
    exit 1
fi

echo "   ✅ 连接到 Base Sepolia"
echo ""

# ============ 检查 Gas Price ============

echo "⛽ 检查 Gas Price..."
GAS_PRICE=$(cast gas-price --rpc-url $BASE_SEPOLIA_RPC_URL)
GAS_PRICE_GWEI=$(echo "scale=2; $GAS_PRICE / 1000000000" | bc)
echo "   Gas Price: $GAS_PRICE_GWEI gwei"

# 估算成本
ESTIMATED_GAS=5000000
ESTIMATED_COST=$(echo "scale=4; $GAS_PRICE * $ESTIMATED_GAS / 1000000000000000000" | bc)
echo "   预估成本: ~$ESTIMATED_COST ETH (假设 5M gas)"
echo ""

# ============ 确认部署 ============

echo "=================================="
echo "📋 部署摘要"
echo "=================================="
echo "网络: Base Sepolia (Chain ID: $CHAIN_ID)"
echo "部署者: $DEPLOYER"
echo "余额: $BALANCE_ETH ETH"
echo "预估成本: ~$ESTIMATED_COST ETH"
echo ""
echo "将部署以下合约:"
echo "  1. Registry (UUPS Proxy)"
echo "  2. SessionManager (UUPS Proxy)"
echo "  3. PlonkVerifier"
echo "  4. PlonkVerifierAdapter"
echo "  5. ComplianceHook"
echo "  6. VerifiedPoolsPositionManager"
echo ""
echo "⚠️  注意: 此操作将消耗真实的测试网 ETH"
echo ""

read -p "确认部署? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ 部署已取消"
    exit 1
fi

echo ""
echo "=================================="
echo "🚀 开始部署..."
echo "=================================="
echo ""

# ============ 执行部署 ============

# 设置 Foundry 配置
export PATH="$HOME/.foundry/bin:$PATH"

# 模拟部署
echo "1️⃣  模拟部署 (不广播)..."
forge script script/DeployPlonk.s.sol:DeployPlonk \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --sender $DEPLOYER \
    -vv

if [ $? -ne 0 ]; then
    echo "❌ 模拟部署失败"
    exit 1
fi

echo ""
echo "✅ 模拟部署成功"
echo ""

# 实际部署
echo "2️⃣  执行实际部署..."
echo ""

if [ -n "$BASESCAN_API_KEY" ]; then
    echo "   (将同时进行合约验证)"
    forge script script/DeployPlonk.s.sol:DeployPlonk \
        --rpc-url $BASE_SEPOLIA_RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify \
        --etherscan-api-key $BASESCAN_API_KEY \
        -vvvv
else
    echo "   (跳过合约验证，未设置 BASESCAN_API_KEY)"
    forge script script/DeployPlonk.s.sol:DeployPlonk \
        --rpc-url $BASE_SEPOLIA_RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        -vvvv
fi

if [ $? -ne 0 ]; then
    echo "❌ 部署失败"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ 部署成功！"
echo "=================================="
echo ""

# ============ 输出部署信息 ============

if [ -f "deployments/84532-plonk.json" ]; then
    echo "📄 部署地址已保存到: deployments/84532-plonk.json"
    echo ""
    echo "核心合约地址:"
    cat deployments/84532-plonk.json | grep -E '"(registry|sessionManager|plonkVerifier|verifierAdapter|complianceHook)"' | sed 's/^/  /'
    echo ""
fi

# ============ 后续步骤 ============

echo "=================================="
echo "📝 后续步骤"
echo "=================================="
echo ""
echo "1. 查看部署详情:"
echo "   cat deployments/84532-plonk.json"
echo ""
echo "2. 在 Basescan 查看合约:"
echo "   https://sepolia.basescan.org/"
echo ""
echo "3. 更新前端配置:"
echo "   编辑 frontend/.env.local"
echo ""
echo "4. 测试合约:"
echo "   forge test --fork-url \$BASE_SEPOLIA_RPC_URL"
echo ""
echo "5. 手动验证合约 (如果自动验证失败):"
echo "   forge verify-contract <ADDRESS> <CONTRACT> --chain-id 84532"
echo ""
echo "=================================="
echo "🎉 部署完成！"
echo "=================================="
