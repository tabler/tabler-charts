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
        expect(body, `${scope} --tc-color-${n}`).toMatch(
          new RegExp(`--tc-color-${n}:\\s*#[0-9a-f]{6}`),
        )
      }
      expect(body, `${scope} --tc-surface`).toMatch(/--tc-surface:/)
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
      'tc-point',
      'tc-crosshair',
      'tc-hover-band',
      'tc-tooltip',
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
    ]
    for (const name of classes) {
      expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{]`))
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
    for (const name of ['tc-reveal', 'tc-grow', 'tc-fade-in']) {
      expect(css).toContain(`@keyframes ${name} {`)
    }
  })

  test('drives all motion through --tc-duration', () => {
    expect(css).not.toContain('!important')
    expect(block('@media (prefers-reduced-motion: reduce)')).toContain('--tc-duration: 0ms')
  })
})
