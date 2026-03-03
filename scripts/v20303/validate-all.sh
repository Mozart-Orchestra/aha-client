#!/usr/bin/env bash
# =============================================================================
# validate-all.sh — Run all rank validations for v20303
# =============================================================================
# CI-friendly script that runs all rank validations.
# Exit code 0 = all passed, 1 = any failed
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RANKS=(R0 R1 R2 R4 R5 R6 R7 R8 R9 R10 R11 R12)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
section() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${BLUE}$*${NC}\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

PASSED=0
FAILED=0

for RANK in "${RANKS[@]}"; do
  section "Validating $RANK"

  if "$SCRIPT_DIR/validate-rank.sh" "$RANK"; then
    pass "$RANK validation PASSED"
    ((PASSED++)) || true
  else
    fail "$RANK validation FAILED"
    ((FAILED++)) || true
  fi
done

section "Summary"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [[ $FAILED -gt 0 ]]; then
  fail "Some validations failed"
  exit 1
else
  pass "All validations passed"
  exit 0
fi