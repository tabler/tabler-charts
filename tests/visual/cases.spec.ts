import { expect, type Page, test } from '@playwright/test'
import { installTextChecks } from './text-checks.ts'

/**
 * The edge cases page (cases.html): every card must render without errors,
 * without NaN or Infinity in the SVG, with every label inside the chart and
 * none on top of another of its kind, and with its tooltip inside the card.
 * Runs on a desktop in light mode and on a phone in dark mode.
 */

/** Cards whose input has nothing to draw. */
const EMPTY = new Set(['No series', 'Pie of zeros', 'Hidden series only'])

async function findings(page: Page): Promise<string[]> {
  const out: string[] = []
  for (const card of await page.locator('[data-case]').all()) {
    await card.scrollIntoViewIfNeeded()
    // Hover a little right of the middle, to open the tooltip.
    const box = await card.locator('svg.tc-chart').boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.45)
      await page.evaluate(() => new Promise(requestAnimationFrame))
    }
    const issues = await card.evaluate((card: HTMLElement) => {
      const found: string[] = []
      if (card.dataset.error) found.push(`throws: ${card.dataset.error}`)
      const svg = card.querySelector('svg.tc-chart')
      if (!svg) return card.dataset.error ? found : [...found, 'no svg']
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
      const check = (window as unknown as { __tcTextIssues: (svg: Element) => string[] })
        .__tcTextIssues
      found.push(...check(svg))
      const tip = card.querySelector('.tc-tooltip[data-visible]')
      if (tip) {
        const c = card.getBoundingClientRect()
        const t = tip.getBoundingClientRect()
        if (t.left < c.left - 2 || t.right > c.right + 2) found.push('tooltip outside the card')
        if (/NaN|undefined|Infinity/.test(tip.textContent ?? ''))
          found.push(`tooltip: ${tip.textContent}`)
      }
      if (card.scrollWidth > card.clientWidth + 2) found.push('card overflows')
      // Nothing may escape the card: an injected style would pin it over the page.
      for (const el of card.querySelectorAll('*')) {
        if (getComputedStyle(el).position === 'fixed')
          found.push(`${el.localName} is position: fixed`)
      }
      const marks = svg.querySelectorAll(
        '.tc-line, .tc-area, .tc-bar, .tc-slice, .tc-point, .tc-dots, .tc-cell, .tc-candle-body, .tc-gauge-arc',
      ).length
      if (!marks) found.push('no marks')
      return found
    })
    const title = (await card.getAttribute('data-title')) ?? '?'
    for (const issue of issues) {
      if (issue === 'no marks' && EMPTY.has(title)) continue
      out.push(`${title}: ${issue}`)
    }
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
  await page.goto('/cases.html')
  await page.locator('[data-case]').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  return errors
}

test('edge cases render cleanly on a desktop, light', async ({ page }) => {
  const errors = await open(page, 'light')
  const report = await findings(page)
  expect([...errors, ...report], [...errors, ...report].join('\n')).toEqual([])
})

test('edge cases render cleanly on a phone, dark', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  const errors = await open(page, 'dark')
  const report = await findings(page)
  expect([...errors, ...report], [...errors, ...report].join('\n')).toEqual([])
})
