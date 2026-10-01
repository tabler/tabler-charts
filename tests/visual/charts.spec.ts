import { expect, type Locator, type Page, test } from '@playwright/test'

type Theme = 'light' | 'dark'

/** Demos with time on their axis read the clock: pin it. */
const NOW = new Date('2026-09-30T12:00:00Z')

/** A name for a screenshot file: lowercase words joined by dashes. */
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Open the playground at `hash`, with seeded random data, a fixed clock and a theme. */
async function open(page: Page, hash: string, theme: Theme = 'light'): Promise<void> {
  await page.clock.setFixedTime(NOW)
  await page.addInitScript((mode) => {
    // The demos draw random data: make it the same on every run.
    let seed = 42
    Math.random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    localStorage.setItem('tc-docs-theme', mode)
  }, theme)
  await page.goto(`/${hash}`)
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
  await settle(page)
}

/** Let resize observers and scheduled renders run (two animation frames). */
async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  )
}

/** Screenshot every element of `locator`, named by `name(index)`, collecting all failures. */
async function shoot(locator: Locator, name: (index: number) => Promise<string>): Promise<void> {
  const count = await locator.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const element = locator.nth(i)
    await element.scrollIntoViewIfNeeded()
    await expect.soft(element).toHaveScreenshot(`${await name(i)}.png`)
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`gallery, ${theme}`, async ({ page }) => {
    await open(page, '#gallery', theme)
    const items = page.locator('#gallery .gallery-item')
    expect(await items.count()).toBeGreaterThan(30)
    await shoot(items, async (i) => {
      const caption = items.nth(i).locator('figcaption strong')
      // Every card has a title, except the row of sparkline tiles.
      const title = (await caption.count()) ? await caption.textContent() : 'sparkline tiles'
      return `gallery-${slug(title ?? '')}-${theme}`
    })
  })
}

test('demos', async ({ page }) => {
  await open(page, '')
  // Demos rendered in iframes (Bootstrap, Tabler) load their own page first.
  for (const id of ['bootstrap', 'tabler']) {
    await page.frameLocator(`#${id} iframe`).locator('svg.tc-chart').first().waitFor()
  }
  await settle(page)
  const demos = page.locator('section.demo:not(#gallery)')
  await shoot(demos, async (i) => `demo-${await demos.nth(i).getAttribute('id')}`)
})

test.describe('interaction', () => {
  test('line: crosshair, active points and tooltip', async ({ page }) => {
    await open(page, '#line')
    const chart = page.locator('#line .demo-chart')
    const svg = chart.locator('svg.tc-chart')
    const box = (await svg.boundingBox()) as { x: number; y: number; width: number; height: number }
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5)
    await settle(page)
    await expect(chart.locator('.tc-tooltip[data-visible]')).toBeVisible()
    await expect(chart).toHaveScreenshot('interaction-line-hover.png')
  })

  test('bar: hovered band and tooltip', async ({ page }) => {
    await open(page, '#bar')
    const chart = page.locator('#bar .demo-chart')
    await chart.locator('.tc-bar').nth(4).hover()
    await settle(page)
    await expect(chart.locator('.tc-tooltip[data-visible]')).toBeVisible()
    await expect(chart).toHaveScreenshot('interaction-bar-hover.png')
  })

  test('donut: slice halo and tooltip', async ({ page }) => {
    await open(page, '#pie')
    const chart = page.locator('#pie .demo-chart')
    await chart.locator('.tc-slice').first().hover()
    await settle(page)
    await expect(chart.locator('.tc-hover-mark')).toBeVisible()
    await expect(chart).toHaveScreenshot('interaction-donut-hover.png')
  })

  test('keyboard focus and navigation', async ({ page }) => {
    await open(page, '#line')
    const chart = page.locator('#line .demo-chart')
    await chart.locator('svg.tc-chart').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')
    await settle(page)
    await expect(chart).toHaveScreenshot('interaction-line-keyboard.png')
  })

  test('legend: a hidden series', async ({ page }) => {
    await open(page, '#line')
    const chart = page.locator('#line .demo-chart')
    await chart.locator('.tc-legend-item').first().click()
    await page.mouse.move(0, 0)
    await settle(page)
    await expect(chart).toHaveScreenshot('interaction-line-legend-hidden.png')
  })
})
