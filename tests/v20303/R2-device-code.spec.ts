/**
 * E2E Test: Device Code Authentication
 * R2 — One-Click Auth (device code + QR + polling)
 *
 * TDD STUB — tests are skipped until R2 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R2):
 * - Server exposes POST/GET /v1/auth/device-code
 * - CLI displays 6-char code + QR code
 * - App has /restore/device-code screen with 6 input boxes
 * - Code expires after 5 minutes
 * - Approved device auto-redirects to dashboard (≤5s)
 */

import { test, expect } from '@playwright/test'

test.describe('R2 — Device Code Authentication', () => {
  test.skip('device code screen shows 6-character code input', async ({ page }) => {
    await page.goto('/restore/device-code')

    // Should show 6 individual input boxes
    const inputs = page.locator('[data-testid^="device-code-digit-"]')
    await expect(inputs).toHaveCount(6)
  })

  test.skip('device code screen shows QR code for mobile scan', async ({ page }) => {
    await page.goto('/restore/device-code')

    const qr = page.getByTestId('device-code-qr')
    await expect(qr).toBeVisible()
  })

  test.skip('entering valid code redirects to dashboard within 5 seconds', async ({ page }) => {
    await page.goto('/restore/device-code')

    // Fill in approved code (mock server must return approved status)
    for (let i = 0; i < 6; i++) {
      await page.getByTestId(`device-code-digit-${i}`).fill('A')
    }

    // Should auto-redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 })
  })

  test.skip('expired code shows error and allows retry', async ({ page }) => {
    await page.goto('/restore/device-code')

    const errorMsg = page.getByTestId('device-code-error')
    // After expiry, error should appear without crashing
    await expect(errorMsg).toBeVisible()
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test.skip('web layout: device code page is responsive at 1280x800', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/restore/device-code')

    // Web layout should show side-by-side: QR left, code input right
    const layout = page.getByTestId('device-code-layout')
    await expect(layout).toBeVisible()
  })
})
