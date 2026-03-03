/**
 * E2E Test: Kanban Drag-and-Drop
 * R5 — Mobile Gestures + Web Mouse DnD
 *
 * TDD STUB — tests are skipped until R5 is implemented.
 * Implementer: remove `test.skip` and make these pass.
 *
 * Acceptance criteria (from PRD R5):
 * - Long-press (300ms) activates drag on mobile
 * - Swipe gesture changes task status
 * - Visual feedback during drag (card lift + shadow)
 * - Web: mouse drag-and-drop across 4-column grid (W2 layout)
 * - Drop target highlights on hover
 * - Optimistic update — card moves immediately, syncs in background
 */

import { test, expect } from '@playwright/test'

test.describe('R5 — Kanban Drag-and-Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/board')
  })

  test.skip('board displays columns: Todo, In Progress, Review, Done', async ({ page }) => {
    await expect(page.getByTestId('column-todo')).toBeVisible()
    await expect(page.getByTestId('column-in-progress')).toBeVisible()
    await expect(page.getByTestId('column-review')).toBeVisible()
    await expect(page.getByTestId('column-done')).toBeVisible()
  })

  test.skip('web: drag card from Todo to In Progress', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    const card = page.getByTestId('task-card').first()
    const targetColumn = page.getByTestId('column-in-progress')

    await card.dragTo(targetColumn)

    // Card should appear in In Progress column
    await expect(targetColumn.getByTestId('task-card').first()).toBeVisible()
  })

  test.skip('web: drop target column highlights on drag hover', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    const card = page.getByTestId('task-card').first()
    const cardBox = await card.boundingBox()
    const targetColumn = page.getByTestId('column-in-progress')
    const targetBox = await targetColumn.boundingBox()

    if (!cardBox || !targetBox) throw new Error('Elements not found')

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2)

    // Column should highlight
    await expect(targetColumn).toHaveClass(/drag-over|highlighted/)
    await page.mouse.up()
  })

  test.skip('card shows visual lift (elevation/shadow) during drag', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    const card = page.getByTestId('task-card').first()
    const cardBox = await card.boundingBox()
    if (!cardBox) throw new Error('Card not found')

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(cardBox.x + 10, cardBox.y + 10)

    // Card should have dragging class
    await expect(card).toHaveClass(/dragging|lifted/)
    await page.mouse.up()
  })

  test.skip('optimistic update: card moves immediately without waiting for server', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    const card = page.getByTestId('task-card').first()
    const targetColumn = page.getByTestId('column-in-progress')

    // Intercept and delay the API call
    await page.route('**/api/tasks/*', async (route) => {
      await new Promise((r) => setTimeout(r, 2000))
      await route.continue()
    })

    await card.dragTo(targetColumn)

    // Card should move immediately (before 2s API delay)
    await expect(targetColumn.getByTestId('task-card').first()).toBeVisible({ timeout: 500 })
  })

  test.skip('natural language task input: type task description in board', async ({ page }) => {
    const nlInput = page.getByPlaceholder(/add task|describe task/i)
    await expect(nlInput).toBeVisible()

    await nlInput.fill('Implement dark mode toggle for settings screen')
    await nlInput.press('Enter')

    // New task card should appear
    await expect(page.getByText('Implement dark mode toggle')).toBeVisible()
  })
})
