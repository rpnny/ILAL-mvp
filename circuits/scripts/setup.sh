#!/bin/bash

# ILAL PLONK Setup 脚本

set -e

echo "🔐 执行 PLONK Setup..."

# 检查 SnarkJS 是否安装
if ! command -v snarkjs &> /dev/null; then
    echo "❌ 错误: SnarkJS 未安装"
    echo "请运行: npm install -g snarkjs"
    exit 1
fi

echo "✅ SnarkJS 版本: $(snarkjs --version)"

# 检查 Powers of Tau 文件
POT_FILE="../keys/pot20_final.ptau"
if [ ! -f "$POT_FILE" ]; then
    echo ""
    echo "⬇️  下载 Powers of Tau..."
    mkdir -p ../keys
    cd ../keys
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau \
         -O pot20_final.ptau
    cd ../scripts
    echo "✅ 下载完成!"
fi

echo ""
echo "📊 Powers of Tau 信息:"
ls -lh "$POT_FILE"

# 检查 R1CS 文件
if [ ! -f "../build/compliance.r1cs" ]; then
    echo "❌ 错误: 请先运行 ./compile.sh 编译电路"
    exit 1
fi

echo ""
echo "🔨 生成 PLONK 验证密钥..."
snarkjs plonk setup \
    ../build/compliance.r1cs \
    "$POT_FILE" \
    ../keys/compliance.zkey

echo ""
echo "📤 导出验证密钥..."
snarkjs zkey export verificationkey \
    ../keys/compliance.zkey \
    ../keys/verification_key.json

echo ""
echo "🔍 验证 zkey..."
snarkjs zkey verify \
    ../build/compliance.r1cs \
    "$POT_FILE" \
    ../keys/compliance.zkey

echo ""
echo "📝 导出 Solidity 验证器..."
snarkjs zkey export solidityverifier \
    ../keys/compliance.zkey \
    ../../contracts/src/core/PlonkVerifier.sol

echo ""
echo "✅ Setup 完成!"
echo ""
echo "📁 生成的文件:"
ls -lh ../keys/

echo ""
echo "下一步:"
echo "  1. 运行 ./generate-proof.sh 生成测试证明"
echo "  2. 使用 PlonkVerifier.sol 替换 MockVerifier"
