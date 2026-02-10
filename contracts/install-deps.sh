#!/bin/bash

# ILAL 合约依赖安装脚本
# 请确保已安装 Foundry: https://book.getfoundry.sh/getting-started/installation

set -e

echo "📦 安装 ILAL 合约依赖..."

# 检查 Foundry 是否安装
if ! command -v forge &> /dev/null; then
    echo "❌ 错误: Foundry 未安装"
    echo "请运行: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

echo "✅ Foundry 已安装: $(forge --version)"

# 安装 OpenZeppelin Contracts
echo ""
echo "📥 安装 OpenZeppelin Contracts..."
forge install OpenZeppelin/openzeppelin-contracts

# 安装 OpenZeppelin Upgradeable
echo ""
echo "📥 安装 OpenZeppelin Contracts Upgradeable..."
forge install OpenZeppelin/openzeppelin-contracts-upgradeable

# 安装 Uniswap v4 Core
echo ""
echo "📥 安装 Uniswap v4 Core..."
forge install Uniswap/v4-core

# 安装 Uniswap v4 Periphery
echo ""
echo "📥 安装 Uniswap v4 Periphery..."
forge install Uniswap/v4-periphery

# 安装 EAS Contracts
echo ""
echo "📥 安装 Ethereum Attestation Service..."
forge install ethereum-attestation-service/eas-contracts

# 安装 Forge Std (测试库)
echo ""
echo "📥 安装 Forge Standard Library..."
forge install foundry-rs/forge-std

echo ""
echo "✅ 所有依赖安装完成!"
echo ""
echo "下一步:"
echo "  1. 运行测试: forge test"
echo "  2. 构建合约: forge build"
echo "  3. 部署脚本: forge script script/Deploy.s.sol"
