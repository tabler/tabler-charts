import { expect, test } from '@playwright/test'

/**
 * Synced hover on the playground's demo (three charts in one `sync` group):
 * the pointer over one chart shows the same day highlighted, with its
 * tooltip, in all three; leaving clears them all.
 */
test('the pointer over one chart highlights the same day in the others', async ({ page }) => {
  await page.goto('/#sync')
  const charts = page.locator('#sync svg.tc-chart')
  await expect(charts).toHaveCount(3)
  const second = await charts.nth(1).boundingBox()
  if (!second) throw new Error('no chart')
  // Over Thursday of the bar chart (the 4th of 7 bands).
  await page.mouse.move(second.x + second.width * 0.56, second.y + second.height * 0.6)
  const tips = page.locator('#sync .tc-tooltip[data-visible] .tc-tooltip-title')
  await expect(tips).toHaveCount(3)
  const titles = await tips.allTextContents()
  expect(new Set(titles).size, titles.join()).toBe(1)
  await page.mouse.move(5, 5)
  await expect(page.locator('#sync .tc-tooltip[data-visible]')).toHaveCount(0)
})
