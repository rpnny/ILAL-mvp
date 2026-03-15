#!/bin/bash
#
# ILAL Full-Fidelity Simulation — Master Runner
#
# Usage:
#   ./scripts/simulation/run-simulation.sh [phase]
#
# Phases:
#   all       — Run everything (default)
#   contracts — Foundry tests only (WarTheater + AttackVectors + BattleInvariant)
#   live      — TypeScript live simulation against Base Sepolia
#   war       — WarTheater only (institution lifecycle + extreme + attacks)
#   attack    — AttackVectors only (isolated STRIDE attack vectors)
#   invariant — BattleInvariant only (fuzz-driven invariant tests)
#

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/packages/contracts"
SCRIPTS_DIR="$ROOT_DIR/scripts/simulation"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

phase="${1:-all}"

banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║  ILAL Full-Fidelity Simulation                                  ║${NC}"
  echo -e "${CYAN}║  Institution Lifecycle • Stress • Attack Resilience             ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
  echo "  Phase: $phase"
  echo "  Time:  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo ""
}

run_war_theater() {
  echo -e "${YELLOW}▶ Running WarTheater (institution lifecycle + extreme conditions + attacks)${NC}"
  cd "$CONTRACTS_DIR"
  forge test --match-path "test/simulation/WarTheater.t.sol" -vvv --gas-report 2>&1
  echo -e "${GREEN}✓ WarTheater complete${NC}"
}

run_attack_vectors() {
  echo -e "${YELLOW}▶ Running AttackVectors (20+ STRIDE attack vector tests)${NC}"
  cd "$CONTRACTS_DIR"
  forge test --match-path "test/simulation/AttackVectors.t.sol" -vvv --gas-report 2>&1
  echo -e "${GREEN}✓ AttackVectors complete${NC}"
}

run_battle_invariant() {
  echo -e "${YELLOW}▶ Running BattleInvariant (fuzz-driven invariant tests)${NC}"
  cd "$CONTRACTS_DIR"
  forge test --match-path "test/simulation/BattleInvariant.t.sol" -vvv 2>&1
  echo -e "${GREEN}✓ BattleInvariant complete${NC}"
}

run_live_simulation() {
  echo -e "${YELLOW}▶ Running Live Simulation against Base Sepolia${NC}"
  cd "$ROOT_DIR"
  npx tsx "$SCRIPTS_DIR/index.ts" 2>&1
  echo -e "${GREEN}✓ Live Simulation complete${NC}"
}

banner

case "$phase" in
  all)
    run_war_theater
    echo ""
    run_attack_vectors
    echo ""
    run_battle_invariant
    echo ""
    run_live_simulation
    ;;
  contracts)
    run_war_theater
    echo ""
    run_attack_vectors
    echo ""
    run_battle_invariant
    ;;
  live)
    run_live_simulation
    ;;
  war)
    run_war_theater
    ;;
  attack)
    run_attack_vectors
    ;;
  invariant)
    run_battle_invariant
    ;;
  *)
    echo -e "${RED}Unknown phase: $phase${NC}"
    echo "Valid phases: all, contracts, live, war, attack, invariant"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Simulation complete: $phase${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
