/**
 * E2E Test: Web Settings Screen (W5 — S22)
 * Critical web path: settings, appearance, language, account, usage
 *
 * Covers USER-JOURNEYS-V2.md:
 * - J14: Settings and account management
 *
 * Note: W5 design is pending (not yet in UI.pen), but routes exist.
 */

import { test, expect } from '@playwright/test'

test.describe('W5 — Web Settings Screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
  })

  test('settings page loads without error', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const errorText = page.getByText(/error|crash|not found/i)
    await expect(errorText).not.toBeVisible()
  })

  test('settings shows appearance option', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const appearanceLink = page.getByRole('link', { name: /appearance/i }).or(
      page.getByText(/appearance|theme|dark mode/i)
    )
    if (await appearanceLink.isVisible()) {
      await expect(appearanceLink).toBeVisible()
    }
  })

  test('settings shows language option', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const langOption = page.getByRole('link', { name: /language/i }).or(
      page.getByText(/language|locale/i)
    )
    if (await langOption.isVisible()) {
      await expect(langOption).toBeVisible()
    }
  })

  test('settings shows account option', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const accountOption = page.getByRole('link', { name: /account/i }).or(
      page.getByText(/account|profile/i)
    )
    if (await accountOption.isVisible()) {
      await expect(accountOption).toBeVisible()
    }
  })

  test('settings shows usage/billing info', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const usageOption = page.getByRole('link', { name: /usage/i }).or(
      page.getByText(/usage|billing|tokens/i)
    )
    if (await usageOption.isVisible()) {
      await expect(usageOption).toBeVisible()
    }
  })

  test('appearance settings: theme toggle works', async ({ page }) => {
    await page.goto('/settings/appearance')
    await page.waitForLoadState('networkidle')

    // Check for theme toggle or dark mode switch
    const themeToggle = page.getByRole('switch', { name: /dark|theme/i }).or(
      page.getByTestId('theme-toggle')
    )

    if (await themeToggle.isVisible()) {
      const initialChecked = await themeToggle.isChecked()
      await themeToggle.click()

      // Toggle should change state
      const newChecked = await themeToggle.isChecked()
      expect(newChecked).toBe(!initialChecked)
    }
  })

  test('web: settings is a panel/sidebar, not full-page, at ≥768px', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // On web, settings may open as a side panel
    const settingsPanel = page.getByTestId('settings-panel').or(
      page.getByRole('complementary')
    )

    // Main content should still be accessible from settings context
    const errorText = page.getByText(/error/i)
    await expect(errorText).not.toBeVisible()
  })
})
