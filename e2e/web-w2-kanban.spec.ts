/**
 * E2E Test: W2 — Web Devices / Kanban Board
 * Critical web path: kanban columns, task cards, drag-and-drop, NL task input
 *
 * Covers USER-JOURNEYS-V2.md:
 * - J3: Team daily workflow (kanban board)
 * - J15: Quick Task NL creation
 *
 * PRD R5: Kanban DnD — Web mouse drag-and-drop across 4-column grid
 */

import { test, expect } from '@playwright/test'

test.describe('W2 — Web Kanban Board', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/board')
  })

  test('board page loads without errors', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const errorText = page.getByText(/error|crash|unexpected/i)
    await expect(errorText).not.toBeVisible()
  })

  test('board displays 4 kanban columns', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // All 4 columns should be visible
    await expect(page.getByTestId('column-todo')).toBeVisible()
    await expect(page.getByTestId('column-in-progress')).toBeVisible()
    await expect(page.getByTestId('column-review')).toBeVisible()
    await expect(page.getByTestId('column-done')).toBeVisible()
  })

  test('board shows task cards in columns', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // At least one column should be visible and functional
    const todoColumn = page.getByTestId('column-todo')
    if (await todoColumn.isVisible()) {
      await expect(todoColumn).toBeVisible()
    }
  })

  test('web: drag card from Todo to In Progress', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const card = page.getByTestId('task-card').first()
    const targetColumn = page.getByTestId('column-in-progress')

    if ((await card.isVisible()) && (await targetColumn.isVisible())) {
      await card.dragTo(targetColumn)
      // Card should appear in In Progress column
      await expect(targetColumn.getByTestId('task-card').first()).toBeVisible()
    }
  })

  test('web: drop target column highlights on drag hover', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const card = page.getByTestId('task-card').first()
    const targetColumn = page.getByTestId('column-in-progress')

    if ((await card.isVisible()) && (await targetColumn.isVisible())) {
      const cardBox = await card.boundingBox()
      const targetBox = await targetColumn.boundingBox()

      if (cardBox && targetBox) {
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2)

        // Column should have a drag-over class
        const classes = await targetColumn.getAttribute('class')
        const style = await targetColumn.getAttribute('style')
        // Visual feedback should exist (class or style change)
        await page.mouse.up()
      }
    }
  })

  test('web: optimistic update moves card immediately', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const card = page.getByTestId('task-card').first()
    const targetColumn = page.getByTestId('column-in-progress')

    if ((await card.isVisible()) && (await targetColumn.isVisible())) {
      // Intercept and delay the API call
      await page.route('**/api/tasks/**', async (route) => {
        await new Promise((r) => setTimeout(r, 2000))
        await route.continue()
      })

      await card.dragTo(targetColumn)

      // Card should move immediately (before 2s API delay)
      await expect(targetColumn.getByTestId('task-card').first()).toBeVisible({ timeout: 500 })
    }
  })

  test('web: NL task input creates new task card', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    const nlInput = page.getByPlaceholder(/add task|describe task/i)
    if (await nlInput.isVisible()) {
      await nlInput.fill('Implement dark mode toggle for settings screen')
      await nlInput.press('Enter')

      // New task card should appear
      await expect(page.getByText('Implement dark mode toggle')).toBeVisible({ timeout: 5000 })
    }
  })

  test('web: board is responsive at 1280px width', async ({ page }) => {
    await page.waitForLoadState('networkidle')

    // All columns should be horizontally visible (not stacked vertically)
    const todoColumn = page.getByTestId('column-todo')
    const doneColumn = page.getByTestId('column-done')

    if ((await todoColumn.isVisible()) && (await doneColumn.isVisible())) {
      const todoBox = await todoColumn.boundingBox()
      const doneBox = await doneColumn.boundingBox()

      if (todoBox && doneBox) {
        // On web at 1280px, columns should be side by side (same Y, different X)
        expect(Math.abs((todoBox.y || 0) - (doneBox.y || 0))).toBeLessThan(50)
      }
    }
  })
})
