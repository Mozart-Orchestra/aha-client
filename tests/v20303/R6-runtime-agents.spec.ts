/**
 * E2E Test: Runtime Agent Management
 * R6 — Add/Remove/Pause Agents Without Rebuilding Team
 *
 * TDD STUB — tests are skipped until R6 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R6):
 * - "+" button opens AddAgentModal with role selector
 * - Adding agent shows it in team member list within 3 seconds
 * - Pause/resume agent without stopping the team
 * - Remove agent with confirmation dialog
 * - Web: dialog overlay on W1/W2 at ≥768px
 */

import { test, expect } from '@playwright/test'

test.describe('R6 — Runtime Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/team')
  })

  test.skip('team screen shows "+" button to add agent', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add agent|\+/i })
    await expect(addBtn).toBeVisible()
  })

  test.skip('add agent modal shows role selector', async ({ page }) => {
    await page.getByRole('button', { name: /add agent|\+/i }).click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(modal.getByText(/role|agent type/i)).toBeVisible()
  })

  test.skip('added agent appears in team list within 3 seconds', async ({ page }) => {
    await page.getByRole('button', { name: /add agent|\+/i }).click()

    // Select a role
    await page.getByTestId('role-selector').selectOption('builder')
    await page.getByRole('button', { name: /add|confirm/i }).click()

    // New agent should appear in team list
    await expect(page.getByTestId('agent-builder')).toBeVisible({ timeout: 3000 })
  })

  test.skip('pause agent changes status to paused without removing', async ({ page }) => {
    const agent = page.getByTestId('agent-card').first()
    await agent.getByRole('button', { name: /pause/i }).click()

    await expect(agent).toHaveAttribute('data-status', 'paused')
    // Agent still in list
    await expect(agent).toBeVisible()
  })

  test.skip('resume paused agent returns it to active status', async ({ page }) => {
    const agent = page.getByTestId('agent-card').first()
    await agent.getByRole('button', { name: /pause/i }).click()
    await agent.getByRole('button', { name: /resume/i }).click()

    await expect(agent).toHaveAttribute('data-status', 'active')
  })

  test.skip('remove agent shows confirmation dialog', async ({ page }) => {
    const agent = page.getByTestId('agent-card').first()
    await agent.getByRole('button', { name: /remove|delete/i }).click()

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/confirm|are you sure/i)).toBeVisible()
  })

  test.skip('confirming remove deletes agent from list', async ({ page }) => {
    const agentCount = await page.getByTestId('agent-card').count()
    const agent = page.getByTestId('agent-card').first()

    await agent.getByRole('button', { name: /remove|delete/i }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: /confirm|yes/i }).click()

    await expect(page.getByTestId('agent-card')).toHaveCount(agentCount - 1)
  })

  test.skip('web: add agent dialog is modal overlay at ≥768px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.getByRole('button', { name: /add agent|\+/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // Main layout still visible behind modal
    await expect(page.getByTestId('main-layout')).toBeVisible()
  })
})
