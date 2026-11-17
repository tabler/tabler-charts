import { expect, test } from '@playwright/test'

/**
 * Transitions between states, halfway through, in a real browser: every CSS
 * transition and animation is paused at its middle, and then each mark must
 * lie between where it started and where it ends (a mark that stays), or
 * inside the chart (a mark that enters); nothing may compute to NaN. Catches
 * marks flying in from a corner, path morphs that loop out, and jumps.
 * WebKit morphs paths in JS (`@tabler/charts/morph`), outside the CSS
 * animations paused here, so it runs in Chromium and Firefox. Slices and
 * gauge arcs are swept in JS everywhere, and are looked at on their way instead.
 */

const labels = (n: number, from = 0) => Array.from({ length: n }, (_, i) => `L${i + from}`)
const wave = (s: number, i: number) => Math.round(50 + 40 * Math.sin(i / 2 + s))
const series = (n: number, len: number, f: (s: number, i: number) => number) =>
  Array.from({ length: n }, (_, s) => ({
    name: `S${s}`,
    values: labels(len).map((_, i) => f(s, i)),
  }))

const regular = { labels: labels(6), series: series(2, 6, wave) }
const states = {
  regular,
  negative: { labels: labels(6), series: series(2, 6, (s, i) => -wave(s, i)) },
  mixed: { labels: labels(6), series: series(2, 6, (s, i) => wave(s, i) - 50) },
  zero: { labels: labels(6), series: series(2, 6, () => 0) },
  shifted: { labels: labels(6, 1), series: series(2, 6, (s, i) => wave(s, i + 1)) },
  nine: { labels: labels(6), series: series(9, 6, wave) },
  one: { labels: labels(6), series: series(1, 6, wave) },
  empty: { labels: [], series: [] },
}
const slices = (values: number[]) => values.map((value, i) => ({ name: `P${i}`, value }))
const points = (k: number) => ({
  series: [0, 1].map((s) => ({
    name: `S${s}`,
    points: labels(15).map((_, i) => ({
      x: i * 3 * k,
      y: wave(s, i) * k,
      size: ((i + s) % 4) + 1,
    })),
  })),
})
const candles = (falling: boolean) =>
  labels(15).map((_, i) => ({
    x: `2026-01-${String(i + 1).padStart(2, '0')}`,
    open: falling ? 80 - i : 50 + i,
    high: 90,
    low: 20,
    close: falling ? 30 + i : 60 + (i % 3) * 5,
  }))

type Step = [string, string, Record<string, unknown>, Record<string, unknown>]
const STEPS: Step[] = [
  ['line', 'line', { data: regular }, { data: states.negative }],
  ['line', 'line', { data: regular }, { data: states.shifted }],
  ['line', 'line', { data: regular }, { data: states.zero }],
  ['line', 'line', { data: states.empty }, { data: regular }],
  ['line', 'line', { data: regular }, { data: states.nine }],
  ['line', 'line', { data: states.nine }, { data: states.one }],
  ['area', 'area', { data: regular }, { data: regular, stacked: true }],
  ['area', 'area', { data: regular, stacked: true }, { data: regular, stacked: 'percent' }],
  ['area', 'area', { data: regular }, { data: states.mixed }],
  ['line', 'area', { data: regular }, { data: regular }],
  ['line', 'bar', { data: regular }, { data: regular }],
  ['bar', 'line', { data: regular }, { data: regular }],
  ['bar', 'bar', { data: regular }, { data: regular, stacked: true }],
  ['bar', 'bar', { data: regular, stacked: true }, { data: regular, stacked: 'percent' }],
  ['bar', 'bar', { data: regular }, { data: regular, orientation: 'horizontal' }],
  ['bar', 'bar', { data: regular }, { data: states.negative }],
  ['bar', 'bar', { data: regular }, { data: states.mixed }],
  ['bar', 'bar', { data: states.empty }, { data: regular }],
  ['bar', 'bar', { data: regular }, { data: states.nine }],
  [
    'bar',
    'bar',
    { data: regular, orientation: 'horizontal' },
    { data: states.negative, orientation: 'horizontal' },
  ],
  ['heatmap', 'heatmap', { data: regular }, { data: states.negative }],
  ['radar', 'radar', { data: regular }, { data: states.zero }],
  ['radar', 'radar', { data: regular }, { data: states.nine }],
  ['pie', 'pie', { data: slices([10, 20, 30, 40]) }, { data: slices([1000, 1, 1, 1]) }],
  ['pie', 'pie', { data: slices([10, 20, 30, 40]) }, { data: slices([5, 10]) }],
  ['donut', 'donut', { data: slices([10, 20, 30, 40]) }, { data: slices([40, 30, 20, 10]) }],
  ['donut', 'donut', { data: [] }, { data: slices([10, 20, 30]) }],
  ['gauge', 'gauge', { data: 20 }, { data: 100 }],
  ['gauge', 'gauge', { data: 0 }, { data: 250 }],
  ['gauge', 'gauge', { data: slices([30, 80]) }, { data: slices([90, 10, 50]) }],
  ['scatter', 'scatter', { data: points(1) }, { data: points(2) }],
  ['candlestick', 'candlestick', { data: candles(false) }, { data: candles(true) }],
  [
    'sparkline',
    'sparkline',
    { data: labels(12).map((_, i) => wave(0, i)) },
    { data: labels(12).map((_, i) => -wave(1, i)) },
  ],
]

