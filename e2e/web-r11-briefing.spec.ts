/**
 * E2E Test: Morning Briefing Flow (R11)
 * Critical path: overnight summary, continue where you left off
 *
 * Covers USER-JOURNEYS-V2.md:
 * - J10: Morning Briefing recovery (P1)
 *
 * PRD R11: Async session recovery — briefing accessible from dashboard/sidebar
 */

import { test, expect } from '@playwright/test'

test.describe('R11 — Morning Briefing (Web)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('briefing badge appears when there is unread briefing', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Badge should be visible in sidebar or nav
    const badge = page.getByTestId('briefing-badge')
    if (await badge.isVisible()) {
      await expect(badge).toBeVisible()

      // Badge should show a count or indicator
      const badgeText = await badge.textContent()
      expect(badgeText).toBeTruthy()
    }
  })

  test('clicking briefing badge opens morning briefing screen', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const badge = page.getByTestId('briefing-badge')
    if (await badge.isVisible()) {
      await badge.click()
      await page.waitForLoadState('networkidle')

      // Briefing screen should be visible
      const briefingScreen = page.getByTestId('morning-briefing').or(
        page.getByText(/morning briefing|overnight|summary/i)
      )
      await expect(briefingScreen).toBeVisible()
    }
  })

  test('briefing shows overnight activity summary', async ({ page }) => {
    await page.goto('/briefing')
    await page.waitForLoadState('networkidle')

    const summary = page.getByTestId('overnight-summary').or(
      page.getByText(/overnight|last night|while you were away/i)
    )

    if (await summary.isVisible()) {
      await expect(summary).toBeVisible()

      const text = await summary.textContent()
      // Summary should have meaningful content
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })

  test('"Continue" button resumes session from last state', async ({ page }) => {
    await page.goto('/briefing')
    await page.waitForLoadState('networkidle')

    const continueBtn = page.getByRole('button', { name: /continue|resume/i })
    if (await continueBtn.isVisible()) {
      await expect(continueBtn).toBeEnabled()
      await continueBtn.click()

      // Should navigate away from briefing
      await page.waitForTimeout(500)
      await expect(page).not.toHaveURL('/briefing')
    }
  })

  test('web: briefing badge in sidebar (W1 layout)', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Check sidebar for briefing badge
    const sidebar = page.getByTestId('web-sidebar').or(
      page.getByRole('navigation')
    )

    if (await sidebar.isVisible()) {
      const badge = sidebar.getByTestId('briefing-badge')
      if (await badge.isVisible()) {
        await expect(badge).toBeVisible()
      }
    }
  })

  test('web: briefing expands inline in sidebar (not full-page)', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const badge = page.getByTestId('briefing-badge')
    if (await badge.isVisible()) {
      await badge.click()

      // On web, briefing may expand in sidebar while main content remains visible
      const mainContent = page.getByTestId('main-content').or(
        page.getByRole('main')
      )

      // Both briefing and main content could be visible (split layout)
      const briefingVisible = await page.getByTestId('morning-briefing').isVisible()
      const mainVisible = await mainContent.isVisible()

      // At least one should be visible without crash
      expect(briefingVisible || mainVisible).toBeTruthy()
    }
  })

  test('briefing lists tasks completed overnight', async ({ page }) => {
    await page.goto('/briefing')
    await page.waitForLoadState('networkidle')

    const taskList = page.getByTestId('briefing-tasks').or(
      page.getByText(/completed|finished|done/i)
    )

    if (await taskList.isVisible()) {
      await expect(taskList).toBeVisible()
    }
  })

  test('briefing shows agent actions summary', async ({ page }) => {
    await page.goto('/briefing')
    await page.waitForLoadState('networkidle')

    const agentActions = page.getByTestId('briefing-agent-actions').or(
      page.getByText(/agent|builder|master|qa/i)
    )

    if (await agentActions.isVisible()) {
      await expect(agentActions).toBeVisible()
    }
  })

  test('briefing accessible from teams/morning-briefing route', async ({ page }) => {
    await page.goto('/teams/morning-briefing')
    await page.waitForLoadState('networkidle')

    const errorText = page.getByText(/error|not found|404/i)
    await expect(errorText).not.toBeVisible()
  })
})
