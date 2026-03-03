/**
 * E2E Test: [Feature Name]
 * R[X] — [Short Feature Description]
 *
 * TDD STUB — tests are skipped until R[X] is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R[X]):
 * - [Criterion 1]
 * - [Criterion 2]
 * - [Criterion 3]
 * - [Criterion 4]
 * - Web: [Web-specific requirement]
 */

import { test, expect } from '@playwright/test'

test.describe('R[X] — [Feature Name]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/[route]')
  })

  test.skip('[Test case 1]', async ({ page }) => {
    // Arrange

    // Act

    // Assert
    await expect(page.getByTestId('[testid]')).toBeVisible()
  })

  test.skip('[Test case 2: specific behavior]', async ({ page }) => {
    // Test specific functionality
  })

  test.skip('[Test case 3: edge case]', async ({ page }) => {
    // Test edge case or error handling
  })

  test.skip('web: [responsive behavior at ≥1280px]', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    // Assert web-specific layout
  })

  test.skip('mobile: [responsive behavior at <768px]', async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 })

    // Assert mobile-specific layout
  })
})