test.skip(({ browserName }) => browserName === 'webkit', 'WebKit morphs paths in JS')

for (const [index, [from, to, a, b]] of STEPS.entries()) {
  test(`${index + 1}. ${from} → ${to}: ${describeChange(a, b)}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/sandbox.html')
    await page.locator('body[data-ready]').waitFor({ state: 'attached' })
    const issues = await page.evaluate(
      async ({ from, to, a, b }) => {
        const tc = (window as unknown as { tc: Record<string, unknown> }).tc
        const { Chart } = tc as {
          Chart: new (el: Element, c: object) => { update(c: object): void; render(): void }
        }
        const el = document.createElement('div')
        el.style.width = '480px'
        document.body.append(el)
        const chart = new Chart(el, {
          type: tc[from],
          locale: 'en-US',
          animate: true,
          height: 240,
          ...a,
        })
        const MARKS =
          '.tc-line, .tc-area, .tc-bar, .tc-slice, .tc-point, .tc-dots, .tc-cell, .tc-candle-body, .tc-candle-wick, .tc-gauge-arc, .tc-radar-area, .tc-radar-line'
        const finish = () => {
          for (const animation of document.getAnimations()) animation.finish()
        }
        const boxes = () => {
          const out = new Map<Element, DOMRect>()
          for (const mark of el.querySelectorAll(MARKS)) out.set(mark, mark.getBoundingClientRect())
          return out
        }
        finish()
        const start = boxes()
        chart.update({ type: tc[to], ...b })
        chart.render()
        // Pause everything at its middle (style is recalculated by getAnimations()).
        const running = document.getAnimations()
        for (const animation of running) {
          const timing = animation.effect?.getComputedTiming()
          animation.pause()
          animation.currentTime = Number(timing?.delay ?? 0) + Number(timing?.duration ?? 0) / 2
        }
        // Slices are swept frame by frame, not by CSS (see `sweep`): wait for
        // them to be on their way, and later to arrive.
        const swept = [...el.querySelectorAll('.tc-slice, .tc-gauge-arc, .tc-gauge-track')]
        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
        if (swept.length) await wait(150)
        const mid = boxes()
        const midway = swept.map((m) => m.getAttribute('d'))
        const nan = [...el.querySelectorAll(MARKS)].filter((m) =>
          /NaN/.test(getComputedStyle(m).getPropertyValue('d')),
        )
        finish()
        if (swept.length) await wait(500)
        const end = boxes()
        const moved = swept.some((m, i) => m.getAttribute('d') !== midway[i])
        const plot = (el.querySelector('svg.tc-chart') as SVGSVGElement).getBoundingClientRect()
        const found: string[] = []
        const label = (m: Element) =>
          `${m.localName}.${m.getAttribute('class')?.split(' ').slice(0, 2).join('.')}`
        const r = (b: DOMRect) =>
          `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)}`
        const SLACK = 3
        const pieBox = swept.length
          ? (
              el.querySelector('.tc-pie-slices, .tc-gauge-rings') as SVGGElement
            ).getBoundingClientRect()
          : plot
        for (const [mark, box] of mid) {
          if (!mark.isConnected || (box.width === 0 && box.height === 0)) continue
          const s = start.get(mark)
          const e = end.get(mark)
          // A mark that stays moves within the box of where it was and where it goes;
          // one that enters or leaves stays inside the chart. A slice turns around
          // the center instead, through places it neither starts nor ends at, and
          // stays inside the pie.
          const area = swept.includes(mark)
            ? pieBox
            : s && e
              ? {
                  left: Math.min(s.left, e.left),
                  top: Math.min(s.top, e.top),
                  right: Math.max(s.right, e.right),
                  bottom: Math.max(s.bottom, e.bottom),
                }
              : plot
          if (
            box.left < area.left - SLACK ||
            box.top < area.top - SLACK ||
            box.right > area.right + SLACK ||
            box.bottom > area.bottom + SLACK
          ) {
            found.push(
              `${label(mark)} ${s && e ? 'stays' : 'enters'}: halfway at ${r(box)}, ${s && e ? `from ${r(s)} to ${r(e)}` : `outside the chart ${r(plot)}`}`,
            )
          }
        }
        for (const m of nan) found.push(`${label(m)} computes d to NaN`)
        // Something must have moved, or the check above checks nothing.
        if (!running.length && !moved) found.push('no transition ran')
        return [...new Set(found)].slice(0, 8)
      },
      { from, to, a, b },
    )
    const report = [...errors, ...issues]
    expect(report, report.join('\n')).toEqual([])
  })
}

function describeChange(a: Record<string, unknown>, b: Record<string, unknown>): string {
  const state = (o: Record<string, unknown>) => {
    const key = Object.entries(states).find(([, v]) => v === o.data)?.[0]
    const extra = Object.entries(o)
      .filter(([k]) => k !== 'data')
      .map(([k, v]) => `${k}=${v}`)
      .join(' ')
    return [key ?? JSON.stringify(o.data).slice(0, 24), extra].filter(Boolean).join(' ')
  }
  return `${state(a)} → ${state(b)}`
}
