/**
 * E2E Test: Evolution Feedback Loop
 * R10 — Closed-Loop Agent Improvement (signal → rate → suggest → apply)
 *
 * TDD STUB — tests are skipped until R10 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R10):
 * - Evolution dashboard shows agent improvement suggestions
 * - "Apply All" button with 5-minute undo window
 * - Dual loop: agent-level AND team-level ratings
 * - Confidence scores visible per suggestion
 * - Web: W3 right column layout
 */

import { test, expect } from '@playwright/test'

test.describe('R10 — Evolution Feedback Loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/team/evolution')
  })

  test.skip('evolution dashboard loads with suggestions list', async ({ page }) => {
    const dashboard = page.getByTestId('evolution-dashboard')
    await expect(dashboard).toBeVisible()

    const suggestions = dashboard.getByTestId('evolution-suggestion')
    // At least one suggestion should be shown (or empty state)
    const count = await suggestions.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test.skip('each suggestion shows confidence score', async ({ page }) => {
    const suggestion = page.getByTestId('evolution-suggestion').first()
    await expect(suggestion).toBeVisible()

    const score = suggestion.getByTestId('confidence-score')
    await expect(score).toBeVisible()
    // Score should be a percentage
    const text = await score.textContent()
    expect(text).toMatch(/\d+%/)
  })

  test.skip('"Apply All" button is visible and triggers batch apply', async ({ page }) => {
    const applyAllBtn = page.getByRole('button', { name: /apply all/i })
    await expect(applyAllBtn).toBeVisible()
    await applyAllBtn.click()

    // Should show confirmation or undo option
    const undoBtn = page.getByRole('button', { name: /undo/i })
    await expect(undoBtn).toBeVisible()
  })

  test.skip('undo window shows 5-minute countdown after apply', async ({ page }) => {
    await page.getByRole('button', { name: /apply all/i }).click()

    const countdown = page.getByTestId('undo-countdown')
    await expect(countdown).toBeVisible()
    const text = await countdown.textContent()
    expect(text).toMatch(/5:00|4:\d\d/)
  })

  test.skip('agent-level and team-level tabs both exist', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /agent/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /team/i })).toBeVisible()
  })

  test.skip('web: evolution view in W3 right column at ≥768px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/team')

    const rightColumn = page.getByTestId('w3-right-column')
    await expect(rightColumn).toBeVisible()
    await expect(rightColumn.getByTestId('evolution-dashboard')).toBeVisible()
  })
})
