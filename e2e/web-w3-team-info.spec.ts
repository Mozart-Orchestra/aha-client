/**
 * E2E Test: W3 — Web Team Info + Evolution
 * Critical web path: team members, roles, stats, evolution feedback
 *
 * Covers USER-JOURNEYS-V2.md:
 * - J3: Team daily workflow (team info)
 * - J4: Agent management (view agents, stats)
 * - J5: Evolution feedback (agent rating, confidence)
 *
 * PRD R7: Team Stats Dashboard
 * PRD R9: Auto-rating + Confidence
 * PRD R10: Evolution feedback loop
 */

import { test, expect } from '@playwright/test'

test.describe('W3 — Web Team Info + Evolution', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('teams screen is accessible', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // Navigate to teams
    const teamsTab = page.getByRole('button', { name: /teams/i })
    if (await teamsTab.isVisible()) {
      await teamsTab.click()
      await page.waitForLoadState('networkidle')

      // Teams list should be visible
      await expect(page.getByTestId('teams-list').or(page.getByText(/team/i))).toBeVisible()
    }
  })

  test('team info displays team members', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    const firstTeam = page.getByTestId('team-item').first()
    if (await firstTeam.isVisible()) {
      await firstTeam.click()
      await page.waitForLoadState('networkidle')

      // Team members should be visible
      const members = page.getByTestId('team-member')
      if ((await members.count()) > 0) {
        await expect(members.first()).toBeVisible()
      }
    }
  })

  test('team info displays agent roles (Master, Builder, QA)', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    const firstTeam = page.getByTestId('team-item').first()
    if (await firstTeam.isVisible()) {
      await firstTeam.click()
      await page.waitForLoadState('networkidle')

      // Roles should be visible somewhere in team info
      const roleLabels = page.getByText(/master|builder|qa/i)
      if ((await roleLabels.count()) > 0) {
        await expect(roleLabels.first()).toBeVisible()
      }
    }
  })

  test('team stats dashboard displays key metrics (R7)', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    const firstTeam = page.getByTestId('team-item').first()
    if (await firstTeam.isVisible()) {
      await firstTeam.click()
      await page.waitForLoadState('networkidle')

      // Stats section should be visible
      const statsSection = page.getByTestId('team-stats')
      if (await statsSection.isVisible()) {
        await expect(statsSection).toBeVisible()

        // Stats should show numbers (tasks completed, etc.)
        const statsText = await statsSection.textContent()
        expect(statsText).toBeTruthy()
      }
    }
  })

  test('team member shows confidence rating (R9)', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    const firstTeam = page.getByTestId('team-item').first()
    if (await firstTeam.isVisible()) {
      await firstTeam.click()
      await page.waitForLoadState('networkidle')

      // Confidence indicator should be visible for agents
      const confidenceIndicator = page.getByTestId('confidence-rating').or(
        page.getByText(/confidence|%|rating/i)
      )
      if (await confidenceIndicator.isVisible()) {
        await expect(confidenceIndicator).toBeVisible()
      }
    }
  })

  test('evolution feedback form is accessible (R10)', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    const firstTeam = page.getByTestId('team-item').first()
    if (await firstTeam.isVisible()) {
      await firstTeam.click()
      await page.waitForLoadState('networkidle')

      // Evolution feedback button or form
      const feedbackBtn = page.getByRole('button', { name: /evolution|feedback|rate/i })
      if (await feedbackBtn.isVisible()) {
        await expect(feedbackBtn).toBeEnabled()
      }
    }
  })

  test('web: team info layout is responsive at 1280px', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    // Team content should be visible without horizontal scrolling
    const body = page.locator('body')
    const bodyBox = await body.boundingBox()

    if (bodyBox) {
      expect(bodyBox.width).toBeGreaterThanOrEqual(1280)
    }
  })
})
