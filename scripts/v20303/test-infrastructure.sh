#!/usr/bin/env bash
# =============================================================================
# test-infrastructure.sh — v20303 Test Infrastructure Manager
# =============================================================================
# One-click test validation across three worktrees
#
# Usage:
#   ./scripts/v20303/test-infrastructure.sh validate [R2|R4|R5|...|all]
#   ./scripts/v20303/test-infrastructure.sh worktree-status
#   ./scripts/v20303/test-infrastructure.sh list-specs
#   ./scripts/v20303/test-infrastructure.sh coverage
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KANBAN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
info() { echo -e "${CYAN}ℹ️  $*${NC}"; }
section() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${BLUE}$*${NC}\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# =============================================================================
# List all E2E specs with their status
# =============================================================================
list_specs() {
  section "E2E Test Specifications (v20303)"

  cd "$KANBAN_DIR"

  local specs=(
    "R2-device-code.spec.ts:Device Code Auth"
    "R4-team-wizard.spec.ts:Team Wizard"
    "R5-kanban-dnd.spec.ts:Kanban DnD"
    "R6-runtime-agents.spec.ts:Runtime Agents"
    "R7-team-stats.spec.ts:Team Stats"
    "R8-gantt.spec.ts:Gantt Chart"
    "R9-auto-rating.spec.ts:Auto Rating"
    "R10-evolution.spec.ts:Evolution Feedback"
    "R11-briefing.spec.ts:Morning Briefing"
    "R12-code-review.spec.ts:Code Review Gateway"
  )

  printf "%-30s %-25s %-10s\n" "Spec File" "Feature" "Status"
  echo "─────────────────────────────────────────────────────────────────────"

  for spec in "${specs[@]}"; do
    local file="${spec%%:*}"
    local name="${spec##*:}"
    local path="tests/v20303/$file"

    if [[ -f "$path" ]]; then
      # Count tests
      local total_tests=$(grep -c "test\." "$path" 2>/dev/null || echo "0")
      local skipped_tests=$(grep -c "test\.skip" "$path" 2>/dev/null || echo "0")

      if [[ "$skipped_tests" -gt 0 && "$skipped_tests" -eq "$total_tests" ]]; then
        printf "%-30s %-25s ${YELLOW}%-10s${NC}\n" "$file" "$name" "PENDING"
      else
        printf "%-30s %-25s ${GREEN}%-10s${NC}\n" "$file" "$name" "ACTIVE"
      fi
    else
      printf "%-30s %-25s ${RED}%-10s${NC}\n" "$file" "$name" "MISSING"
    fi
  done

  echo ""
  info "Total specs: ${#specs[@]}"
}

# =============================================================================
# Validate specific rank or all ranks
# =============================================================================
validate_rank() {
  local rank="${1:-all}"
  section "Validating $rank"
  "$SCRIPT_DIR/validate-rank.sh" "$rank"
}

# =============================================================================
# Check worktree status across three repos
# =============================================================================
worktree_status() {
  section "Three-Worktree Test Status"

  local worktrees=(
    "$KANBAN_DIR:kanban-v20303"
    "${KANBAN_DIR%/*}/aha-cli:aha-cli"
    "${KANBAN_DIR%/*}/happy-server:happy-server"
  )

  for wt in "${worktrees[@]}"; do
    local dir="${wt%%:*}"
    local name="${wt##*:}"

    echo ""
    echo "📁 $name"
    echo "   Path: $dir"

    if [[ -d "$dir" ]]; then
      cd "$dir"

      # Check git status
      if git status --porcelain 2>/dev/null | grep -q .; then
        warn "   Git: Uncommitted changes"
      else
        pass "   Git: Clean"
      fi

      # Check test count
      local test_count=$(find . -path ./node_modules -prune -o -name "*.spec.ts" -print 2>/dev/null | wc -l)
      info "   Tests: $test_count spec files"

      # Check package.json for test scripts
      if [[ -f package.json ]] && grep -q "test" package.json; then
        pass "   Test scripts: Configured"
      else
        warn "   Test scripts: Not found"
      fi
    else
      fail "   Directory not found"
    fi
  done
}

# =============================================================================
# Run test coverage report
# =============================================================================
run_coverage() {
  section "Test Coverage Report"

  cd "$KANBAN_DIR"

  info "Running Vitest coverage..."
  yarn vitest run --coverage 2>/dev/null || warn "Coverage failed - ensure @vitest/coverage-v8 is installed"

  echo ""
  info "Coverage report saved to: ./coverage/"
}

# =============================================================================
# Run E2E tests with specific browser
# =============================================================================
run_e2e() {
  local spec="${1:-}"

  cd "$KANBAN_DIR"

  if [[ -z "$spec" ]]; then
    section "Running All E2E Tests"
    yarn playwright test tests/v20303/
  else
    section "Running E2E: $spec"
    yarn playwright test "tests/v20303/$spec"
  fi
}

# =============================================================================
# Main dispatch
# =============================================================================
main() {
  local cmd="${1:-help}"

  case "$cmd" in
    validate)
      validate_rank "${2:-all}"
      ;;
    list-specs)
      list_specs
      ;;
    worktree-status)
      worktree_status
      ;;
    coverage)
      run_coverage
      ;;
    e2e)
      run_e2e "${2:-}"
      ;;
    help|*)
      cat <<EOF
v20303 Test Infrastructure Manager

Usage:
  $0 validate [RANK|all]    Validate specific rank or all (default: all)
  $0 list-specs              List all E2E specs with status
  $0 worktree-status         Check status across three worktrees
  $0 coverage                Generate test coverage report
  $0 e2e [spec-file]         Run E2E tests (specific or all)
  $0 help                    Show this help

Examples:
  $0 validate R5             # Validate R5 (Kanban DnD)
  $0 validate all            # Validate all ranks
  $0 e2e R5-kanban-dnd.spec.ts  # Run specific E2E spec

Ranks:
  R2  - Device Code Authentication
  R4  - Team Creation Wizard
  R5  - Kanban Drag-and-Drop
  R6  - Runtime Agent Management
  R7  - Team Stats
  R8  - Gantt Chart
  R9  - Auto Rating
  R10 - Evolution Feedback
  R11 - Morning Briefing
  R12 - Code Review Gateway
EOF
      ;;
  esac
}

main "$@"
