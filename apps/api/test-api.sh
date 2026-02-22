#!/bin/bash

# ILAL API 测试脚本
# 用法: ./test-api.sh

set -e

API_BASE="${API_BASE:-http://localhost:3001/api/v1}"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="Test1234!@#$"
NAME="测试用户"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ILAL API 完整测试流程              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# 检查服务是否运行
echo -e "${YELLOW}🔍 检查服务状态...${NC}"
if ! curl -s "$API_BASE/../health" > /dev/null; then
  echo -e "${RED}❌ API 服务未运行！请先启动服务:${NC}"
  echo -e "   cd apps/api && npm run dev"
  exit 1
fi
echo -e "${GREEN}✅ 服务正常运行${NC}"
echo ""

# 1. 用户注册
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1️⃣  用户注册${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "邮箱: $EMAIL"
echo "密码: $PASSWORD"
echo ""

REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\"
  }")

# 检查是否成功
if echo "$REGISTER_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 注册成功！${NC}"
  ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r .accessToken)
  REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r .refreshToken)
  USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r .user.id)
  
  echo ""
  echo -e "${GREEN}用户信息:${NC}"
  echo "$REGISTER_RESPONSE" | jq -C '.user'
  echo ""
  echo -e "${GREEN}Access Token (前 50 字符):${NC} ${ACCESS_TOKEN:0:50}..."
else
  echo -e "${RED}❌ 注册失败！${NC}"
  echo "$REGISTER_RESPONSE" | jq -C .
  exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  注意：邮箱验证码已发送（如果配置了 RESEND_API_KEY）${NC}"
echo -e "   或者查看服务器日志获取验证码"
echo ""

# 2. 获取验证码（从日志或手动输入）
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2️⃣  邮箱验证${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 模拟验证码（实际应该从邮箱或日志获取）
echo -e "${YELLOW}请输入收到的 6 位验证码（回车跳过验证）:${NC}"
read -r VERIFICATION_CODE

if [ -n "$VERIFICATION_CODE" ]; then
  VERIFY_RESPONSE=$(curl -s -X POST "$API_BASE/auth/verify-email" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"code\": \"$VERIFICATION_CODE\"
    }")
  
  if echo "$VERIFY_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 邮箱验证成功！${NC}"
    ACCESS_TOKEN=$(echo "$VERIFY_RESPONSE" | jq -r .accessToken)
    echo ""
    echo "$VERIFY_RESPONSE" | jq -C '.user'
  else
    echo -e "${RED}❌ 验证失败！${NC}"
    echo "$VERIFY_RESPONSE" | jq -C .
  fi
else
  echo -e "${YELLOW}⏭️  跳过验证步骤${NC}"
fi

echo ""

# 3. 登录测试
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3️⃣  用户登录${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

if echo "$LOGIN_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 登录成功！${NC}"
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .accessToken)
  echo ""
  echo "$LOGIN_RESPONSE" | jq -C '.user'
elif echo "$LOGIN_RESPONSE" | jq -e '.requiresVerification' > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  需要先验证邮箱${NC}"
  echo "$LOGIN_RESPONSE" | jq -C .
else
  echo -e "${RED}❌ 登录失败！${NC}"
  echo "$LOGIN_RESPONSE" | jq -C .
fi

echo ""

# 4. 获取用户信息
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4️⃣  获取用户信息${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ME_RESPONSE=$(curl -s -X GET "$API_BASE/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$ME_RESPONSE" | jq -e '.user' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 获取成功！${NC}"
  echo ""
  echo "$ME_RESPONSE" | jq -C '.user'
else
  echo -e "${RED}❌ 获取失败！${NC}"
  echo "$ME_RESPONSE" | jq -C .
fi

echo ""

# 5. 创建 API Key
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}5️⃣  创建 API Key${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

APIKEY_RESPONSE=$(curl -s -X POST "$API_BASE/apikeys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "测试 API Key",
    "permissions": ["verify", "session"],
    "rateLimit": 100
  }')

if echo "$APIKEY_RESPONSE" | jq -e '.apiKey' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API Key 创建成功！${NC}"
  API_KEY=$(echo "$APIKEY_RESPONSE" | jq -r .apiKey)
  API_KEY_ID=$(echo "$APIKEY_RESPONSE" | jq -r .id)
  
  echo ""
  echo -e "${RED}⚠️  请保存此 API Key（仅显示一次）:${NC}"
  echo -e "${GREEN}$API_KEY${NC}"
  echo ""
  echo "$APIKEY_RESPONSE" | jq -C 'del(.apiKey)'
else
  echo -e "${RED}❌ 创建失败！${NC}"
  echo "$APIKEY_RESPONSE" | jq -C .
fi

echo ""

# 6. 列出所有 API Keys
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}6️⃣  列出所有 API Keys${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

LIST_RESPONSE=$(curl -s -X GET "$API_BASE/apikeys" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$LIST_RESPONSE" | jq -e '.apiKeys' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 获取成功！${NC}"
  echo ""
  echo "$LIST_RESPONSE" | jq -C '.apiKeys'
else
  echo -e "${RED}❌ 获取失败！${NC}"
  echo "$LIST_RESPONSE" | jq -C .
fi

echo ""

# 7. 更新 API Key
if [ -n "$API_KEY_ID" ]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}7️⃣  更新 API Key${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE/apikeys/$API_KEY_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
      "name": "更新后的 API Key",
      "rateLimit": 200
    }')
  
  if echo "$UPDATE_RESPONSE" | jq -e '.apiKey' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 更新成功！${NC}"
    echo ""
    echo "$UPDATE_RESPONSE" | jq -C '.apiKey'
  else
    echo -e "${RED}❌ 更新失败！${NC}"
    echo "$UPDATE_RESPONSE" | jq -C .
  fi
  
  echo ""
fi

# 8. 撤销 API Key
if [ -n "$API_KEY_ID" ]; then
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}8️⃣  撤销 API Key${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/apikeys/$API_KEY_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if echo "$DELETE_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 撤销成功！${NC}"
    echo ""
    echo "$DELETE_RESPONSE" | jq -C .
  else
    echo -e "${RED}❌ 撤销失败！${NC}"
    echo "$DELETE_RESPONSE" | jq -C .
  fi
  
  echo ""
fi

# 总结
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            测试完成 🎉                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}测试账号信息:${NC}"
echo "  邮箱: $EMAIL"
echo "  密码: $PASSWORD"
echo "  用户 ID: $USER_ID"
[ -n "$API_KEY" ] && echo "  API Key: ${API_KEY:0:30}..."
echo ""
echo -e "${YELLOW}💡 提示:${NC}"
echo "  - 可以使用 Prisma Studio 查看数据库: npm run db:studio"
echo "  - 查看完整 API 文档: apps/api/docs/API.md"
echo "  - 查看测试指南: apps/api/API_TEST_GUIDE.md"
echo ""
