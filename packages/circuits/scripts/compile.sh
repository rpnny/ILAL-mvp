#!/bin/bash

# ILAL 电路编译脚本

set -e

echo "🔨 编译 ILAL 合规电路..."

# 检查 Circom 是否安装
if ! command -v circom &> /dev/null; then
    echo "❌ 错误: Circom 未安装"
    echo "请运行: cargo install circom"
    exit 1
fi

echo "✅ Circom 版本: $(circom --version)"

# 创建输出目录
mkdir -p ../build

# 编译电路
echo ""
echo "📦 编译 compliance.circom..."
circom ../compliance.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -o ../build \
    -l ../circuits-lib/circuits

echo ""
echo "✅ 编译完成!"
echo ""
echo "📊 电路信息:"
snarkjs r1cs info ../build/compliance.r1cs

echo ""
echo "📁 输出文件:"
ls -lh ../build/

echo ""
echo "下一步:"
echo "  1. 运行 ./setup.sh 进行 PLONK Setup"
echo "  2. 运行 ./generate-proof.sh 生成测试证明"
