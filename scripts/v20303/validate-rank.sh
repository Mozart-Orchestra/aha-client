#!/usr/bin/env bash
# =============================================================================
# validate-rank.sh — v20303 Rank Validation Gate
# =============================================================================
# Usage:
#   ./scripts/v20303/validate-rank.sh R0      # Validate R0 (infrastructure)
#   ./scripts/v20303/validate-rank.sh R4      # Validate R4 (team wizard)
#   ./scripts/v20303/validate-rank.sh all     # Validate all ranks (CI mode)
#
# Each rank runs: TypeScript check → unit tests → E2E spec → git sanity
# Exit code 0 = passed, 1 = failed (blocks merge)
# =============================================================================

set -euo pipefail

KANBAN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RANK="${1:-}"
PASS=0
FAIL=1

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; exit $FAIL; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
section() { echo -e "\n${YELLOW}━━━ $* ━━━${NC}"; }

if [[ -z "$RANK" ]]; then
  echo "Usage: $0 <RANK|all>"
  echo "  Ranks: R0 R1 R2 R4 R5 R6 R7 R8 R9 R10 R11 R12"
  exit 1
fi

cd "$KANBAN_DIR"

# =============================================================================
validate_R0() {
  section "R0: Infrastructure Validation"

  echo "Checking git state..."
  git status || fail "git status failed — worktree broken"
  git log --oneline -3 || fail "git log failed"
  pass "Git state OK"

  echo "Running unit tests..."
  yarn test --run || fail "Unit tests failed"
  pass "Unit tests passed (even if 0 tests)"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"
  pass "TypeScript OK"

  echo "Playwright spec listing..."
  yarn playwright test --list 2>/dev/null | grep -c "spec" || warn "No E2E specs found yet (OK for R0)"
  pass "R0 validation PASSED"
}

validate_R1() {
  section "R1: Daemon Auto-Start Validation"
  warn "R1 lives in aha-cli repo — run: cd ../aha-cli && yarn test tests/v20303/R1/"
  warn "Kanban: check daemon status indicator renders in web sidebar"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"
  pass "R1 kanban TypeScript OK"
}

validate_R2() {
  section "R2: Device Code Auth Validation"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"

  echo "Running R2 E2E tests..."
  yarn playwright test tests/v20303/R2-device-code.spec.ts || fail "R2 E2E tests failed"
  pass "R2 validation PASSED"
}

validate_R4() {
  section "R4: Team Creation Wizard Validation"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"

  echo "Running R4 unit tests..."
  if compgen -G "tests/v20303/R4/*.test.ts" > /dev/null 2>&1; then
    yarn test --run tests/v20303/R4/ || fail "R4 unit tests failed"
  else
    warn "No R4 unit tests yet — implementer should add them"
  fi

  echo "Running R4 E2E tests..."
  yarn playwright test tests/v20303/R4-team-wizard.spec.ts || fail "R4 E2E tests failed"
  pass "R4 validation PASSED"
}

validate_R5() {
  section "R5: Kanban DnD Validation"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"

  echo "Running R5 E2E tests..."
  yarn playwright test tests/v20303/R5-kanban-dnd.spec.ts || fail "R5 E2E tests failed"
  pass "R5 validation PASSED"
}

validate_R6() {
  section "R6: Runtime Agent Management Validation"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"

  echo "Running R6 E2E tests..."
  yarn playwright test tests/v20303/R6-runtime-agents.spec.ts || fail "R6 E2E tests failed"
  pass "R6 validation PASSED"
}

validate_R7() {
  section "R7: Team Stats Validation"
  warn "R7 lives in happy-server repo — run: cd ../happy-server && yarn test tests/v20303/R7/"
  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"
  pass "R7 kanban TypeScript OK"
}

validate_R8() {
  section "R8: Gantt Chart Validation"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"

  echo "Running R8 E2E tests..."
  yarn playwright test tests/v20303/R8-gantt.spec.ts || fail "R8 E2E tests failed"
  pass "R8 validation PASSED"
}

validate_R9() {
  section "R9: Auto-Rating Validation"
  warn "R9 core lives in happy-server + aha-cli — run server/cli tests first"
  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"
  pass "R9 kanban TypeScript OK"
}

validate_R10() {
  section "R10: Evolution Feedback Loop Validation"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"

  echo "Running R10 E2E tests..."
  yarn playwright test tests/v20303/R10-evolution.spec.ts || fail "R10 E2E tests failed"
  pass "R10 validation PASSED"
}

validate_R11() {
  section "R11: Morning Briefing Validation"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"

  echo "Running R11 E2E tests..."
  yarn playwright test tests/v20303/R11-briefing.spec.ts || fail "R11 E2E tests failed"
  pass "R11 validation PASSED"
}

validate_R12() {
  section "R12: Code Review Gateway Validation"

  echo "TypeScript check..."
  yarn typecheck || fail "TypeScript errors found"

  echo "Running R12 E2E tests..."
  yarn playwright test tests/v20303/R12-code-review.spec.ts || fail "R12 E2E tests failed"
  pass "R12 validation PASSED"
}

validate_all() {
  section "FULL SUITE: All Ranks"
  validate_R0
  validate_R1
  validate_R2
  validate_R4
  validate_R5
  validate_R6
  validate_R7
  validate_R8
  validate_R9
  validate_R10
  validate_R11
  validate_R12
  pass "ALL RANKS PASSED"
}

# =============================================================================
# Dispatch
# =============================================================================
case "$RANK" in
  R0) validate_R0 ;;
  R1) validate_R1 ;;
  R2) validate_R2 ;;
  R4) validate_R4 ;;
  R5) validate_R5 ;;
  R6) validate_R6 ;;
  R7) validate_R7 ;;
  R8) validate_R8 ;;
  R9) validate_R9 ;;
  R10) validate_R10 ;;
  R11) validate_R11 ;;
  R12) validate_R12 ;;
  all) validate_all ;;
  *)
    echo "Unknown rank: $RANK"
    echo "Valid ranks: R0 R1 R2 R4 R5 R6 R7 R8 R9 R10 R11 R12 all"
    exit 1
    ;;
esac
