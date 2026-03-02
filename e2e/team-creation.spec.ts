/**
 * E2E Test: Team Creation Flow
 * R2 - One-Sentence Team Creation
 */

import { test, expect } from '@playwright/test'

test.describe('Team Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Assume logged in for these tests
  })

  test('should show team creation input on dashboard', async ({ page }) => {
    // One-sentence team creation should be prominent
    const teamInput = page.getByPlaceholder(/Describe your team/i)
    await expect(teamInput).toBeVisible()
  })

  test('should create team from natural language description', async ({ page }) => {
    // Enter natural language team description
    await page.getByPlaceholder(/Describe your team/i).fill(
      'I need a frontend developer and a QA engineer for my React app'
    )

    // Submit
    await page.getByRole('button', { name: /Create Team/i }).click()

    // Should show AI-generated team configuration
    await expect(page.getByText(/Frontend Developer/i)).toBeVisible()
    await expect(page.getByText(/QA Engineer/i)).toBeVisible()
    await expect(page.getByText(/React/i)).toBeVisible()
  })

  test('should show role descriptions during team config', async ({ page }) => {
    // S5 Role Config should have role descriptions visible
    await page.goto('/team/configure')

    const builderRole = page.getByTestId('role-builder')
    await expect(builderRole).toBeVisible()

    // Role description should explain what Builder does
    await expect(builderRole.getByText(/implements features/i)).toBeVisible()
  })

  test('should display cost estimate before deployment', async ({ page }) => {
    // S12 Deploy screen should show cost estimate
    await page.goto('/team/deploy')

    const costSection = page.getByTestId('cost-estimate')
    await expect(costSection).toBeVisible()

    // Should show token/cost breakdown
    await expect(page.getByText(/Cost estimate/i)).toBeVisible()
  })
})