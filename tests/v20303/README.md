# v20303 Test Infrastructure

## Overview

This directory contains the E2E test specifications for v20303, following TDD practices with Playwright.

## Test File Structure

```
tests/v20303/
├── TEMPLATE.spec.ts          # Template for new test files
├── R2-device-code.spec.ts    # Device Code Authentication
├── R4-team-wizard.spec.ts    # Team Creation Wizard
├── R5-kanban-dnd.spec.ts     # Kanban Drag-and-Drop
├── R6-runtime-agents.spec.ts # Runtime Agent Management
├── R7-team-stats.spec.ts     # Team Stats Dashboard
├── R8-gantt.spec.ts          # Gantt Chart
├── R9-auto-rating.spec.ts    # Auto Rating System
├── R10-evolution.spec.ts     # Evolution Feedback Loop
├── R11-briefing.spec.ts      # Morning Briefing
└── R12-code-review.spec.ts   # Code Review Gateway
```

## Three-Worktree Architecture

Tests span three repositories:

1. **kanban-v20303** (this repo) - UI E2E tests with Playwright
2. **happy-server** - API integration tests with Vitest
3. **aha-cli** - CLI feature tests

## Running Tests

### One-Click Validation

```bash
# Validate all ranks
./scripts/v20303/validate-all.sh

# Validate specific rank
./scripts/v20303/validate-rank.sh R5

# Test infrastructure manager
./scripts/v20303/test-infrastructure.sh validate R5
```

### E2E Tests

```bash
# Run all E2E tests
yarn test:e2e

# Run specific spec
yarn playwright test tests/v20303/R5-kanban-dnd.spec.ts

# Run with UI mode
yarn test:e2e:ui
```

### Unit Tests

```bash
# Run all unit tests
yarn test

# Run with coverage
yarn vitest run --coverage
```

## TDD Workflow

1. **Write test first** - Create `test.skip` in spec file
2. **Run test** - Should FAIL (RED)
3. **Implement feature** - Write minimal code to pass
4. **Run test** - Should PASS (GREEN)
5. **Refactor** - Clean up code
6. **Unskip test** - Remove `test.skip` to activate

## Test Naming Conventions

- `test.skip('web: ...')` - Web-specific responsive tests
- `test.skip('mobile: ...')` - Mobile-specific tests
- `data-testid="..."` - Use for element selection

## Acceptance Criteria Format

Each spec file includes acceptance criteria from PRD:

```typescript
/**
 * Acceptance criteria (from PRD R[X]):
 * - [Functional requirement]
 * - [Performance requirement]
 * - [Responsive requirement]
 */
```
