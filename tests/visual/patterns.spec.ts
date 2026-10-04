import { expect, type Page, test } from '@playwright/test'

/**
 * Pattern fills in the browser (sandbox.html): with `patterns: true` every
 * fill mark wears its slot's pattern and the legend swatches a CSS pattern;
 * with the default `'auto'` only in forced colors (emulated in Chromium),
 * where patterns use system colors; `false` never.
 */

async function build(page: Page, patterns: unknown) {
  await page.goto('/sandbox.html')
  await page.locator('body[data-ready]').waitFor({ state: 'attached' })
  return page.evaluate(async (patterns) => {
    const tc = (window as unknown as { tc: Record<string, any> }).tc
    const labels = ['Q1', 'Q2', 'Q3']
    const series = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ name: `S${i}`, values: [3 + i, 5, 4] }))
    const configs: [string, unknown][] = [
      ['bar', { labels, series: series(3) }],
      ['area', { labels, series: series(3) }],
      ['line', { labels, series: series(3) }],
      [
        'donut',
        [
          { name: 'A', value: 3 },
          { name: 'B', value: 5 },
        ],
      ],
      [
        'gauge',
        [
          { name: 'A', value: 30 },
          { name: 'B', value: 70 },
        ],
      ],
      [
        'scatter',
        {
          series: [
            { name: 'A', points: [{ x: 1, y: 2, size: 3 }] },
            { name: 'B', points: [{ x: 2, y: 1, size: 5 }] },
          ],
        },
      ],
      ['radar', { labels: ['a', 'b', 'c'], series: series(2) }],
    ]
    const out: Record<string, { fills: string[]; dashes: string[]; swatches: string[] }> = {}
    for (const [type, data] of configs) {
      const el = document.createElement('div')
      el.style.width = '360px'
      document.body.append(el)
      const options = patterns === undefined ? {} : { patterns }
      new tc.Chart(el, { type: tc[type], data, locale: 'en-US', ...options })
      const marks = el.querySelectorAll('.tc-bar, .tc-area, .tc-slice, .tc-gauge-arc, .tc-bubble')
      out[type] = {
        fills: [...new Set([...marks].map((m) => getComputedStyle(m).fill))],
        dashes: [...el.querySelectorAll('.tc-line')].map(
          (m) => getComputedStyle(m).strokeDasharray,
        ),
        swatches: [...el.querySelectorAll('.tc-legend-swatch')].map(
          (s) => getComputedStyle(s).backgroundImage,
        ),
      }
    }
    return out
  }, patterns)
}

const patterned = (fills: string[]) =>
  fills.length > 0 && fills.every((f) => /^url\("?#tc-\d+-pattern-[\w]+"?\)$/.test(f))

test('`true` wears patterns in every fill, dashes lines and patterns the swatches', async ({
  page,
}) => {
  const charts = await build(page, true)
  for (const [type, { fills, dashes, swatches }] of Object.entries(charts)) {
    if (type !== 'line') expect(patterned(fills), `${type}: ${fills}`).toBe(true)
    expect(
      swatches.every((s) => s.includes('gradient')),
      `${type} swatches`,
    ).toBe(true)
    if (type === 'line') expect(new Set(dashes).size, 'one dash per line').toBe(3)
  }
})

test('the default leaves colors alone outside forced colors, and `false` always', async ({
  page,
}) => {
  for (const option of [undefined, false]) {
    const charts = await build(page, option)
    for (const [type, { fills, dashes, swatches }] of Object.entries(charts)) {
      expect(
        fills.some((f) => f.startsWith('url(')),
        `${type}: ${fills}`,
      ).toBe(false)
      expect(
        swatches.every((s) => s === 'none'),
        `${type} swatches`,
      ).toBe(true)
      expect(
        dashes.every((d) => d === 'none'),
        `${type} dashes`,
      ).toBe(true)
    }
  }
})

test('in forced colors the default wears patterns in system colors', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium')
  await page.emulateMedia({ forcedColors: 'active' })
  const charts = await build(page, undefined)
  for (const [type, { fills, swatches }] of Object.entries(charts)) {
    if (type !== 'line') expect(patterned(fills), `${type}: ${fills}`).toBe(true)
    expect(
      swatches.every((s) => s.includes('gradient')),
      `${type} swatches`,
    ).toBe(true)
  }
  const ink = await page.evaluate(
    () => getComputedStyle(document.querySelector('.tc-pattern-ink') as Element).stroke,
  )
  const canvasText = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.color = 'CanvasText'
    document.body.append(probe)
    return getComputedStyle(probe).color
  })
  expect(ink).toBe(canvasText)
  // And `false` still opts out.
  const off = await build(page, false)
  expect(off.bar?.fills.some((f) => f.startsWith('url('))).toBe(false)
})

test('an export keeps the patterns, in the chart and its legend', async ({ page }) => {
  await page.goto('/sandbox.html')
  await page.locator('body[data-ready]').waitFor({ state: 'attached' })
  const svg = await page.evaluate(() => {
    const tc = (window as unknown as { tc: Record<string, any> }).tc
    const el = document.createElement('div')
    el.style.width = '360px'
    document.body.append(el)
    const series = [0, 1].map((i) => ({ name: `S${i}`, values: [3 + i, 5] }))
    const chart = new tc.Chart(el, {
      type: tc.bar,
      id: 'x',
      patterns: true,
      data: { labels: ['a', 'b'], series },
    })
    for (const animation of document.getAnimations()) animation.finish()
    return tc.exportSVG(chart) as string
  })
  expect(svg.match(/<pattern /g)).toHaveLength(2)
  expect(svg).toMatch(/class="tc-bar"[^>]*fill:url\(&quot;#x-pattern-1&quot;\)/)
  // The legend dots wear the patterns too.
  expect(svg).toMatch(/<circle[^>]*fill:url\(#x-pattern-2\)/)
})
