/**
 * E2E Test: Gantt Chart Timeline View
 * R8 — Project Timeline Visualization
 *
 * TDD STUB — tests are skipped until R8 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R8):
 * - Gantt tab/view accessible from board or team screen
 * - Tasks shown as horizontal bars across time axis
 * - Drag bar edges to adjust task duration
 * - Today marker visible
 * - Web: full-width gantt chart (W2 layout)
 */

import { test, expect } from '@playwright/test'

test.describe('R8 — Gantt Chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/board')
  })

  test.skip('gantt view tab is accessible from board', async ({ page }) => {
    const ganttTab = page.getByRole('tab', { name: /gantt|timeline/i })
    await expect(ganttTab).toBeVisible()
    await ganttTab.click()
    await expect(page.getByTestId('gantt-chart')).toBeVisible()
  })

  test.skip('gantt displays task bars on time axis', async ({ page }) => {
    await page.getByRole('tab', { name: /gantt|timeline/i }).click()

    const chart = page.getByTestId('gantt-chart')
    await expect(chart).toBeVisible()
    const taskBars = chart.getByTestId('gantt-bar')
    await expect(taskBars.first()).toBeVisible()
  })

  test.skip('today marker is visible and positioned correctly', async ({ page }) => {
    await page.getByRole('tab', { name: /gantt|timeline/i }).click()

    const todayMarker = page.getByTestId('gantt-today-marker')
    await expect(todayMarker).toBeVisible()
  })

  test.skip('web: gantt renders full-width at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.getByRole('tab', { name: /gantt|timeline/i }).click()

    const chart = page.getByTestId('gantt-chart')
    const box = await chart.boundingBox()
    expect(box?.width).toBeGreaterThan(1000)
  })

  test.skip('clicking a task bar opens task detail panel', async ({ page }) => {
    await page.getByRole('tab', { name: /gantt|timeline/i }).click()

    const bar = page.getByTestId('gantt-bar').first()
    await bar.click()

    await expect(page.getByTestId('task-detail-panel')).toBeVisible()
  })
})
