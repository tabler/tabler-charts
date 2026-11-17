import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { formatNumber, getNumberFormat, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { estimateTextWidth, type InsetsInput, innerRect, insets, round } from '../layout.ts'
import { rectPath } from '../shapes/rect.ts'
import { type ChildInput, type ClassValue, h } from '../vnode.ts'
import { cleanData, finite, isRecord, list, named } from './clean.ts'
import { fit } from './fit.ts'
import { groupAttrs, keyOf, legendItems } from './named.ts'

/** A tile of a treemap, or a group of them. */
export interface TreemapNode {
  name: string
  /** Size of the tile; a negative value is zero. A group is as large as its `children`. */
  value?: number
  /** Tiles (or groups) inside this one; they share its color. */
  children?: readonly TreemapNode[]
  /** Stable identity for keyed updates and legend toggles. Defaults to `name`. */
  id?: string
  /**
   * Custom color; overrides the palette slot via `--tc-series-color`.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
  /** Extra classes on the group (top level) or the tile. */
  class?: ClassValue
  /** Start hidden (top level; toggle it back from the legend). */
  hidden?: boolean
}

export interface TreemapOptions {
  /** Tiles, or groups of tiles; each top-level entry takes a palette color and a legend entry. */
  data: readonly TreemapNode[]
  /** Space between tiles in pixels. Defaults to `2`. */
  gap?: number
  /** Corner radius of the tiles. Defaults to `3`. */
  radius?: number
  /** Names (and values, where they fit) written in the tiles. Defaults to `true`. */
  labels?: boolean
  /** Format of the values (tiles, tooltip, table). */
  format?: NumberFormat
  /** Extra space around the chart, in pixels. */
  padding?: InsetsInput
}

/** Levels of nesting read from the data, and the most nodes: enough for any chart, few enough to draw. */
const MAX_DEPTH = 8
const MAX_NODES = 5000

/** Space between a tile's edge and its text. */
const INSET = 6

/** A node with its size worked out. */
interface Sized {
  node: TreemapNode
  value: number
  children?: Sized[]
}

interface Tile {
  node: TreemapNode
  key: string
  /** Position of the top-level ancestor in `data` (the color slot). */
  top: number
  /** Names of the ancestors, outermost first. */
  trail: readonly string[]
  value: number
  x: number
  y: number
  width: number
  height: number
}

function sized(nodes: readonly TreemapNode[]): Sized[] {
  return nodes.map((node) => {
    if (node.children?.length) {
      const children = sized(node.children)
      return { node, children, value: children.reduce((sum, child) => sum + child.value, 0) }
    }
    return { node, value: Math.max(0, node.value ?? 0) }
  })
}

/** The top-level entries with their sizes and color slots, without the hidden ones. */
function visible(options: TreemapOptions, hidden: ReadonlySet<string>) {
  return sized(options.data)
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => !hidden.has(keyOf(entry.node)))
}

/**
 * Squarified layout (Bruls, Huizing, van Wijk): `items`, largest first, fill
 * the rectangle in rows along its shorter side, each row closed as soon as
 * another item would make its tiles less square.
 */
function squarify(
  items: readonly Sized[],
  x: number,
  y: number,
  w: number,
  hgt: number,
  place: (item: Sized, x: number, y: number, w: number, hgt: number) => void,
): void {
  const sorted = items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value)
  let left = sorted.reduce((sum, item) => sum + item.value, 0)
  let i = 0
  while (i < sorted.length && w > 0 && hgt > 0) {
    const short = Math.min(w, hgt)
    // Pixels of area per unit of value in what is left of the rectangle.
    const k = (w * hgt) / left
    const largest = (sorted[i] as Sized).value
    let sum = 0
    let best = Number.POSITIVE_INFINITY
    let j = i
    for (; j < sorted.length; j++) {
      const next = sum + (sorted[j] as Sized).value
      // Thickness of the row squared: its worst tile is the largest or the smallest.
      const t2 = ((next * k) / short) ** 2
      const worst = Math.max(t2 / ((sorted[j] as Sized).value * k), (largest * k) / t2)
      if (worst > best) break
      best = worst
      sum = next
    }
    const thickness = (sum * k) / short
    let offset = 0
    for (; i < j; i++) {
      const item = sorted[i] as Sized
      const length = (item.value * k) / thickness
      if (w >= hgt) place(item, x, y + offset, thickness, length)
      else place(item, x + offset, y, length, thickness)
      offset += length
    }
    if (w >= hgt) {
      x += thickness
      w -= thickness
    } else {
      y += thickness
      hgt -= thickness
    }
    left -= sum
  }
}

