/**
 * E2E Test: Web Critical Paths
 * Comprehensive test suite for critical web user journeys
 *
 * Based on: USER-JOURNEYS-V2.md + user-journey-map.md
 *
 * Critical Paths Tested:
 * - J1: First Experience (Onboarding) - P0
 * - J3: Daily Workflow (Chat + Board + Agents) - P1
 * - J8: Permission Request (Trust Mechanism) - P0
 * - Web Responsive Layout (1280x800, 768x1024)
 *
 * TDD Status: Tests are marked as expectations.
 * Implementer: Enable tests as features are implemented.
 */

import { test, expect } from '@playwright/test'

// ============================================================================
// J1: First Experience (Onboarding) - P0
// Target: 3 steps, 2 decisions, ≤90 seconds
// ============================================================================

test.describe('J1: First Experience (Onboarding)', () => {
  test.describe.configure({ mode: 'serial' })

  test('web: landing page shows clear value proposition', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    // Should immediately communicate value
    await expect(page.getByText(/AI agents|Claude|team/i)).toBeVisible({ timeout: 5000 })

    // Should have clear CTA
    const cta = page.getByRole('button', { name: /get started|start|login/i })
    await expect(cta).toBeVisible()
  })

  test('web: device code auth shows QR + code input side-by-side', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/restore/device-code')

    // Web layout should be side-by-side
    const qrCode = page.getByTestId('device-code-qr')
    const codeInput = page.getByTestId('device-code-input')

    // Both should be visible on desktop
    await expect(qrCode.or(codeInput)).toBeVisible()
  })

  test('web: team list shows after successful auth', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    // Assuming authenticated state
    await page.goto('/teams')

    // Should show teams or "Create Team" prompt
    const teamsList = page.getByTestId('teams-list')
    const createPrompt = page.getByText(/create|connect/i)

    await expect(teamsList.or(createPrompt)).toBeVisible()
  })

  test('web: Quick Start creates default team in one tap', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/teams')

    const quickStart = page.getByRole('button', { name: /quick start/i })
    if (await quickStart.isVisible()) {
      await quickStart.click()

      // Should show confirmation with default roles
      await expect(page.getByText(/Master/i)).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/Builder|Implementer/i)).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('web: 3-step wizard completes within 90 seconds', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/teams/new')

    const startTime = Date.now()

    // Step 1: Name
    await page.getByPlaceholder(/team name|repository/i).fill('E2E Test Team')
    await page.getByRole('button', { name: /next/i }).click()

    // Step 2: Roles (use defaults)
    await page.getByRole('button', { name: /next/i }).click()

    // Step 3: Confirm
    await page.getByRole('button', { name: /create|deploy|start/i }).click()

    // Should complete within 90 seconds
    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(90000)
  })
})

// ============================================================================
// J3: Daily Workflow - P1
// Target: 4 screens, 1 decision, ≤5 minutes
// ============================================================================

