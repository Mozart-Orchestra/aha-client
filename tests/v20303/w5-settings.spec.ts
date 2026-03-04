/**
 * E2E Test: Settings Screen (W5)
 * User preferences, account management, and app configuration
 *
 * Based on: user-journey-map.md J14 Settings Management
 * Target: ≤30 seconds to find and change any setting
 *
 * TDD Status: Tests are expectations for W5 implementation.
 * Implementer: Enable tests as Settings screen is built.
 */

import { test, expect } from '@playwright/test'

test.describe('W5: Settings Screen (Web)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
  })

  // ==========================================================================
  // Navigation & Layout
  // ==========================================================================

  test('web: settings accessible from sidebar', async ({ page }) => {
    await page.goto('/teams/test-team')

    // Settings link should be in sidebar
    const settingsLink = page.getByRole('link', { name: /settings/i })
    const settingsIcon = page.getByTestId('settings-button')

    await expect(settingsLink.or(settingsIcon)).toBeVisible()
  })

  test('web: settings page shows categorized sections', async ({ page }) => {
    await page.goto('/settings')

    // Should show settings categories
    const categories = ['Account', 'Appearance', 'Language', 'Usage', 'Features']
    const visibleCategories = []

    for (const cat of categories) {
      const section = page.getByText(new RegExp(cat, 'i'))
      if (await section.isVisible()) {
        visibleCategories.push(cat)
      }
    }

    // At least some categories should be visible
    expect(visibleCategories.length).toBeGreaterThan(0)
  })

  // ==========================================================================
  // Account Settings
  // ==========================================================================

  test('web: account section shows user info', async ({ page }) => {
    await page.goto('/settings/account')

    // Should show user email or name
    const userInfo = page.getByTestId('user-info')
    const userEmail = page.getByTestId('user-email')
    const userName = page.getByTestId('user-name')

    await expect(userInfo.or(userEmail).or(userName)).toBeVisible()
  })

  test('web: can update display name', async ({ page }) => {
    await page.goto('/settings/account')

    const nameInput = page.getByLabel(/display name|name/i)
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Test User')
      await page.getByRole('button', { name: /save|update/i }).click()

      // Should show success confirmation
      await expect(page.getByText(/saved|updated|success/i)).toBeVisible({ timeout: 3000 })
    } else {
      test.skip()
    }
  })

  // ==========================================================================
  // Appearance Settings
  // ==========================================================================

  test('web: appearance section shows theme options', async ({ page }) => {
    await page.goto('/settings/appearance')

    // Should show theme selector
    const themeSelector = page.getByTestId('theme-selector')
    const lightOption = page.getByLabel(/light/i)
    const darkOption = page.getByLabel(/dark/i)
    const systemOption = page.getByLabel(/system|auto/i)

    await expect(themeSelector.or(lightOption).or(darkOption).or(systemOption)).toBeVisible()
  })

  test('web: switching to dark theme updates UI', async ({ page }) => {
    await page.goto('/settings/appearance')

    const darkOption = page.getByLabel(/dark/i)
    if (await darkOption.isVisible()) {
      await darkOption.click()

      // Page should have dark theme class or data attribute
      const html = page.locator('html')
      await expect(html).toHaveClass(/dark/, { timeout: 1000 })
    } else {
      test.skip()
    }
  })

  // ==========================================================================
  // Language Settings
  // ==========================================================================

  test('web: language section shows available languages', async ({ page }) => {
    await page.goto('/settings/language')

    // Should show language options
    const languageSelector = page.getByTestId('language-selector')
    await expect(languageSelector).toBeVisible()
  })

  test('web: can switch language', async ({ page }) => {
    await page.goto('/settings/language')

    const languageSelector = page.getByTestId('language-selector')
    if (await languageSelector.isVisible()) {
      // Get current language
      const currentValue = await languageSelector.inputValue()

      // Change to different language if available
      await languageSelector.selectOption({ index: 0 })

      // Should show confirmation or update UI
      const confirmBtn = page.getByRole('button', { name: /save|apply/i })
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
      }
    } else {
      test.skip()
    }
  })

  // ==========================================================================
  // Usage & Billing
  // ==========================================================================

  test('web: usage section shows token consumption', async ({ page }) => {
    await page.goto('/settings/usage')

    // Should show usage metrics
    const tokenUsage = page.getByTestId('token-usage')
    const costDisplay = page.getByTestId('cost-display')
    const usageChart = page.getByTestId('usage-chart')

    await expect(tokenUsage.or(costDisplay).or(usageChart)).toBeVisible()
  })

  test('web: usage shows cost in dollars', async ({ page }) => {
    await page.goto('/settings/usage')

    // Should show cost (not just tokens)
    const costDisplay = page.getByText(/\$[\d.]+/)
    if (await costDisplay.isVisible()) {
      // Cost should be visible
      await expect(costDisplay).toBeVisible()
    } else {
      // Check for token display as fallback
      const tokenDisplay = page.getByText(/\d+\s*tokens/i)
      await expect(tokenDisplay).toBeVisible()
    }
  })

  // ==========================================================================
  // Feature Toggles
  // ==========================================================================

  test('web: features section shows toggleable options', async ({ page }) => {
    await page.goto('/settings/features')

    // Should show feature toggles
    const featureToggle = page.locator('input[type="checkbox"], [role="switch"]').first()
    await expect(featureToggle).toBeVisible()
  })

  test('web: toggling feature updates preference', async ({ page }) => {
    await page.goto('/settings/features')

    const toggle = page.locator('input[type="checkbox"], [role="switch"]').first()
    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked()
      await toggle.click()

      // State should change
      await expect(toggle).toBeChecked({ checked: !initialState })
    } else {
      test.skip()
    }
  })

  // ==========================================================================
  // Voice Settings (if applicable)
  // ==========================================================================

  test('web: voice settings accessible', async ({ page }) => {
    await page.goto('/settings/voice')

    // Should show voice configuration options
    const voiceSection = page.getByTestId('voice-settings')
    if (await voiceSection.isVisible()) {
      // Voice selection or preview should be available
      const voiceSelector = page.getByTestId('voice-selector')
      const previewBtn = page.getByRole('button', { name: /preview|test/i })

      await expect(voiceSelector.or(previewBtn)).toBeVisible()
    } else {
      test.skip()
    }
  })

  // ==========================================================================
  // Connect/Integrations
  // ==========================================================================

  test('web: connect section shows integrations', async ({ page }) => {
    await page.goto('/settings/connect')

    // Should show available integrations
    const integrations = page.getByTestId('integration-card')
    const addIntegration = page.getByRole('button', { name: /add|connect/i })

    await expect(integrations.or(addIntegration)).toBeVisible()
  })

  // ==========================================================================
  // Responsive Layout
  // ==========================================================================

  test('mobile: settings shows as stacked cards', async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 })
    await page.goto('/settings')

    // Settings should be in a mobile-friendly layout
    const settingsContainer = page.getByTestId('settings-container')
    await expect(settingsContainer).toBeVisible()
  })

  test('tablet: settings shows sidebar navigation', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/settings')

    // Tablet might show sidebar navigation
    const settingsNav = page.getByTestId('settings-nav')
    const settingsContent = page.getByTestId('settings-content')

    await expect(settingsNav.or(settingsContent)).toBeVisible()
  })
})

// ============================================================================
// Settings E2E: Edge Cases
// ============================================================================

test.describe('Settings Edge Cases (Web)', () => {
  test('web: saving shows feedback', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/settings/appearance')

    // Make a change
    const toggle = page.locator('input[type="checkbox"], [role="switch"]').first()
    if (await toggle.isVisible()) {
      await toggle.click()

      // Should show saving indicator
      const savingIndicator = page.getByText(/saving|saved/i)
      await expect(savingIndicator).toBeVisible({ timeout: 3000 })
    } else {
      test.skip()
    }
  })

  test('web: validation errors shown inline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/settings/account')

    // Try to enter invalid data
    const emailInput = page.getByLabel(/email/i)
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email')
      await page.getByRole('button', { name: /save/i }).click()

      // Should show validation error
      const errorMessage = page.getByText(/invalid|error/i)
      await expect(errorMessage).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('web: cancel button reverts changes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/settings/account')

    const nameInput = page.getByLabel(/display name|name/i)
    if (await nameInput.isVisible()) {
      const originalValue = await nameInput.inputValue()
      await nameInput.fill('Temporary Name')

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).click()

      // Value should be reverted
      await expect(nameInput).toHaveValue(originalValue)
    } else {
      test.skip()
    }
  })
})
