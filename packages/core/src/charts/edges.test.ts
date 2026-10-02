/**
 * Narrow charts (a phone is 375 px wide): labels must stay inside the chart
 * and not run into each other, and marks must not cover the axes. Found by
 * the phone-width visual tests.
 */
import { describe, expect, test } from 'vitest'
import '../annotations.ts'
import { candlestick } from '../candlestick.ts'
import { buildChart, type ChartConfig } from '../chart.ts'
import { estimateTextWidth } from '../layout.ts'
import { findByClass, findByTag, tickLabelExtent } from '../test-utils.ts'
import type { VNode } from '../vnode.ts'
import { bar } from './bar.ts'
import { heatmap } from './heatmap.ts'
import { line } from './line.ts'
import { scatter } from './scatter.ts'

const narrow = { width: 300, height: 160 }
const build = (config: Record<string, unknown>, size = narrow) =>
  buildChart({ id: 'e', locale: 'en-US', ...config } as unknown as ChartConfig<object>, size, 'e')

describe('narrow charts', () => {
  test('long category labels on narrow bands stay inside the chart', () => {
    const node = build({
      type: bar,
      data: {
        labels: Array.from({ length: 20 }, (_, i) => `Category ${i + 1}`),
        series: [{ name: 'A', values: Array.from({ length: 20 }, (_, i) => i + 1) }],
      },
    })
    const [left, right] = tickLabelExtent(node)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(right).toBeLessThanOrEqual(narrow.width)
  })

  test('dates under many candles stay inside the chart', () => {
    const node = build({
      type: candlestick,
      x: { type: 'time', utc: true },
      data: Array.from({ length: 23 }, (_, i) => ({
        x: Date.UTC(2025, i, 1),
        open: 10,
        high: 12,
        low: 9,
        close: 11,
      })),
    })
    const [left, right] = tickLabelExtent(node)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(right).toBeLessThanOrEqual(narrow.width)
  })

  test('the last heatmap column label stays inside the chart', () => {
    const node = build({
      type: heatmap,
      data: {
        labels: Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`),
        series: [{ name: 'API', values: Array.from({ length: 12 }, () => 1) }],
      },
    })
    expect(tickLabelExtent(node)[1]).toBeLessThanOrEqual(narrow.width)
  })

  describe('annotation labels', () => {
    /** [left, top, right, bottom] of each label, as placed. */
    const boxes = (node: VNode) =>
      findByClass(node, 'tc-annotation-label').map((t) => {
        const x = Number(t.attrs.x)
        const y = Number(t.attrs.y)
        const w = estimateTextWidth(t.children.join(''), 12 * 0.92)
        return [x, y - 12, x + w, y + 3] as const
      })

    test('a band label near the right edge ends inside the plot', () => {
      const node = build({
        type: bar,
        data: {
          labels: ['a', 'b', 'c', 'd', 'e', 'f'],
          series: [{ name: 'A', values: [1, 2, 3, 4, 5, 6] }],
        },
        annotations: [{ x: ['e', 'f'], label: 'Holiday season' }],
      })
      const [box] = boxes(node)
      expect(box?.[2]).toBeLessThanOrEqual(narrow.width)
      expect(box?.[0]).toBeGreaterThanOrEqual(0)
    })

    test('labels step aside instead of covering each other', () => {
      const node = build({
        type: bar,
        data: { labels: ['a', 'b', 'c', 'd'], series: [{ name: 'A', values: [100, 90, 95, 98] }] },
        annotations: [
          { x: 'd', label: 'Incident' },
          { y: 99, label: 'SLO 99' },
          { y: 97, label: 'Target 97' },
        ],
      })
      const placed = boxes(node)
      expect(placed).toHaveLength(3)
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const [a, b] = [placed[i], placed[j]] as const
          const overlap = a && b && !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3])
          expect(overlap, `labels ${i} and ${j}`).toBe(false)
        }
      }
    })
  })

  test('bubbles are cut at the plot edges, not drawn over the axes', () => {
    const clipLeft = (points: { x: number; y: number; size?: number }[]) => {
      const node = build({ type: scatter, data: { series: [{ name: 'A', points }] } })
      const rect = findByTag(findByTag(node, 'clipPath')[0] ?? node, 'rect')[0]
      // The y axis sits on the plot's left edge.
      const axis = findByClass(findByClass(node, 'tc-axis-left')[0] ?? node, 'tc-tick')[0]
      const edge = Number(String(axis?.attrs.style).match(/translate\((-?[\d.]+)px/)?.[1])
      return Number(rect?.attrs.x) - edge
    }
    // Bubbles: cut a pixel past the edge, so a big one never covers the axis labels.
    expect(
      clipLeft([
        { x: 0, y: 0, size: 100 },
        { x: 10, y: 10, size: 1 },
      ]),
    ).toBe(-1)
    // Plain dots may still reach a little past it.
    expect(
      clipLeft([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBeLessThan(-4)
  })

  test('value labels on a short plot do not run into each other', () => {
    // Nice ticks for 0–60 come at every 20 even when only two were asked for.
    const values = [52, 48, 55, 50, 47, 53]
    const data = { labels: ['a', 'b', 'c', 'd', 'e', 'f'], series: [{ name: 'A', values }] }
    const gaps = (node: VNode, axisClass: string) => {
      const axis = findByClass(node, axisClass)[0] as VNode
      const at = findByClass(axis, 'tc-tick').map((t) =>
        String(t.attrs.style)
          .match(/translate\(([\d.-]+)px,\s*([\d.-]+)px\)/)
          ?.slice(1)
          .map(Number),
      )
      return at
        .slice(1)
        .map((p, i) => [
          Math.abs((p?.[0] ?? 0) - (at[i]?.[0] ?? 0)),
          Math.abs((p?.[1] ?? 0) - (at[i]?.[1] ?? 0)),
        ])
    }
    const tall = build({ type: line, data, y: { zero: true } }, { width: 600, height: 75 })
    for (const [, dy] of gaps(tall, 'tc-axis-y')) expect(dy).toBeGreaterThanOrEqual(12 * 1.25)
    // Horizontal bars put the values along x: thinned by their width.
    const side = build({ type: bar, orientation: 'horizontal', data }, { width: 120, height: 200 })
    const ticks = findByClass(findByClass(side, 'tc-axis-x')[0] as VNode, 'tc-tick-label')
    const widths = ticks.map((t) => estimateTextWidth(String(t.children[0]), 12))
    gaps(side, 'tc-axis-x').forEach(([dx], i) => {
      expect(dx).toBeGreaterThanOrEqual(((widths[i] ?? 0) + (widths[i + 1] ?? 0)) / 2)
    })
  })
})
