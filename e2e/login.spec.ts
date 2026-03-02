/**
 * E2E Test: Login Flow
 * R1 - Zero Config Start / Smart Login
 */

import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login options', async ({ page }) => {
    // Check for QR code login option
    await expect(page.getByText(/QR/i)).toBeVisible()

    // Check for magic link option
    await expect(page.getByText(/Magic Link/i)).toBeVisible()

    // Check for device code fallback
    await expect(page.getByText(/Device Code/i)).toBeVisible()
  })

  test('should show install instructions above login buttons', async ({ page }) => {
    // S1 Login screen should have install steps visible
    const installSection = page.getByTestId('install-instructions')
    await expect(installSection).toBeVisible()
  })

  test('should support QR code login flow', async ({ page }) => {
    // Click QR login option
    await page.getByText(/QR/i).click()

    // QR code should be displayed
    const qrCode = page.getByTestId('qr-code')
    await expect(qrCode).toBeVisible()

    // Should show "Scan with mobile app" instruction
    await expect(page.getByText(/Scan with mobile app/i)).toBeVisible()
  })
})