import { expect, type Page, test } from '@playwright/test'
import { installTextChecks } from './text-checks.ts'

/**
 * The examples page (examples.html): about a hundred charts of real data.
 * Every card must render without errors, without NaN or Infinity in the
 * SVG, with every label inside the chart and none on top of another of its
 * kind, with its tooltip in the viewport, and with something drawn.
 * Runs on a desktop in light mode and on a phone in dark mode.
 */

async function findings(page: Page): Promise<string[]> {
  const out: string[] = []
  for (const card of await page.locator('[data-example]').all()) {
    await card.scrollIntoViewIfNeeded()
    // Hover a little right of the middle, to open the tooltip.
    const box = await card.locator('svg.tc-chart').first().boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.45)
      await page.evaluate(() => new Promise(requestAnimationFrame))
    }
    const issues = await card.evaluate((card: HTMLElement) => {
      const found: string[] = []
      if (card.dataset.error) found.push(`throws: ${card.dataset.error}`)
      const svgs = [...card.querySelectorAll('svg.tc-chart')]
      if (!svgs.length) return card.dataset.error ? found : [...found, 'no svg']
      const check = (window as unknown as { __tcTextIssues: (svg: Element) => string[] })
        .__tcTextIssues
      for (const svg of svgs) {
        for (const el of svg.querySelectorAll('*')) {
          for (const name of el.getAttributeNames()) {
            const value = el.getAttribute(name) ?? ''
            if (
              name !== 'aria-label' &&
              name !== 'data-series' &&
              /NaN|Infinity|undefined/.test(value)
            ) {
              found.push(`${el.localName} ${name}="${value.slice(0, 40)}"`)
            }
          }
        }
        found.push(...check(svg))
        const marks = svg.querySelectorAll(
          '.tc-line, .tc-area, .tc-bar, .tc-slice, .tc-point, .tc-dots, .tc-cell, .tc-candle-body, .tc-gauge-arc, .tc-seat, .tc-sankey-link',
        ).length
        if (!marks) found.push('no marks')
      }
      const tip = card.querySelector<HTMLElement>('.tc-tooltip[data-visible]')
      if (tip) {
        const t = tip.getBoundingClientRect()
        if (t.left < -1 || t.right > innerWidth + 1) found.push('tooltip outside the viewport')
        if (/NaN|undefined|Infinity/.test(tip.textContent ?? ''))
          found.push(`tooltip: ${tip.textContent}`)
      }
      // The card's own content must fit it (the tooltip aside).
      if (tip) tip.style.display = 'none'
      if (card.scrollWidth > card.clientWidth + 2) found.push('card overflows')
      if (tip) tip.style.display = ''
      return found
    })
    const title = (await card.getAttribute('data-title')) ?? '?'
    for (const issue of issues) out.push(`${title}: ${issue}`)
  }
  return out
}

async function open(page: Page, theme: 'light' | 'dark') {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.addInitScript((mode) => localStorage.setItem('tc-docs-theme', mode), theme)
  await page.addInitScript(installTextChecks)
  await page.goto('/examples.html')
  await page.locator('[data-example]').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  return errors
}

test('about a hundred examples', async ({ page }) => {
  await open(page, 'light')
  expect(await page.locator('[data-example] svg.tc-chart').count()).toBeGreaterThanOrEqual(100)
})

test('examples render cleanly on a desktop, light', async ({ page }) => {
  const errors = await open(page, 'light')
  const report = await findings(page)
  expect([...errors, ...report], [...errors, ...report].join('\n')).toEqual([])
})

test('examples render cleanly on a phone, dark', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  const errors = await open(page, 'dark')
  const report = await findings(page)
  expect([...errors, ...report], [...errors, ...report].join('\n')).toEqual([])
})
