#!/bin/bash
###############################################################################
# ILAL 一键业务验证
#
# 阶段 A (本地): forge test → API unit test → SDK unit test
# 阶段 B (测试网): institutional-e2e.ts (需要 API 服务运行)
#
# Usage:
#   bash scripts/check.sh          # 跑全部 (本地 + 测试网)
#   bash scripts/check.sh local    # 只跑本地测试
#   bash scripts/check.sh testnet  # 只跑测试网 E2E
###############################################################################

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASSED=0
FAILED=0
SKIPPED=0
RESULTS=()

record() {
  local status="$1" name="$2" detail="$3"
  if [ "$status" = "PASS" ]; then
    PASSED=$((PASSED + 1))
    RESULTS+=("${GREEN}PASS${NC}  $name")
  elif [ "$status" = "FAIL" ]; then
    FAILED=$((FAILED + 1))
    RESULTS+=("${RED}FAIL${NC}  $name  — $detail")
  else
    SKIPPED=$((SKIPPED + 1))
    RESULTS+=("${YELLOW}SKIP${NC}  $name  — $detail")
  fi
}

MODE="${1:-all}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         ILAL 一键业务验证                        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ═══════════════════════════════════════
#  阶段 A — 本地测试
# ═══════════════════════════════════════

if [ "$MODE" = "all" ] || [ "$MODE" = "local" ]; then

  echo -e "${CYAN}── 阶段 A: 本地测试 ──${NC}"
  echo ""

  # Step 1: Forge test
  echo -n "  [1/5] Forge 合约测试 ... "
  if (cd packages/contracts && forge test --no-match-path "test/{hell,integration/ForkSwapTest}*" -q) > /tmp/ilal-forge.log 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    record "PASS" "Forge 合约测试"
  else
    echo -e "${RED}FAIL${NC}"
    record "FAIL" "Forge 合约测试" "$(tail -n 1 /tmp/ilal-forge.log)"
  fi

  # Step 2: Forge coverage (non-blocking)
  echo -n "  [2/5] Forge 覆盖率 ... "
  if (cd packages/contracts && forge coverage --no-match-path "test/{hell,integration/ForkSwapTest}*" --report summary 2>&1 | tail -n 20) > /tmp/ilal-coverage.log 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    record "PASS" "Forge 覆盖率"
    echo ""
    echo -e "  ${CYAN}覆盖率摘要:${NC}"
    tail -n 12 /tmp/ilal-coverage.log | head -n 10 | while IFS= read -r line; do echo "    $line"; done
    echo ""
  else
    echo -e "${YELLOW}SKIP${NC}"
    record "SKIP" "Forge 覆盖率" "coverage 命令失败 (不影响测试)"
  fi

  # Step 3: API unit tests
  echo -n "  [3/5] API 单元测试 ... "
  if pnpm --filter @ilal/api test 2>&1 | tail -n 5 > /tmp/ilal-api.log 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    record "PASS" "API 单元测试"
  else
    echo -e "${RED}FAIL${NC}"
    record "FAIL" "API 单元测试" "$(tail -n 1 /tmp/ilal-api.log)"
  fi

  # Step 4: SDK unit tests
  echo -n "  [4/5] SDK 单元测试 ... "
  if pnpm --filter @ilal/sdk test -- --run 2>&1 | tail -n 5 > /tmp/ilal-sdk.log 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    record "PASS" "SDK 单元测试"
  else
    echo -e "${RED}FAIL${NC}"
    record "FAIL" "SDK 单元测试" "$(tail -n 1 /tmp/ilal-sdk.log)"
  fi

  # Step 5: Landing tests
  echo -n "  [5/5] Landing 组件测试 ... "
  if pnpm --filter ilal-landing test -- --run 2>&1 | tail -n 5 > /tmp/ilal-landing.log 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    record "PASS" "Landing 组件测试"
  else
    echo -e "${RED}FAIL${NC}"
    record "FAIL" "Landing 组件测试" "$(tail -n 1 /tmp/ilal-landing.log)"
  fi

  echo ""
fi

# ═══════════════════════════════════════
#  阶段 B — 测试网 E2E
# ═══════════════════════════════════════

if [ "$MODE" = "all" ] || [ "$MODE" = "testnet" ]; then

  echo -e "${CYAN}── 阶段 B: 测试网 E2E ──${NC}"
  echo ""

  API_URL="http://localhost:3001/api/v1/health"
    if curl -s --max-time 3 "$API_URL" > /dev/null 2>&1; then
    echo "  [E2E] 机构全流程测试:"
    echo ""
    if npx tsx scripts/institutional-e2e.ts > /tmp/ilal-e2e.log 2>&1; then
      cat /tmp/ilal-e2e.log | tail -n 25
      record "PASS" "测试网 E2E"
    else
      cat /tmp/ilal-e2e.log | tail -n 25
      FAIL_COUNT=$(grep -c "^.*❌" /tmp/ilal-e2e.log 2>/dev/null || true)
      record "FAIL" "测试网 E2E" "${FAIL_COUNT:-?} 个步骤失败 (详见上方输出)"
    fi
  else
    echo -e "  ${YELLOW}API 服务未启动 (localhost:3001)，跳过测试网 E2E${NC}"
    echo -e "  提示: 先运行 ${CYAN}pnpm dev:api${NC} 再重试"
    record "SKIP" "测试网 E2E" "API 未启动"
  fi

  echo ""
fi

# ═══════════════════════════════════════
#  汇总
# ═══════════════════════════════════════

echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  汇总                                            ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════╣${NC}"

for r in "${RESULTS[@]}"; do
  echo -e "  $r"
done

echo ""
echo -e "  通过: ${GREEN}${PASSED}${NC}  失败: ${RED}${FAILED}${NC}  跳过: ${YELLOW}${SKIPPED}${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
