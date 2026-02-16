#!/bin/bash

# ILAL Mock Theater 启动脚本
# 用法: ./run-theater.sh

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ILAL Mock Theater - 对手戏测试启动器                            ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# 检查配置文件
CONFIG_FILE="./mock-theater-config.env"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 错误: 未找到配置文件 $CONFIG_FILE"
    echo ""
    echo "请按以下步骤操作:"
    echo "  1. 复制配置模板:"
    echo "     cp mock-theater-config.example.env mock-theater-config.env"
    echo ""
    echo "  2. 编辑配置文件，填入两个账户的私钥:"
    echo "     vim mock-theater-config.env"
    echo ""
    echo "  3. 重新运行此脚本:"
    echo "     ./run-theater.sh"
    exit 1
fi

# 加载配置
echo "📋 加载配置..."
source "$CONFIG_FILE"

# 验证必需的环境变量
if [ -z "$ACCOUNT_A_KEY" ] || [ -z "$ACCOUNT_B_KEY" ]; then
    echo "❌ 错误: 配置文件中缺少必需的私钥"
    echo ""
    echo "请编辑 $CONFIG_FILE 并设置:"
    echo "  ACCOUNT_A_KEY=0x..."
    echo "  ACCOUNT_B_KEY=0x..."
    exit 1
fi

echo "✅ 配置已加载"
echo ""
echo "账户信息:"
echo "  账户 A (机构巨鲸): ${ACCOUNT_A_KEY:0:10}...${ACCOUNT_A_KEY: -4}"
echo "  账户 B (高频交易员): ${ACCOUNT_B_KEY:0:10}...${ACCOUNT_B_KEY: -4}"
echo ""

# 询问用户确认
read -p "是否继续执行测试? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "🚀 启动 Mock Theater..."
echo ""

# 运行测试
tsx mock-theater.ts

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  测试完成!                                                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
