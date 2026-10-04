import { expect, type Page, test } from '@playwright/test'

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
      const frame = svg.getBoundingClientRect()
      // Some engines (Firefox) pad every text box by a constant: w(a) + w(b) - w(ab).
      const probe = (value: string) => {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('class', 'tc-tick-label')
        text.textContent = value
        svg.append(text)
        const width = text.getBoundingClientRect().width
        text.remove()
        return width
      }
      const pad = Math.max(0, (probe('Ab') + probe('cd') - probe('Abcd')) / 2)
      const box = (text: Element) => {
        const r = text.getBoundingClientRect()
        return new DOMRect(r.x + pad, r.y, Math.max(0, r.width - pad * 2), r.height)
      }
      const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent)
      const kinds = new Map<string, DOMRect[]>()
      for (const text of texts) {
        const r = box(text)
        if (!r.width) continue
        const out = Math.max(
          frame.left - r.left,
          r.right - frame.right,
          frame.top - r.top,
          r.bottom - frame.bottom,
        )
        if (out > 1.5) found.push(`"${text.textContent}" ${Math.round(out)} px outside`)
        const kind =
          text.closest('.tc-axis')?.getAttribute('class') ?? text.getAttribute('class') ?? ''
        if (/gauge|pie/.test(kind)) continue
        const others = kinds.get(kind) ?? []
        // Engines differ in how tall a text box is (Firefox takes the whole line):
        // touching boxes are fine, sharing a third of their height is not.
        const overlaps = (o: DOMRect) =>
          Math.min(o.right, r.right) - Math.max(o.left, r.left) > 1 &&
          Math.min(o.bottom, r.bottom) - Math.max(o.top, r.top) > Math.min(o.height, r.height) * 0.3
        if (others.some(overlaps)) {
          found.push(`"${text.textContent}" overlaps a label`)
        }
        kinds.set(kind, [...others, r])
      }
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
