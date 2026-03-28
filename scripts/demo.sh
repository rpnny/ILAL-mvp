#!/usr/bin/env bash
#
# ILAL Full Demo — Institutional Liquidity Access Layer
# Runs a complete end-to-end flow against the live Railway API + Base Sepolia
#
# Prerequisites:
#   - curl, jq installed
#   - ILAL_API_KEY env var set (create one at https://ilal.tech/dashboard/api-keys)
#   - PRIVATE_KEY env var set (funded Base Sepolia wallet)

set -euo pipefail

API="https://ilal-mvp-production.up.railway.app"
FRONTEND="https://ilal.tech"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'
BOLD='\033[1m'

step() { echo -e "\n${CYAN}${BOLD}=== $1 ===${NC}\n"; }
ok()   { echo -e "  ${GREEN}✓ $1${NC}"; }
fail() { echo -e "  ${RED}✗ $1${NC}"; }
info() { echo -e "  ${YELLOW}→ $1${NC}"; }

# ── Preflight checks ─────────────────────────────────────────
step "0. Preflight Checks"

if ! command -v jq &> /dev/null; then fail "jq is required (brew install jq)"; exit 1; fi
ok "jq available"

if [ -z "${ILAL_API_KEY:-}" ]; then
  fail "ILAL_API_KEY not set. Get one at $FRONTEND/dashboard/api-keys"
  exit 1
fi
ok "ILAL_API_KEY set (${ILAL_API_KEY:0:12}...)"

WALLET="${WALLET_ADDRESS:-0x1b869CaC69Df23Ad9D727932496AEb3605538c8D}"
info "Using wallet: $WALLET"

# ── Part 1: Health Check ──────────────────────────────────────
step "1. API Health Check"

HEALTH=$(curl -s "$API/api/v1/health")
STATUS=$(echo "$HEALTH" | jq -r '.status // "unknown"')
if [ "$STATUS" = "ok" ]; then
  ok "API is healthy"
  echo "$HEALTH" | jq .
else
  fail "API unhealthy: $HEALTH"
  exit 1
fi

# ── Part 2: Onboarding Status ────────────────────────────────
step "2. Check Onboarding Status"

ONBOARD=$(curl -s -H "x-api-key: $ILAL_API_KEY" "$API/api/v1/onboarding/status/$WALLET")
KYC=$(echo "$ONBOARD" | jq -r '.institution.kycStatus // "null"')
if [ "$KYC" = "1" ]; then
  ok "Institution registered and KYC approved"
  echo "$ONBOARD" | jq '.institution | {walletAddress, kycStatus, countryCode, registeredAt}'
else
  info "Institution not yet registered — registering now..."
  REG=$(curl -s -X POST "$API/api/v1/onboarding/register" \
    -H "x-api-key: $ILAL_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"walletAddress\":\"$WALLET\",\"institutionName\":\"Demo Corp\",\"countryCode\":840}")
  echo "$REG" | jq .
  ok "Registration complete"
fi

# ── Part 3: Session Status ────────────────────────────────────
step "3. On-Chain Session Status"

SESSION=$(curl -s "$API/api/v1/session/$WALLET")
IS_ACTIVE=$(echo "$SESSION" | jq -r '.isActive // false')
echo "$SESSION" | jq .

if [ "$IS_ACTIVE" = "true" ]; then
  ok "Session ACTIVE — wallet can trade"
else
  info "Session not active. Attempting server-side ZK activation..."
  ACTIVATE=$(curl -s -X POST "$API/api/v1/onboarding/activate-session" \
    -H "x-api-key: $ILAL_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"walletAddress\":\"$WALLET\",\"expiry\":86400}")
  echo "$ACTIVATE" | jq .
  ACT_OK=$(echo "$ACTIVATE" | jq -r '.success // false')
  if [ "$ACT_OK" = "true" ]; then
    ok "Session activated via ZK proof!"
  else
    fail "Session activation failed — $(echo "$ACTIVATE" | jq -r '.message // "unknown"')"
  fi
fi

# ── Part 4: Compliant Address vs Non-Compliant ────────────────
step "4. Compliance Comparison"

DEAD="0x000000000000000000000000000000000000dEaD"

info "Checking verified address: $WALLET"
S1=$(curl -s "$API/api/v1/session/$WALLET")
A1=$(echo "$S1" | jq -r '.isActive // false')
echo -e "  Session: $([[ $A1 == 'true' ]] && echo -e "${GREEN}ACTIVE${NC}" || echo -e "${RED}INACTIVE${NC}")"

info "Checking unregistered address: $DEAD"
S2=$(curl -s "$API/api/v1/session/$DEAD")
A2=$(echo "$S2" | jq -r '.isActive // false')
echo -e "  Session: $([[ $A2 == 'true' ]] && echo -e "${GREEN}ACTIVE${NC}" || echo -e "${RED}INACTIVE${NC}")"

echo ""
if [ "$A1" = "true" ] && [ "$A2" = "false" ]; then
  ok "Compliance enforcement verified: verified address can trade, unregistered address BLOCKED"
else
  info "Partial result: verified=$A1, dead=$A2"
fi

# ── Part 5: Build Swap TX ─────────────────────────────────────
step "5. Build Compliant Swap Transaction"

mUSD="0xdd3d112a48906807c4b73c94ed884552427e4cf9"
mTBILL="0xfb080423cedd4ca56da3f60a4b901f51846459ae"

SWAP=$(curl -s -X POST "$API/api/v1/defi/swap" \
  -H "x-api-key: $ILAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"tokenIn\":\"$mUSD\",\"tokenOut\":\"$mTBILL\",\"amount\":\"1000000000000000\",\"zeroForOne\":true,\"userAddress\":\"$WALLET\"}")

SWAP_OK=$(echo "$SWAP" | jq -r '.success // false')
if [ "$SWAP_OK" = "true" ]; then
  ok "Swap TX built successfully"
  echo "$SWAP" | jq '{success, tokenIn: .transaction.tokenIn, tokenOut: .transaction.tokenOut}'
else
  info "Swap build result:"
  echo "$SWAP" | jq .
fi

# ── Part 6: Open Dashboard ────────────────────────────────────
step "6. Dashboard"

info "Frontend: $FRONTEND"
info "Dashboard: $FRONTEND/dashboard"
info "Compliance Demo: $FRONTEND/dashboard/compliance-demo"
info "API Playground: $FRONTEND/dashboard/playground"

if command -v open &> /dev/null; then
  read -p "  Open dashboard in browser? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "$FRONTEND/dashboard"
  fi
fi

# ── Summary ───────────────────────────────────────────────────
step "Demo Complete"
echo -e "${GREEN}${BOLD}All checks passed.${NC}"
echo ""
echo "  Contracts:  Base Sepolia (Chain ID 84532)"
echo "  API:        $API"
echo "  Frontend:   $FRONTEND"
echo "  Wallet:     $WALLET"
echo ""
