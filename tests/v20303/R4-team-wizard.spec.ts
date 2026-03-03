/**
 * E2E Test: Team Creation Wizard ("Connect Repository")
 * R4 — One-Click Team Creation (3-step wizard + Quick Start)
 *
 * TDD STUB — tests are skipped until R4 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R4):
 * - Rename "Create Legion" → "Connect Repository" throughout UI
 * - Quick Start: one tap creates default team (1 Master + 1 Builder + 1 QA)
 * - 3-step wizard: Name → Roles → Confirm
 * - Wizard completes within 5 seconds from tap to running agents
 * - Web: modal overlay on W1/W2 at ≥768px breakpoint
 */

import { test, expect } from '@playwright/test'

test.describe('R4 — Team Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.skip('dashboard shows "Connect Repository" not "Create Legion"', async ({ page }) => {
    await expect(page.getByText('Connect Repository')).toBeVisible()
    await expect(page.getByText('Create Legion')).not.toBeVisible()
  })

  test.skip('Quick Start creates default team with one tap', async ({ page }) => {
    const quickStart = page.getByRole('button', { name: /quick start/i })
    await expect(quickStart).toBeVisible()

    await quickStart.click()

    // Should show confirmation that team is created
    await expect(page.getByText(/Master/i)).toBeVisible()
    await expect(page.getByText(/Builder/i)).toBeVisible()
    await expect(page.getByText(/QA/i)).toBeVisible()
  })

  test.skip('wizard step 1: enter repository/team name', async ({ page }) => {
    await page.getByRole('button', { name: /connect repository/i }).click()

    // Step 1: Name
    await expect(page.getByTestId('wizard-step-1')).toBeVisible()
    const nameInput = page.getByPlaceholder(/team name|repository/i)
    await nameInput.fill('My Test Team')
    await page.getByRole('button', { name: /next/i }).click()
    await expect(page.getByTestId('wizard-step-2')).toBeVisible()
  })

  test.skip('wizard step 2: configure roles with smart defaults', async ({ page }) => {
    await page.getByRole('button', { name: /connect repository/i }).click()

    await page.getByPlaceholder(/team name|repository/i).fill('My Test Team')
    await page.getByRole('button', { name: /next/i }).click()

    // Step 2: Roles — should have defaults pre-selected
    await expect(page.getByTestId('wizard-step-2')).toBeVisible()
    await expect(page.getByTestId('role-master')).toBeChecked()
  })

  test.skip('wizard step 3: confirm and deploy within 5 seconds', async ({ page }) => {
    // Navigate through wizard quickly
    await page.getByRole('button', { name: /connect repository/i }).click()
    await page.getByPlaceholder(/team name|repository/i).fill('Speed Test Team')
    await page.getByRole('button', { name: /next/i }).click()
    await page.getByRole('button', { name: /next/i }).click()

    // Step 3: Confirm
    await expect(page.getByTestId('wizard-step-3')).toBeVisible()

    const start = Date.now()
    await page.getByRole('button', { name: /deploy|start/i }).click()

    // Should reach dashboard with agents running in ≤5 seconds
    await expect(page).toHaveURL(/dashboard|board/, { timeout: 5000 })
    expect(Date.now() - start).toBeLessThan(5000)
  })

  test.skip('web: wizard opens as modal overlay at ≥768px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.getByRole('button', { name: /connect repository/i }).click()

    // Should be a modal, not a full-page navigation
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    // Background should still be visible
    await expect(page.getByTestId('main-layout')).toBeVisible()
  })

  test.skip('mobile: wizard uses full-screen flow at <768px', async ({ page }) => {
    await page.setViewportSize({ width: 402, height: 874 })
    await page.getByRole('button', { name: /connect repository/i }).click()

    // Full-screen on mobile (no modal)
    const modal = page.getByRole('dialog')
    await expect(modal).not.toBeVisible()
    await expect(page.getByTestId('wizard-step-1')).toBeVisible()
  })
})
