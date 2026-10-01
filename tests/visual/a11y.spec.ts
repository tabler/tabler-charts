import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

/**
 * Accessibility audit (axe-core, WCAG 2.2 AA) of the whole playground: every
 * chart type and adapter, in both themes and with the interactive parts
 * showing (tooltip, visible data table, keyboard focus, a hidden series).
 */

/** Violations on the page, summarized; empty when it passes. */
async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => ({
      target: n.target.join(' '),
      why: n.failureSummary?.split('\n').slice(1, 3).join(' '),
    })),
  }))
}

async function open(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((mode) => localStorage.setItem('tc-docs-theme', mode), theme)
  await page.goto('/')
  await page.locator('#gallery svg.tc-chart').first().waitFor()
  for (const id of ['bootstrap', 'tabler']) {
    await page.frameLocator(`#${id} iframe`).locator('svg.tc-chart').first().waitFor()
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`the playground passes axe, ${theme}`, async ({ page }) => {
    await open(page, theme)
    const report = await audit(page)
    expect(report, JSON.stringify(report, null, 2)).toEqual([])
  })
}

test('interactive states pass axe', async ({ page }) => {
  await open(page, 'light')
  // The bar demo's data table, shown.
  await page.locator('#bar select').filter({ hasText: 'screen readers' }).selectOption('visible')
  await expect(page.locator('#bar .tc-table-wrap:not(.tc-sr-only)')).toBeVisible()
  // A series hidden from the line demo's legend.
  await page.locator('#line .tc-legend-item').first().click()
  // Keyboard focus on a chart, walking the data.
  await page.locator('#area svg.tc-chart').focus()
  await page.keyboard.press('ArrowRight')
  // And a tooltip open on the scatter demo.
  const scatter = page.locator('#scatter svg.tc-chart')
  const box = (await scatter.boundingBox()) as {
    x: number
    y: number
    width: number
    height: number
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const report = await audit(page)
  expect(report, JSON.stringify(report, null, 2)).toEqual([])
})