/** Half gaps left around a tile on its left, top, right and bottom side. */
type Edges = readonly [number, number, number, number]

/**
 * The tiles of `items` in a rectangle, groups laid out inside their own.
 * The gap is cut from the tiles after they are placed, so it does not change
 * their arrangement: half of it on every side (a whole one between any two
 * neighbors), none at the edge of the chart. `edges` are the half gaps of
 * the rectangle itself.
 */
function layout(
  items: readonly Sized[],
  x: number,
  y: number,
  w: number,
  hgt: number,
  gap: number,
  out: Tile[],
  edges: Edges,
  top?: { index: number; key: string; trail: readonly string[] },
  slots?: readonly number[],
): void {
  squarify(items, x, y, w, hgt, (item, tx, ty, tw, th) => {
    const index = top?.index ?? (slots?.[items.indexOf(item)] as number)
    const key = top ? `${top.key}/${keyOf(item.node)}` : keyOf(item.node)
    const trail = top?.trail ?? []
    // A side on the border of the rectangle takes its half gap (none at the chart's edge), the others one.
    const near = 0.01
    const sides: Edges = [
      tx - x < near ? edges[0] : 1,
      ty - y < near ? edges[1] : 1,
      x + w - tx - tw < near ? edges[2] : 1,
      y + hgt - ty - th < near ? edges[3] : 1,
    ]
    if (item.children) {
      layout(item.children, tx, ty, tw, th, gap, out, sides, {
        index,
        key,
        trail: [...trail, item.node.name],
      })
    } else {
      const half = gap / 2
      out.push({
        node: item.node,
        key,
        top: index,
        trail,
        value: item.value,
        x: tx + sides[0] * half,
        y: ty + sides[1] * half,
        width: Math.max(0, tw - (sides[0] + sides[2]) * half),
        height: Math.max(0, th - (sides[1] + sides[3]) * half),
      })
    }
  })
}

function renderTreemap(options: TreemapOptions, ctx: RenderContext): ChildInput {
  const { width, height, fontSize, locale } = ctx
  const gap = Math.max(0, options.gap ?? 2)
  const radius = Math.max(0, options.radius ?? 3)
  const area = innerRect(width, height, insets(options.padding, 0))
  const entries = visible(options, ctx.hidden)
  const total = entries.reduce((sum, { entry }) => sum + entry.value, 0)

  const tiles: Tile[] = []
  layout(
    entries.map(({ entry }) => entry),
    area.x,
    area.y,
    area.width,
    area.height,
    gap,
    tiles,
    [0, 0, 0, 0],
    undefined,
    entries.map(({ index }) => index),
  )

  const value = formatNumber(options.format, locale)
  const share = getNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const hitFor = (tile: Tile, index: number): Hit => {
    const x = tile.x + tile.width / 2
    const item: HitItem = {
      name: tile.node.name,
      seriesIndex: tile.top,
      value: tile.value,
      text: `${value(tile.value)} (${share.format(total > 0 ? tile.value / total : 0)})`,
      x,
      y: tile.y + tile.height / 2,
    }
    const color = tile.node.color ?? options.data[tile.top]?.color
    if (color) item.color = color
    return {
      index,
      label: [...tile.trail, tile.node.name].join(' › '),
      title: tile.trail.join(' › '),
      x,
      area,
      items: [item],
      seriesIndex: tile.top,
      // A ring just inside the hovered tile.
      mark: {
        d: rectPath(tile.x + 1, tile.y + 1, tile.width - 2, tile.height - 2, radius - 1),
        x: 0,
        y: 0,
      },
    }
  }

  const interaction: Interaction = {
    count: tiles.length,
    hitIndex: (index) => {
      const tile = tiles[index]
      return tile ? hitFor(tile, index) : null
    },
    hitTest(px, py) {
      const index = tiles.findIndex(
        (tile) =>
          px >= tile.x - gap / 2 &&
          px <= tile.x + tile.width + gap / 2 &&
          py >= tile.y - gap / 2 &&
          py <= tile.y + tile.height + gap / 2,
      )
      return index < 0 ? null : hitFor(tiles[index] as Tile, index)
    },
  }
  ctx.onHitTest(interaction)

  const groups = entries.map(({ entry, index }) =>
    h(
      'g',
      groupAttrs(entry.node, index),
      tiles
        .filter((tile) => tile.top === index)
        .map((tile) =>
          h('rect', {
            key: tile.key,
            class: ['tc-tile', tile.trail.length > 0 && tile.node.class],
            x: round(tile.x),
            y: round(tile.y),
            width: round(tile.width),
            height: round(tile.height),
            rx: round(Math.min(radius, tile.width / 2, tile.height / 2)),
            // A tile inside a group may have a color of its own.
            style: tile.trail.length > 0 ? { '--tc-series-color': tile.node.color } : undefined,
          }),
        ),
    ),
  )

  // Names where a few letters fit, values below where there is a second line.
  const line = fontSize * 1.3
  const labels =
    options.labels !== false &&
    tiles.flatMap((tile) => {
      const room = tile.width - INSET * 2
      const name = tile.height >= line + INSET ? fit(tile.node.name, room, fontSize) : ''
      if (!name) return []
      const text = value(tile.value)
      const x = round(tile.x + INSET)
      const y = tile.y + INSET + fontSize * 0.85
      return [
        h('text', { key: tile.key, class: 'tc-treemap-label', x, y: round(y) }, name),
        tile.height >= line * 2 + INSET * 1.5 &&
          estimateTextWidth(text, fontSize) <= room &&
          h(
            'text',
            {
              key: `${tile.key}/value`,
              class: 'tc-treemap-label tc-treemap-value',
              x,
              y: round(y + line),
            },
            text,
          ),
      ]
    })

  return [
    h('g', { class: 'tc-treemap-tiles' }, groups),
    labels && h('g', { class: 'tc-treemap-labels', 'aria-hidden': 'true' }, labels),
  ]
}

