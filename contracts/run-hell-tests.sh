#!/bin/bash

# 🔥 ILAL 地狱级测试运行脚本

set -e

echo "🔥🔥🔥 ILAL 地狱级测试开始 🔥🔥🔥"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0

# 运行测试函数
run_test() {
    local test_name=$1
    local test_cmd=$2
    
    echo -e "${YELLOW}▶ $test_name${NC}"
    
    if eval "$test_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
        # 显示错误详情
        eval "$test_cmd"
    fi
    echo ""
}

echo "═══════════════════════════════════════════════════════════"
echo "1️⃣  核心单元测试 (Unit Tests)"
echo "═══════════════════════════════════════════════════════════"
echo ""

run_test "Hook 准入 - 白名单通过" \
    "forge test --match-test test_BeforeSwap_Allowed -vv"

run_test "Hook 准入 - 黑名单拦截" \
    "forge test --match-test testFail_BeforeSwap_NotVerified -vv"

run_test "Hook 准入 - 过期拦截" \
    "forge test --match-test test_E2E_CompleteUserJourney -vv"

run_test "Hook 准入 - 伪造签名拦截" \
    "forge test --match-test test_Hell_FakeSignature -vv"

run_test "流动性 - 添加流动性（未验证）" \
    "forge test --match-test testFail_BeforeAddLiquidity_NotVerified -vv"

run_test "流动性 - 紧急模式下可撤资" \
    "forge test --match-test test_Hell_EmergencyWithdrawal -vv"

run_test "流动性 - NFT 转让被阻止" \
    "forge test --match-test test_Hell_NFTTransferBlocked -vv"

run_test "Registry - 非管理员无权限" \
    "forge test --match-test test_Hell_UnauthorizedAccess -vv"

run_test "Registry - 升级保留数据" \
    "forge test --match-test test_Hell_UpgradePreservesData -vv"

echo "═══════════════════════════════════════════════════════════"
echo "2️⃣  安全与极端场景 (Security Tests)"
echo "═══════════════════════════════════════════════════════════"
echo ""

run_test "紧急暂停 - 熔断测试" \
    "forge test --match-test test_E2E_EmergencyPause -vv"

run_test "防重放 - 跨用户攻击" \
    "forge test --match-test test_Hell_ProofReplayCrossUser -vv"

run_test "防重放 - 过期 Proof" \
    "forge test --match-test test_Hell_ProofReplayOldProof -vv"

echo "═══════════════════════════════════════════════════════════"
echo "3️⃣  性能测试 (Performance Tests)"
echo "═══════════════════════════════════════════════════════════"
echo ""

run_test "Gas 消耗基准" \
    "forge test --match-test test_Hell_GasConsumption --gas-report"

echo "═══════════════════════════════════════════════════════════"
echo "4️⃣  不变性测试 (Invariant Tests)"
echo "═══════════════════════════════════════════════════════════"
echo ""

run_test "Invariant - 未验证用户余额不变" \
    "forge test --match-contract ComplianceInvariant --match-test invariant_unverifiedUserBalanceZero"

run_test "Invariant - Session 过期时间单调" \
    "forge test --match-contract ComplianceInvariant --match-test invariant_sessionExpiryMonotonic"

run_test "Invariant - 紧急模式阻止所有交易" \
    "forge test --match-contract ComplianceInvariant --match-test invariant_emergencyPauseBlocksAll"

run_test "Invariant - Nonce 单调递增" \
    "forge test --match-contract ComplianceInvariant --match-test invariant_nonceMonotonic"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 测试结果汇总"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ 通过: $PASSED${NC}"
echo -e "${RED}❌ 失败: $FAILED${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo "总通过率: $PERCENTAGE% ($PASSED/$TOTAL)"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉🎉🎉 所有测试通过！可以继续下一步！ 🎉🎉🎉${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有测试失败，请修复后再上线！${NC}"
    exit 1
fi
