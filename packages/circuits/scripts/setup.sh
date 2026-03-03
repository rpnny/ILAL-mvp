#!/bin/bash

# ILAL PLONK Setup 脚本

set -e

echo "🔐 执行 PLONK Setup..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Use npx snarkjs (no global install required)
SNARKJS="npx snarkjs"

echo "✅ SnarkJS 版本: $($SNARKJS --version)"

# 检查 Powers of Tau 文件
POT_FILE="$SCRIPT_DIR/../keys/pot20_final.ptau"
if [ ! -f "$POT_FILE" ]; then
    echo ""
    echo "⬇️  下载 Powers of Tau..."
    mkdir -p "$SCRIPT_DIR/../keys"
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_20.ptau \
         -o "$SCRIPT_DIR/../keys/pot20_final.ptau"
    echo "✅ 下载完成!"
fi

echo ""
echo "📊 Powers of Tau 信息:"
ls -lh "$POT_FILE"

# 检查 R1CS 文件
if [ ! -f "$SCRIPT_DIR/../build/compliance.r1cs" ]; then
    echo "❌ 错误: 请先运行 ./compile.sh 编译电路"
    exit 1
fi

echo ""
echo "🔨 生成 PLONK 验证密钥..."
$SNARKJS plonk setup \
    "$SCRIPT_DIR/../build/compliance.r1cs" \
    "$POT_FILE" \
    "$SCRIPT_DIR/../keys/compliance.zkey"

echo ""
echo "📤 导出验证密钥..."
$SNARKJS zkey export verificationkey \
    "$SCRIPT_DIR/../keys/compliance.zkey" \
    "$SCRIPT_DIR/../keys/verification_key.json"

echo ""
echo "📝 导出 Solidity 验证器..."
$SNARKJS zkey export solidityverifier \
    "$SCRIPT_DIR/../keys/compliance.zkey" \
    "$SCRIPT_DIR/../../contracts/src/verifiers/PlonkVerifier.sol"

echo ""
echo "✅ Setup 完成!"
echo ""
echo "📁 生成的文件:"
ls -lh "$SCRIPT_DIR/../keys/"

echo ""
echo "下一步:"
echo "  1. 运行 ./generate-proof.sh 生成测试证明"
echo "  2. 使用 PlonkVerifier.sol 替换 MockVerifier"
