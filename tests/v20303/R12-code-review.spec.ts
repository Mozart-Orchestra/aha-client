/**
 * E2E Test: Code Review Gateway
 * R12 — One-Click PR Review from Chat
 *
 * TDD STUB — tests are skipped until R12 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R12):
 * - "Review PR" button visible in chat interface
 * - Clicking triggers agent PR fetch + analysis
 * - Review results appear inline in chat (within 30s)
 * - Inline comments shown with file + line references
 * - Web: "Review PR" button in W1 chat layout
 */

import { test, expect } from '@playwright/test'

test.describe('R12 — Code Review Gateway', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
  })

  test.skip('"Review PR" button is visible in chat interface', async ({ page }) => {
    const reviewBtn = page.getByRole('button', { name: /review pr/i })
    await expect(reviewBtn).toBeVisible()
  })

  test.skip('clicking "Review PR" triggers agent analysis', async ({ page }) => {
    await page.getByRole('button', { name: /review pr/i }).click()

    // Should show loading/processing state
    const loadingIndicator = page.getByTestId('review-loading')
    await expect(loadingIndicator).toBeVisible()
  })

  test.skip('review results appear in chat within 30 seconds', async ({ page }) => {
    await page.getByRole('button', { name: /review pr/i }).click()

    // Review results should appear as a chat message
    const reviewMessage = page.getByTestId('review-result-message')
    await expect(reviewMessage).toBeVisible({ timeout: 30000 })
  })

  test.skip('review message includes file and line references', async ({ page }) => {
    await page.getByRole('button', { name: /review pr/i }).click()

    const reviewMessage = page.getByTestId('review-result-message')
    await expect(reviewMessage).toBeVisible({ timeout: 30000 })

    // Should show file references
    const fileRef = reviewMessage.getByTestId('file-reference')
    await expect(fileRef.first()).toBeVisible()
  })

  test.skip('web: Review PR button visible in W1 chat layout at ≥768px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/chat')

    const reviewBtn = page.getByRole('button', { name: /review pr/i })
    await expect(reviewBtn).toBeVisible()
  })

  test.skip('review result shows summary before detailed comments', async ({ page }) => {
    await page.getByRole('button', { name: /review pr/i }).click()

    const reviewMessage = page.getByTestId('review-result-message')
    await expect(reviewMessage).toBeVisible({ timeout: 30000 })

    // Summary first, then details
    const summary = reviewMessage.getByTestId('review-summary')
    await expect(summary).toBeVisible()
  })
})
