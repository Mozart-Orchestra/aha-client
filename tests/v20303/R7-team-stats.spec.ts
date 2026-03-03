/**
 * E2E Test: Team Stats Dashboard
 * R7 — Team Statistics Aggregation & Visualization
 *
 * TDD STUB — tests are skipped until R7 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R7):
 * - Stats accessible from team screen
 * - Shows: task completion rate, active agents, token usage, cost estimates
 * - Time range filter (7d, 30d, 90d)
 * - Exports to JSON/CSV
 * - Web: full dashboard layout at ≥1280px
 */

import { test, expect } from '@playwright/test'

test.describe('R7 — Team Stats Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/team/stats')
  })

  test.skip('stats page shows key metrics cards', async ({ page }) => {
    await expect(page.getByTestId('stats-tasks-completed')).toBeVisible()
    await expect(page.getByTestId('stats-completion-rate')).toBeVisible()
    await expect(page.getByTestId('stats-active-agents')).toBeVisible()
    await expect(page.getByTestId('stats-token-usage')).toBeVisible()
    await expect(page.getByTestId('stats-estimated-cost')).toBeVisible()
  })

  test.skip('task completion rate shows percentage', async ({ page }) => {
    const rateCard = page.getByTestId('stats-completion-rate')
    await expect(rateCard).toBeVisible()

    const percentage = rateCard.getByText(/\d+%/)
    await expect(percentage).toBeVisible()
  })

  test.skip('time range filter has 7d, 30d, 90d options', async ({ page }) => {
    const filter = page.getByTestId('stats-time-filter')
    await expect(filter).toBeVisible()

    await filter.click()
    await expect(page.getByText('7 days')).toBeVisible()
    await expect(page.getByText('30 days')).toBeVisible()
    await expect(page.getByText('90 days')).toBeVisible()
  })

  test.skip('selecting time range updates stats data', async ({ page }) => {
    const filter = page.getByTestId('stats-time-filter')
    await filter.click()

    const initialText = await page.getByTestId('stats-tasks-completed').textContent()

    await page.getByText('30 days').click()

    // Stats should refresh with new data
    await page.waitForTimeout(500)
    const newText = await page.getByTestId('stats-tasks-completed').textContent()

    // Data might change or stay same, but loading state should complete
    await expect(page.getByTestId('stats-loading')).not.toBeVisible()
  })

  test.skip('token usage shows formatted number', async ({ page }) => {
    const tokenCard = page.getByTestId('stats-token-usage')
    await expect(tokenCard).toBeVisible()

    // Should show number with K/M suffix
    const tokenText = await tokenCard.textContent()
    expect(tokenText).toMatch(/\d+[K|M]?/)
  })

  test.skip('estimated cost shows dollar amount', async ({ page }) => {
    const costCard = page.getByTestId('stats-estimated-cost')
    await expect(costCard).toBeVisible()

    // Should show $X.XX format
    const costText = await costCard.textContent()
    expect(costText).toMatch(/\$[\d,.]+/)
  })

  test.skip('activity chart is visible', async ({ page }) => {
    const chart = page.getByTestId('stats-activity-chart')
    await expect(chart).toBeVisible()
  })

  test.skip('export button opens export options', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export/i })
    await exportBtn.click()

    await expect(page.getByTestId('export-options')).toBeVisible()
    await expect(page.getByText('JSON')).toBeVisible()
    await expect(page.getByText('CSV')).toBeVisible()
  })

  test.skip('export as JSON triggers download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')

    await page.getByRole('button', { name: /export/i }).click()
    await page.getByText('JSON').click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/)
  })

  test.skip('web: stats dashboard uses full width at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    const dashboard = page.getByTestId('stats-dashboard')
    const box = await dashboard.boundingBox()
    expect(box?.width).toBeGreaterThan(1000)
  })

  test.skip('mobile: stats show as stacked cards at <768px', async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 })

    const cards = page.getByTestId(/stats-/)
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)

    // Cards should be stacked (vertical layout)
    const firstCard = cards.first()
    const box = await firstCard.boundingBox()
    expect(box?.width).toBeLessThan(400)
  })

  test.skip('refresh button reloads stats data', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /refresh/i })
    await refreshBtn.click()

    // Should show loading state briefly
    await expect(page.getByTestId('stats-loading')).toBeVisible()
    await expect(page.getByTestId('stats-loading')).not.toBeVisible()
  })
})
