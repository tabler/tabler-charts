// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest'
import { type ChartConfig, chartToString } from '../chart.ts'
import { Chart } from '../chart-default.ts'
import { features } from '../features.ts'
import '../patterns.ts'
import '../point-shapes.ts'
import { flush } from '../scheduler.ts'
import { line } from './line.ts'
import { markerPath } from './point-shapes.ts'
import { radar } from './radar.ts'
import { scatter } from './scatter.ts'

const size = { width: 400, height: 200 }
const labels = ['a', 'b', 'c', 'd']
const series = (n: number) =>
  Array.from({ length: n }, (_, s) => ({ name: `S${s}`, values: labels.map((_, i) => 10 + s + i) }))
const render = (options: Record<string, unknown>) =>
  chartToString({ id: 's', locale: 'en-US', ...options } as ChartConfig<object>, size)

describe('point shapes', () => {
  test('each slot has its own closed shape, the same commands at any size and place', () => {
    const commands = (d: string) => d.replace(/[^A-Za-z]/g, '')
    const shapes = Array.from({ length: 8 }, (_, slot) => markerPath(slot, 10, 10, 4))
    expect(new Set(shapes.map(commands)).size).toBeGreaterThan(4)
    for (let slot = 0; slot < 8; slot++) {
      expect(markerPath(slot, 10, 10, 4).endsWith('Z')).toBe(true)
      expect(commands(markerPath(slot, 3, 90, 6))).toBe(commands(markerPath(slot, 10, 10, 4)))
    }
    // Series 9 and up share the circle of the first.
    expect(markerPath(8, 10, 10, 4)).toBe(markerPath(0, 10, 10, 4))
  })

  test('line and radar points take the shape of their series', () => {
    for (const config of [
      { type: line, data: { labels, series: series(3) }, points: 'all' },
      { type: radar, data: { labels, series: series(3) }, points: true },
    ]) {
      const svg = render({ ...config, shapes: true })
      expect(svg).not.toMatch(/<circle class="tc-point"/)
      const marks = [...svg.matchAll(/class="tc-point tc-marker" d="([^"]+)"/g)].map((m) => m[1])
      expect(marks).toHaveLength(12)
      // A circle (arcs) for the first series, a square for the second.
      expect(marks[0]).toContain('a')
      expect(marks[4]).not.toContain('a')
    }
  })

  test('scatter dots draw their series shape in their one path', () => {
    const data = {
      series: [0, 1].map((s) => ({
        name: `S${s}`,
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
      })),
    }
    const svg = render({ type: scatter, data, shapes: true })
    const dots = [...svg.matchAll(/class="tc-point tc-dots tc-marker" d="([^"]+)"/g)].map(
      (m) => m[1],
    )
    expect(dots).toHaveLength(2)
    expect(dots[1]).toMatch(/^M[\d.,L]+Z/)
  })

  test('patterns: true brings the shapes along, unless shapes says no', () => {
    const data = { labels, series: series(2) }
    expect(render({ type: line, data, points: 'all', patterns: true })).toContain('tc-marker')
    expect(
      render({ type: line, data, points: 'all', patterns: true, shapes: false }),
    ).not.toContain('tc-marker')
    expect(render({ type: line, data, points: 'all' })).not.toContain('tc-marker')
  })

  test('the active points of the hover take the shapes too', () => {
    const el = document.createElement('div')
    document.body.append(el)
    const chart = new Chart(el, {
      type: line,
      width: 400,
      height: 200,
      shapes: true,
      data: { labels, series: series(2) },
    })
    chart.highlightIndex(1)
    flush()
    expect(el.querySelectorAll('.tc-point-active.tc-marker')).toHaveLength(2)
    chart.destroy()
  })

  test('on the core without the module, points stay circles', () => {
    const saved = [features.post, features['point-shapes']] as const
    delete features.post
    delete features['point-shapes']
    try {
      const svg = render({
        type: line,
        data: { labels, series: series(2) },
        points: 'all',
        shapes: true,
      })
      expect(svg).toContain('<circle class="tc-point"')
      expect(svg).not.toContain('tc-marker')
    } finally {
      features.post = saved[0]
      features['point-shapes'] = saved[1]
    }
  })
})
