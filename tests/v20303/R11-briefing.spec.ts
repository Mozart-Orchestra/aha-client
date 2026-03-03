/**
 * E2E Test: Morning Briefing (Async Session Recovery)
 * R11 — Overnight Summary + Continue Where You Left Off
 *
 * TDD STUB — tests are skipped until R11 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R11):
 * - Briefing accessible from dashboard or sidebar
 * - Shows overnight activity summary (tasks completed, agent actions)
 * - "Continue" button resumes from last state
 * - Web: W1 sidebar badge shows unread briefing count
 * - Mobile: S19 Morning Briefing screen
 */

import { test, expect } from '@playwright/test'

test.describe('R11 — Morning Briefing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.skip('briefing badge/notification appears on dashboard', async ({ page }) => {
    const badge = page.getByTestId('briefing-badge')
    await expect(badge).toBeVisible()
  })

  test.skip('tapping briefing badge opens morning briefing screen', async ({ page }) => {
    await page.getByTestId('briefing-badge').click()

    await expect(page.getByTestId('morning-briefing')).toBeVisible()
  })

  test.skip('briefing shows overnight activity summary', async ({ page }) => {
    await page.goto('/briefing')

    const summary = page.getByTestId('overnight-summary')
    await expect(summary).toBeVisible()
    // Should have some content about what happened
    const text = await summary.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })

  test.skip('"Continue" button resumes session from last state', async ({ page }) => {
    await page.goto('/briefing')

    const continueBtn = page.getByRole('button', { name: /continue/i })
    await expect(continueBtn).toBeVisible()
    await continueBtn.click()

    // Should navigate away from briefing to active workspace
    await expect(page).not.toHaveURL('/briefing')
  })

  test.skip('web: W1 sidebar shows briefing badge with unread count', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const sidebar = page.getByTestId('w1-sidebar')
    await expect(sidebar).toBeVisible()

    const badge = sidebar.getByTestId('briefing-badge')
    await expect(badge).toBeVisible()
  })

  test.skip('web: briefing expands inline in sidebar (not full-page nav)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    await page.getByTestId('briefing-badge').click()

    // On web, briefing expands in sidebar — main content still visible
    await expect(page.getByTestId('main-content')).toBeVisible()
    await expect(page.getByTestId('morning-briefing')).toBeVisible()
  })
})
