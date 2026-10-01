import { devices, expect, type Locator, type Page, test } from '@playwright/test'

/**
 * The playground on a phone: 375 px wide, touch. Narrow charts are where
 * labels collide, legends wrap and axes thin out, so every gallery chart is
 * checked at this width, plus a tap that opens a tooltip.
 */
test.use({ ...devices['Pixel 7'], viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 })

const NOW = new Date('2026-09-30T12:00:00Z')

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

async function open(page: Page, hash: string): Promise<void> {
  await page.clock.setFixedTime(NOW)
  await page.addInitScript(() => {
    let seed = 42
    Math.random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const w = window as unknown as { __tcSeed: (id: string) => void }
    w.__tcSeed = (id) => {
      seed = 1
      for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) % 2147483646
      seed += 1
    }
    localStorage.setItem('tc-docs-theme', 'light')
  })
  await page.goto(`/${hash}`)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  )
}

async function shoot(locator: Locator, name: (i: number) => Promise<string>): Promise<void> {
  const count = await locator.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await locator.nth(i).scrollIntoViewIfNeeded()
    await expect.soft(locator.nth(i)).toHaveScreenshot(`${await name(i)}.png`)
  }
}

test('gallery on a phone', async ({ page }) => {
  await open(page, '#gallery')
  const items = page.locator('#gallery .gallery-item')
  const charts = page.locator('#gallery figure.gallery-item > div, #gallery .gallery-item.tiles')
  await shoot(charts, async (i) => {
    const caption = items.nth(i).locator('figcaption strong')
    const title = (await caption.count()) ? await caption.textContent() : 'sparkline tiles'
    return `mobile-gallery-${slug(title ?? '')}`
  })
})

test('a tap opens the tooltip', async ({ page }) => {
  await open(page, '#bar')
  const chart = page.locator('#bar .demo-chart')
  await chart.locator('.tc-bar').nth(3).tap()
  await expect(chart.locator('.tc-tooltip[data-visible]')).toBeVisible()
  await expect(chart).toHaveScreenshot('mobile-bar-tap.png')
})