function treemapTable(options: TreemapOptions, ctx: RenderContext, limit: number): DataTable {
  const entries = visible(options, ctx.hidden)
  const total = entries.reduce((sum, { entry }) => sum + entry.value, 0)
  const value = formatNumber(options.format, ctx.locale)
  const share = getNumberFormat(ctx.locale, { style: 'percent', maximumFractionDigits: 1 })
  const rows: string[][] = []
  const walk = (items: readonly Sized[], trail: readonly string[]) => {
    for (const item of items) {
      const path = [...trail, item.node.name]
      if (item.children) walk(item.children, path)
      else {
        rows.push([
          path.join(' › '),
          value(item.value),
          share.format(total > 0 ? item.value / total : 0),
        ])
      }
    }
  }
  walk(
    entries.map(({ entry }) => entry),
    [],
  )
  const table: DataTable = { columns: ['', 'Value', 'Share'], rows }
  if (rows.length > limit) {
    table.rows = rows.slice(0, limit)
    table.total = rows.length
  }
  return table
}

/** Nodes with text for names and finite values, at most `MAX_DEPTH` deep and `MAX_NODES` in all. */
function cleanNodes(data: unknown, depth = 0, budget = { left: MAX_NODES }): TreemapNode[] {
  const nodes: TreemapNode[] = []
  for (const r of list(data)) {
    if (!isRecord(r) || budget.left <= 0) continue
    budget.left--
    const children =
      depth < MAX_DEPTH && Array.isArray(r.children)
        ? cleanNodes(r.children, depth + 1, budget)
        : undefined
    nodes.push({ ...named(r), value: finite(r.value) ?? 0, children } as unknown as TreemapNode)
  }
  return nodes
}

/**
 * Treemap: parts of a whole as tiles, each as large as its value, laid out
 * as close to squares as they go with the largest in the top left corner.
 * Entries with `children` are groups: their tiles stay together and share
 * the group's color.
 *
 * ```ts
 * new Chart('#el', {
 *   type: treemap,
 *   data: [
 *     { name: 'Search', value: 42 },
 *     { name: 'Social', children: [{ name: 'Video', value: 18 }, { name: 'Posts', value: 9 }] },
 *   ],
 * })
 * ```
 */
export const treemap: ChartType<TreemapOptions> = {
  name: 'treemap',
  clean: cleanData((data) => cleanNodes(data)),
  render: renderTreemap,
  legend: (options) => legendItems(options.data),
  table: treemapTable,
}
