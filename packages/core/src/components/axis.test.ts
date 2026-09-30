import { describe, expect, test } from 'vitest'
import type { Rect } from '../layout.ts'
import { renderToString } from '../render/string.ts'
import { band, point } from '../scales/band.ts'
import { linear } from '../scales/linear.ts'
import { axis, axisSize, bandTicks, linearTicks, type Tick, thinTicks } from './axis.ts'
import { grid } from './grid.ts'

const area: Rect = { x: 40, y: 10, width: 300, height: 200 }

describe('linearTicks()', () => {
  test('returns positions and labels with shared precision', () => {
    const y = linear([0, 1], [210, 10])
    expect(linearTicks(y, { count: 2, locale: 'en-US' })).toEqual([
      { value: 0, position: 210, label: '0.0' },
      { value: 0.5, position: 110, label: '0.5' },
      { value: 1, position: 10, label: '1.0' },
    ])
  })

  test('uses the given format', () => {
    const y = linear([0, 2000], [100, 0])
    const labels = linearTicks(y, {
      count: 2,
      locale: 'en-US',
      format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
    }).map((t) => t.label)
    expect(labels).toEqual(['$0', '$1,000', '$2,000'])
  })
})

describe('bandTicks()', () => {
  test('places ticks at band centers', () => {
    const x = band(['Jan', 'Feb'], [0, 200])
    expect(bandTicks(x)).toEqual([
      { value: 'Jan', position: 50, label: 'Jan' },
      { value: 'Feb', position: 150, label: 'Feb' },
    ])
  })

  test('works with point scales and custom labels', () => {
    const x = point([1, 2, 3], [0, 100])
    expect(bandTicks(x, (key, i) => `${key}/${i}`).map((t) => [t.position, t.label])).toEqual([
      [0, '1/0'],
      [50, '2/1'],
      [100, '3/2'],
    ])
  })
})

describe('thinTicks()', () => {
  const make = (n: number, spacing: number, label = 'Label'): Tick[] =>
    Array.from({ length: n }, (_, i) => ({ value: i, position: i * spacing, label }))

  test('keeps all ticks when labels fit', () => {
    expect(thinTicks(make(5, 100), 'bottom', 12)).toHaveLength(5)
  })

  test('keeps every n-th tick when labels would overlap', () => {
    const kept = thinTicks(make(12, 30), 'bottom', 12)
    expect(kept.map((t) => t.value)).toEqual([0, 2, 4, 6, 8, 11])
  })

  test('appends the last tick when it fits after the last kept one', () => {
    // "Label" needs ~40px: step 2 keeps 0 and 60; the last tick (100) still fits after 60.
    const ticks = [0, 30, 60, 100].map((position, i) => ({ value: i, position, label: 'Label' }))
    expect(thinTicks(ticks, 'bottom', 12).map((t) => t.value)).toEqual([0, 2, 3])
  })

  test('uses line height for vertical axes', () => {
    expect(thinTicks(make(10, 10), 'left', 12).map((t) => t.value)).toEqual([0, 3, 6, 9])
  })

  test('handles tiny inputs', () => {
    expect(thinTicks([], 'bottom', 12)).toEqual([])
    expect(thinTicks(make(1, 0), 'bottom', 12)).toHaveLength(1)
    expect(thinTicks(make(3, 0), 'bottom', 12)).toHaveLength(1)
  })
})

describe('axisSize()', () => {
  const ticks: Tick[] = [
    { value: 0, position: 0, label: '0' },
    { value: 1000, position: 10, label: '1,000' },
  ]

  test('uses the widest label for vertical axes', () => {
    const size = axisSize('left', ticks, 12)
    expect(size).toBeGreaterThan(8 + 20)
    expect(size).toBeLessThan(8 + 40)
  })

  test('uses the line height for horizontal axes', () => {
    expect(axisSize('bottom', ticks, 12)).toBe(Math.ceil(12 * 1.25 + 8))
    expect(axisSize('bottom', ticks, 12, { tickSize: 6, tickPadding: 4 })).toBe(
      Math.ceil(12 * 1.25 + 10),
    )
  })

  test('is zero without ticks', () => {
    expect(axisSize('left', [], 12)).toBe(0)
  })
})

describe('axis()', () => {
  const x = band(['Jan', 'Feb', 'Mar'], [area.x, area.x + area.width])
  const y = linear([0, 100], [area.y + area.height, area.y])

  test('renders a bottom axis', () => {
    const node = axis({ position: 'bottom', ticks: bandTicks(x), area, line: true })
    expect(renderToString(node)).toMatchSnapshot()
  })

  test('renders a left axis with tick marks', () => {
    const node = axis({
      position: 'left',
      ticks: linearTicks(y, { count: 2, locale: 'en-US' }),
      area,
      tickSize: 4,
    })
    expect(renderToString(node)).toMatchSnapshot()
  })

  test('positions labels on the outer side of each edge', () => {
    const ticks = [{ value: 1, position: 100, label: '1' }]
    const at = (position: 'top' | 'right' | 'bottom' | 'left') => {
      const tick = axis({ position, ticks, area }).children[0]
      if (typeof tick === 'string' || !tick) throw new Error('expected a tick')
      const text = tick.children[0]
      if (typeof text === 'string' || !text) throw new Error('expected a label')
      return { transform: tick.attrs.style, ...text.attrs }
    }
    expect(at('bottom')).toMatchObject({ transform: 'transform:translate(100px,210px)', y: 8 })
    expect(at('top')).toMatchObject({ transform: 'transform:translate(100px,10px)', y: -8 })
    expect(at('left')).toMatchObject({
      transform: 'transform:translate(40px,100px)',
      x: -8,
      'text-anchor': 'end',
    })
    expect(at('right')).toMatchObject({
      transform: 'transform:translate(340px,100px)',
      x: 8,
      'text-anchor': 'start',
    })
  })

  test('keys ticks by value', () => {
    const node = axis({ position: 'left', ticks: linearTicks(y, { count: 2 }), area })
    expect(node.children.map((c) => (typeof c === 'string' ? c : c.key))).toEqual([0, 50, 100])
  })
})

describe('grid()', () => {
  test('renders horizontal lines and marks the zero line', () => {
    const y = linear([-50, 50], [area.y + area.height, area.y])
    const node = grid({ direction: 'y', ticks: linearTicks(y, { count: 2 }), area })
    expect(renderToString(node)).toMatchSnapshot()
  })

  test('renders vertical lines', () => {
    const x = point(['a', 'b'], [area.x, area.x + area.width])
    const node = grid({ direction: 'x', ticks: bandTicks(x), area })
    expect(renderToString(node)).toBe(
      '<g class="tc-grid tc-grid-x" aria-hidden="true">' +
        '<line class="tc-grid-line" x1="0" x2="0" y1="10" y2="210" style="transform:translateX(40px)"/>' +
        '<line class="tc-grid-line" x1="0" x2="0" y1="10" y2="210" style="transform:translateX(340px)"/></g>',
    )
  })
})
