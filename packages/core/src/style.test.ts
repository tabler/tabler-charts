/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8')

/** Declarations inside the first rule block whose prelude contains `selector`. */
function block(selector: string): string {
  const start = css.indexOf(selector)
  if (start < 0) return ''
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
  }
  return ''
}

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8]

describe('style.css', () => {
  test('defines every series color for light, OS dark and forced dark', () => {
    const scopes = {
      light: block(':where(:root),\n:where([data-theme="light"])'),
      osDark: block('@media (prefers-color-scheme: dark)'),
      dark: block(':where([data-theme="dark"])'),
    }
    for (const [scope, body] of Object.entries(scopes)) {
      for (const n of SLOTS) {
        // Tabler's variable first, then the chart's own color.
        expect(body, `${scope} --tc-color-${n}`).toMatch(
          new RegExp(`--tc-color-${n}:\\s*var\\(--tblr-[a-z-]+, #[0-9a-f]{6}\\)`),
        )
      }
      expect(body, `${scope} --tc-surface`).toMatch(/--tc-surface: var\(--tblr-bg-surface, #/)
    }
  })

  test('reads every theme color, the font, radius and shadow from Tabler first', () => {
    for (const [token, variable] of [
      ['--tc-color-1', 'primary'],
      ['--tc-surface', 'bg-surface'],
      ['--tc-text-color', 'body-color'],
      ['--tc-text-muted', 'secondary'],
      ['--tc-grid-color', 'border-color-translucent'],
      ['--tc-baseline-color', 'border-color'],
      ['--tc-tooltip-bg', 'dark'],
      ['--tc-tooltip-shadow', 'box-shadow'],
      ['--tc-tooltip-radius', 'border-radius'],
      ['--tc-font-family', 'body-font-family'],
    ]) {
      expect(
        css.match(new RegExp(`${token}: var\\(--tblr-${variable}, `, 'g'))?.length,
        token,
      ).toBe(token === '--tc-tooltip-radius' || token === '--tc-font-family' ? 1 : 3)
    }
    expect(css.match(/--tc-hover-color: rgba\(var\(--tblr-emphasis-color-rgb, /g)?.length).toBe(3)
  })

  test('repeats derived tokens in every theme block', () => {
    // Otherwise a [data-theme="dark"] subtree inherits the light value resolved on :root.
    for (const token of ['--tc-focus-color']) {
      expect(css.match(new RegExp(`${token}: var\\(`, 'g'))?.length, token).toBe(3)
    }
  })

  test('keeps both tooltip variants their colors in dark mode', () => {
    // The dark tooltip is dark and the light one white on every page, so their
    // text and border colors are literals, declared once.
    for (const [token, value] of [
      ['--tc-tooltip-color', '#ffffff'],
      ['--tc-tooltip-muted', 'rgb(255 255 255 / 70%)'],
      ['--tc-tooltip-light-bg', '#ffffff'],
      ['--tc-tooltip-light-color', '#0b0b0b'],
      ['--tc-tooltip-light-muted', '#6f6e69'],
    ]) {
      // Declared once (the .tc-tooltip-light block only points the dark tokens at the light ones).
      expect(
        css.match(new RegExp(`${token}: (?!var\\(--tc-tooltip-light)`, 'g'))?.length,
        token,
      ).toBe(1)
      expect(css).toContain(`${token}: ${value};`)
    }
    for (const token of ['bg', 'color', 'muted', 'border']) {
      expect(block('.tc-tooltip-light ')).toContain(
        `--tc-tooltip-${token}: var(--tc-tooltip-light-${token})`,
      )
    }
  })

  test('maps every series class to its color slot', () => {
    for (const n of SLOTS) {
      expect(block(`.tc-series-${n} `)).toContain(`--tc-series-color: var(--tc-color-${n})`)
    }
  })

  test('styles every class rendered by the core components', () => {
    const classes = [
      'tc-chart',
      'tc-tick-label',
      'tc-grid-line',
      'tc-grid-line-zero',
      'tc-axis-line',
      'tc-tick-line',
      'tc-line',
      'tc-area',
      'tc-area-gradient',
      'tc-fade-start',
      'tc-fade-end',
      'tc-bar',
      'tc-bar-horizontal',
      'tc-point',
      'tc-bubble',
      'tc-point-min',
      'tc-point-max',
      'tc-chart-sparkline',
      'tc-crosshair',
      'tc-slice',
      'tc-pie-track',
      'tc-pie-value',
      'tc-pie-label',
      'tc-pie-slices',
      'tc-hover-mark',
      'tc-hover-band',
      'tc-tooltip',
      'tc-tooltip-light',
      'tc-tooltip-title',
      'tc-tooltip-item',
      'tc-tooltip-swatch',
      'tc-tooltip-name',
      'tc-tooltip-value',
      'tc-tooltip-footer',
      'tc-legend',
      'tc-legend-items',
      'tc-legend-item',
      'tc-legend-swatch',
      'tc-legend-item-hidden',
      'tc-sr-only',
      'tc-table',
      'tc-table-wrap',
    ]
    for (const name of classes) {
      expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{:]`))
    }
  })

  test('times every animation and transition with the --tc-duration tokens', () => {
    const timed = [...css.matchAll(/(?:animation|transition)(?:-duration)?:\s*([^;]+);/g)]
      .map((m) => m[1] ?? '')
      .filter((value) => value.trim() !== 'none')
    expect(timed.length).toBeGreaterThan(5)
    for (const value of timed) {
      // No literal durations like 300ms / 0.2s: they would ignore reduced motion.
      expect(value, value).not.toMatch(/(^|[\s,(])\d*\.?\d+m?s\b/)
      expect(value, value).toMatch(/var\(--tc-duration(-fast)?\)/)
    }
  })

  test('defines the entrance keyframes', () => {
    for (const name of ['tc-reveal', 'tc-grow', 'tc-grow-x', 'tc-fade-in', 'tc-pie-in']) {
      expect(css).toContain(`@keyframes ${name} {`)
    }
  })

  test('drives all motion through --tc-duration', () => {
    expect(css).not.toContain('!important')
    expect(block('@media (prefers-reduced-motion: reduce)')).toContain('--tc-duration: 0ms')
  })
})
