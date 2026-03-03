#!/usr/bin/env bash
# =============================================================================
# setup-dev.sh — Initialize v20303 Development Environment
# =============================================================================
# Run once after cloning or when setting up a new worktree.
# Ensures all dependencies are installed and Playwright browsers ready.
# =============================================================================

set -euo pipefail

KANBAN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$KANBAN_DIR"

echo "Installing dependencies..."
yarn install --frozen-lockfile

echo "Installing Playwright browsers..."
if command -v playwright &> /dev/null; then
  playwright install --with-deps chromium webkit
else
  npx playwright install --with-deps chromium webkit
fi

echo "Running TypeScript check..."
yarn typecheck

echo "Running tests (vitest)..."
yarn test --run

echo "Checking Playwright E2E setup..."
yarn playwright --version

echo "Listing E2E specs..."
yarn playwright test --list 2>/dev/null | head -20

echo ""
echo "✅ Development environment ready!"
echo "   Run: yarn test --run           (unit tests)"
echo "   Run: yarn playwright test      (E2E tests)"
echo "   Run: ./scripts/v20303/validate-rank.sh R4  (validate rank)"