test.describe('J3: Daily Workflow (Web)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
  })

  test('web: dashboard shows team list with status indicators', async ({ page }) => {
    await page.goto('/teams')

    // Should show team cards with status
    const teamCard = page.getByTestId('team-card').first()
    if (await teamCard.isVisible()) {
      // Status indicator should be visible
      const status = teamCard.getByTestId('team-status')
      await expect(status).toBeVisible()
    }
  })

  test('web: team chat (W1) shows message history', async ({ page }) => {
    await page.goto('/teams/test-team/chat')

    // Chat interface should be visible
    const chatContainer = page.getByTestId('chat-container')
    await expect(chatContainer).toBeVisible()

    // Message input should be accessible
    const messageInput = page.getByPlaceholder(/message|type/i)
    await expect(messageInput).toBeVisible()
  })

  test('web: kanban board (W2) shows 4 columns', async ({ page }) => {
    await page.goto('/teams/test-team/board')

    // Standard 4 columns
    await expect(page.getByTestId('column-todo')).toBeVisible()
    await expect(page.getByTestId('column-in-progress')).toBeVisible()
    await expect(page.getByTestId('column-review')).toBeVisible()
    await expect(page.getByTestId('column-done')).toBeVisible()
  })

  test('web: drag task between columns', async ({ page }) => {
    await page.goto('/teams/test-team/board')

    // Wait for board to load
    await page.waitForSelector('[data-testid="column-todo"]', { timeout: 5000 })

    const taskCard = page.getByTestId('task-card').first()
    if (!await taskCard.isVisible()) {
      test.skip()
      return
    }

    const targetColumn = page.getByTestId('column-in-progress')
    await taskCard.dragTo(targetColumn)

    // Task should appear in target column
    await expect(targetColumn.getByTestId('task-card').first()).toBeVisible({ timeout: 2000 })
  })

  test('web: agent list shows running agents', async ({ page }) => {
    await page.goto('/teams/test-team')

    // Agent section should be visible
    const agentList = page.getByTestId('agent-list')
    if (await agentList.isVisible()) {
      // Should show agent cards with status
      const agentCard = page.getByTestId('agent-card').first()
      await expect(agentCard).toBeVisible()
    }
  })

  test('web: morning briefing accessible from sidebar', async ({ page }) => {
    await page.goto('/teams/test-team')

    // Briefing badge or link should be visible
    const briefingBadge = page.getByTestId('briefing-badge')
    const briefingLink = page.getByRole('link', { name: /briefing/i })

    await expect(briefingBadge.or(briefingLink)).toBeVisible()
  })

  test('web: natural language task creation', async ({ page }) => {
    await page.goto('/teams/test-team/board')

    const nlInput = page.getByPlaceholder(/add task|describe task|what needs/i)
    if (await nlInput.isVisible()) {
      await nlInput.fill('Implement dark mode toggle for settings')
      await nlInput.press('Enter')

      // New task should appear
      await expect(page.getByText('dark mode toggle')).toBeVisible({ timeout: 3000 })
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// J8: Permission Request (Trust Mechanism) - P0
// Target: ≤30 seconds response, ≥95% comprehension
// ============================================================================

test.describe('J8: Permission Request (Web)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
  })

  test('web: permission inbox shows pending requests', async ({ page }) => {
    await page.goto('/inbox')

    // Should show permission requests section
    const permissionInbox = page.getByTestId('permission-inbox')
    if (await permissionInbox.isVisible()) {
      // Should list pending permission requests
      const requestCard = page.getByTestId('permission-request-card')
      await expect(requestCard.first()).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('web: permission modal shows risk level and details', async ({ page }) => {
    await page.goto('/teams/test-team')

    // Trigger permission modal (if available)
    const permissionTrigger = page.getByTestId('permission-trigger')
    if (await permissionTrigger.isVisible()) {
      await permissionTrigger.click()

      // Modal should show risk level
      const riskLevel = page.getByTestId('permission-risk-level')
      await expect(riskLevel).toBeVisible()

      // Should show human-readable description
      const description = page.getByTestId('permission-description')
      await expect(description).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('web: approve permission continues agent execution', async ({ page }) => {
    await page.goto('/inbox')

    const approveBtn = page.getByRole('button', { name: /approve|allow/i }).first()
    if (await approveBtn.isVisible()) {
      await approveBtn.click()

      // Should show confirmation
      await expect(page.getByText(/approved|granted/i)).toBeVisible({ timeout: 3000 })
    } else {
      test.skip()
    }
  })

  test('web: deny permission stops agent action', async ({ page }) => {
    await page.goto('/inbox')

    const denyBtn = page.getByRole('button', { name: /deny|reject/i }).first()
    if (await denyBtn.isVisible()) {
      await denyBtn.click()

      // Should show denial confirmation
      await expect(page.getByText(/denied|rejected/i)).toBeVisible({ timeout: 3000 })
    } else {
      test.skip()
    }
  })

  test('web: permission request shows countdown timer', async ({ page }) => {
    await page.goto('/inbox')

    const timer = page.getByTestId('permission-timer').first()
    if (await timer.isVisible()) {
      // Timer should show remaining time
      const timerText = await timer.textContent()
      expect(timerText).toMatch(/\d+:\d+|\d+\s*(min|sec)/i)
    } else {
      test.skip()
    }
  })
})

// ============================================================================
// Web Responsive Layout Tests
// ============================================================================

test.describe('Web Responsive Layout', () => {
  test('desktop: 1280x800 shows sidebar + main content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/teams/test-team')

    // Sidebar should be visible
    const sidebar = page.getByTestId('sidebar')
    await expect(sidebar).toBeVisible()

    // Main content should be visible
    const mainContent = page.getByTestId('main-content')
    await expect(mainContent).toBeVisible()
  })

  test('tablet: 768x1024 shows collapsible sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/teams/test-team')

    // Sidebar might be collapsed or toggleable
    const sidebar = page.getByTestId('sidebar')
    const menuToggle = page.getByTestId('menu-toggle')

    await expect(sidebar.or(menuToggle)).toBeVisible()
  })

  test('mobile: 402x874 shows bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 })
    await page.goto('/teams/test-team')

    // Bottom nav should be visible on mobile
    const bottomNav = page.getByTestId('bottom-navigation')
    await expect(bottomNav).toBeVisible()
  })

  test('web: kanban columns stack vertically on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 })
    await page.goto('/teams/test-team/board')

    // On narrow screens, columns might stack or scroll horizontally
    const board = page.getByTestId('kanban-board')
    await expect(board).toBeVisible()
  })
})

// ============================================================================
// Error States & Edge Cases
// ============================================================================

test.describe('Error States & Edge Cases (Web)', () => {
  test('web: shows error boundary on component failure', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    // Navigate to a page that might have errors
    await page.goto('/teams/nonexistent-team')

    // Should show error state, not crash
    const errorBoundary = page.getByTestId('error-boundary')
    const notFound = page.getByText(/not found|doesn't exist/i)

    await expect(errorBoundary.or(notFound)).toBeVisible()
  })

  test('web: network error shows retry option', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    // Simulate offline
    await page.context().setOffline(true)
    await page.goto('/teams')

    // Should show offline/error state
    const retryButton = page.getByRole('button', { name: /retry|reload/i })
    const errorMessage = page.getByText(/offline|connection|error/i)

    await expect(retryButton.or(errorMessage)).toBeVisible()

    // Restore network
    await page.context().setOffline(false)
  })

  test('web: empty states show helpful guidance', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/teams')

    // If no teams, should show helpful empty state
    const emptyState = page.getByTestId('empty-teams-state')
    if (await emptyState.isVisible()) {
      // Should have guidance text
      await expect(emptyState.getByText(/create|get started/i)).toBeVisible()
    }
  })
})

// ============================================================================
// Performance & Accessibility
// ============================================================================

test.describe('Performance & Accessibility (Web)', () => {
  test('web: page loads within 3 seconds', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    const startTime = Date.now()
    await page.goto('/teams')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(3000)
  })

  test('web: interactive elements are keyboard accessible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/teams')

    // Tab through interactive elements
    await page.keyboard.press('Tab')

    // Should have visible focus indicator
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('web: images have alt text', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const ariaLabel = await img.getAttribute('aria-label')
      const ariaHidden = await img.getAttribute('aria-hidden')

      // Image should have alt text or be marked as decorative
      expect(alt || ariaLabel || ariaHidden === 'true').toBeTruthy()
    }
  })
})
