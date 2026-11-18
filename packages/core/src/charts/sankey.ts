import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { formatDetail, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import {
  estimateTextWidth,
  type InsetsInput,
  innerRect,
  insets,
  LINE_HEIGHT,
  mirrorSides,
  type Rect,
  round,
} from '../layout.ts'
import type { LegendItem } from '../legend.ts'
import { type ChildInput, h } from '../vnode.ts'
import { cleanData, finite, isRecord, named, records, text } from './clean.ts'

/** A node of the flow; nodes left out are made from the links. */
export interface SankeyNode {
  name: string
  /**
   * Custom color; overrides the palette slot via `--tc-series-color`. Nodes
   * sharing a color form one legend entry, named after the first of them.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
  /** Start hidden (toggle it back from the legend, with every node of its color). */
  hidden?: boolean
}

/** A flow between two nodes, by name. */
export interface SankeyLink {
  from: string
  to: string
  /** Non-negative value; negative values count as zero. */
  value: number
}

export interface SankeyData {
  /** Optional: sets the stacking order within a column, and colors. */
  nodes?: readonly SankeyNode[]
  links: readonly SankeyLink[]
}

export interface SankeyOptions {
  data: SankeyData
  /** Width of the node bars in pixels. Defaults to `12`. */
  nodeWidth?: number
  /** Vertical gap between the nodes of a column in pixels. Defaults to `16`. */
  nodePadding?: number
  /** Format of the values (labels, tooltips and the table). */
  format?: NumberFormat
  /**
   * `'justify'` (default) puts every node without outgoing flows in the last
   * column; `'left'` leaves it in the column after its sources.
   */
  align?: 'justify' | 'left'
  /** Extra space around the diagram, in pixels. */
  padding?: InsetsInput
}

interface Node {
  data: SankeyNode
  index: number
  /** Palette slot, 1-based: the node's position in its column. */
  slot: number
  column: number
  value: number
  x: number
  y: number
  height: number
  ins: Link[]
  outs: Link[]
}

interface Link {
  data: SankeyLink
  index: number
  source: Node
  target: Node
  /** Top of the slice at the source and at the target. */
  sy: number
  ty: number
  width: number
}

interface Layout {
  nodes: Node[]
  links: Link[]
  /** The columns' extent, between the label margins. */
  plot: Rect
  nodeWidth: number
  labels: NodeLabel[]
}

/** A node's label: the name and the value under it, cut to fit (empty when hidden). */
interface NodeLabel {
  side: 'left' | 'right'
  name: string
  value: string
}

/** Space between a node and its label. */
const LABEL_GAP = 8
/** Largest share of the width one side's labels may take. */
const MAX_LABEL_SHARE = 0.3
/** Pixels around a node that still count as hovering it. */
const HOVER_SLOP = 2

/** `text`, cut short with an ellipsis to fit `width` pixels. */
function truncate(text: string, width: number, fontSize: number): string {
  if (estimateTextWidth(text, fontSize) <= width) return text
  let end = text.length
  while (end > 0 && estimateTextWidth(`${text.slice(0, end)}…`, fontSize) > width) end--
  return end > 0 ? `${text.slice(0, end).trimEnd()}…` : ''
}

/** The color of a node for hover and tooltip swatches. */
const colorOf = (node: Node): string => node.data.color ?? `var(--tc-color-${node.slot})`

/** The visible nodes and links, in data order, with their columns. */
function graph(data: SankeyData, hidden: ReadonlySet<string>, justify: boolean) {
  const byName = new Map<string, Node>()
  const nodes: Node[] = []
  const node = (name: string, data?: SankeyNode): Node => {
    let found = byName.get(name)
    if (!found) {
      found = {
        data: data ?? { name },
        index: nodes.length,
        slot: 1,
        column: 0,
        value: 0,
        x: 0,
        y: 0,
        height: 0,
        ins: [],
        outs: [],
      }
      byName.set(name, found)
      nodes.push(found)
    }
    return found
  }
  const declared = new Map((data.nodes ?? []).map((n) => [n.name, n]))
  /** A legend key hides every node of its color, see `sankeyLegend`. */
  const isHidden = (name: string) => {
    const n = declared.get(name)
    return hidden.has(name) || (n?.color !== undefined && hidden.has(legendKey(data, n.color)))
  }
  const links: Link[] = []
  data.links.forEach((link, index) => {
    if (link.from === link.to || isHidden(link.from) || isHidden(link.to)) return
    const source = node(link.from, declared.get(link.from))
    const target = node(link.to, declared.get(link.to))
    const out: Link = { data: link, index, source, target, sy: 0, ty: 0, width: 0 }
    links.push(out)
    if (link.value <= 0) return
    source.outs.push(out)
    target.ins.push(out)
  })
  for (const n of nodes) {
    n.value = Math.max(
      n.outs.reduce((sum, l) => sum + l.data.value, 0),
      n.ins.reduce((sum, l) => sum + l.data.value, 0),
    )
  }
  // Column: the longest path from a source, passes bounded so cycles end.
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false
    for (const link of links) {
      if (link.data.value > 0 && link.target.column <= link.source.column) {
        link.target.column = link.source.column + 1
        changed = true
      }
    }
    if (!changed) break
  }
  const last = nodes.reduce((max, n) => Math.max(max, n.column), 0)
  if (justify) for (const n of nodes) if (n.outs.length === 0) n.column = last
  // Stack order within a column: declared nodes first, then first appearance.
  const order = [...declared.keys()]
  nodes.sort((a, b) => {
    if (a.column !== b.column) return a.column - b.column
    const ia = order.indexOf(a.data.name)
    const ib = order.indexOf(b.data.name)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== ib) return ia === -1 ? 1 : -1
    return a.index - b.index
  })
  const slots = new Map<number, number>()
  nodes.forEach((n, index) => {
    n.index = index
    const slot = (slots.get(n.column) ?? 0) + 1
    slots.set(n.column, slot)
    n.slot = ((slot - 1) % 8) + 1
  })
  return { nodes, links, columns: last + 1 }
}

/** Key of the legend entry of `color`: the first node that wears it. */
const legendKey = (data: SankeyData, color: string): string =>
  (data.nodes ?? []).find((n) => n.color === color)?.name ?? color

function layout(options: SankeyOptions, ctx: RenderContext): Layout {
  const { width, height, fontSize, locale } = ctx
  const nodeWidth = Math.max(1, options.nodeWidth ?? 12)
  const nodePadding = Math.max(0, options.nodePadding ?? 16)
  // Right to left, the layout is worked out as its mirror image, then flipped.
  const { rtl } = ctx
  const area = innerRect(width, height, mirrorSides(insets(options.padding), rtl))
  const { nodes, links, columns } = graph(options.data, ctx.hidden, options.align !== 'left')
  const format = formatDetail(options.format, locale)

  // Labels take their room from the sides: the first column's to its left,
  // the last column's to its right, the rest to the right of their node.
  const texts = nodes.map((n) => [n.data.name, format(n.value)] as const)
  const widest = (match: (n: Node) => boolean) =>
    nodes.reduce((max, n, i) => {
      if (!match(n)) return max
      const [name, value] = texts[i] as readonly [string, string]
      return Math.max(max, estimateTextWidth(name, fontSize), estimateTextWidth(value, fontSize))
    }, 0)
  const cap = area.width * MAX_LABEL_SHARE
  const left =
    columns > 1
      ? Math.min(
          cap,
          widest((n) => n.column === 0),
        )
      : 0
  const right = Math.min(
    cap,
    widest((n) => n.column === columns - 1),
  )
  const plot: Rect = {
    x: area.x + (left ? left + LABEL_GAP : 0),
    y: area.y,
    width: Math.max(
      0,
      area.width - (left ? left + LABEL_GAP : 0) - (right ? right + LABEL_GAP : 0),
    ),
    height: area.height,
  }
  const step = columns > 1 ? (plot.width - nodeWidth) / (columns - 1) : 0

  // Heights: one scale for every column, so values compare across them.
  const byColumn: Node[][] = Array.from({ length: columns }, () => [])
  for (const n of nodes) byColumn[n.column]?.push(n)
  const pad = byColumn.reduce(
    (min, col) => (col.length > 1 ? Math.min(min, plot.height / 2 / (col.length - 1)) : min),
    nodePadding,
  )
  let k = Number.POSITIVE_INFINITY
  for (const col of byColumn) {
    const sum = col.reduce((s, n) => s + n.value, 0)
    if (sum > 0) k = Math.min(k, (plot.height - (col.length - 1) * pad) / sum)
  }
  if (!Number.isFinite(k) || k < 0) k = 0
  byColumn.forEach((col, c) => {
    const total = col.reduce((s, n) => s + n.value * k, 0) + (col.length - 1) * pad
    let y = plot.y + (plot.height - total) / 2
    for (const n of col) {
      const x = plot.x + (columns > 1 ? c * step : (plot.width - nodeWidth) / 2)
      n.x = rtl ? width - x - nodeWidth : x
      n.y = y
      n.height = n.value * k
      y += n.height + pad
    }
  })
  // Slices: flows leave and enter in the order of the node at the other end.
  for (const n of nodes) {
    let y = n.y
    for (const link of [...n.outs].sort((a, b) => a.target.y - b.target.y)) {
      link.sy = y
      link.width = link.data.value * k
      y += link.width
    }
    y = n.y
    for (const link of [...n.ins].sort((a, b) => a.source.y - b.source.y)) {
      link.ty = y
      y += link.data.value * k
    }
  }

  const labels = nodes.map((n, i): NodeLabel => {
    const [name, value] = texts[i] as readonly [string, string]
    const side: 'left' | 'right' = n.column === 0 && columns > 1 ? 'left' : 'right'
    const room =
      side === 'left' ? left : n.column === columns - 1 ? right : step - nodeWidth - LABEL_GAP * 2
    // Crowded columns keep only the names: the value line would run into the next label.
    const col = byColumn[n.column] as Node[]
    const at = col.indexOf(n)
    const neighbours = [col[at - 1], col[at + 1]].filter((o): o is Node => !!o)
    const spacing = neighbours.reduce(
      (min, o) => Math.min(min, (n.height + o.height) / 2 + pad),
      Number.POSITIVE_INFINITY,
    )
    const showValue = spacing >= fontSize * (1 + LINE_HEIGHT)
    return {
      side,
      name: truncate(name, room, fontSize),
      value: showValue ? truncate(value, room, fontSize) : '',
    }
  })
  if (rtl) plot.x = width - plot.x - plot.width
  return { nodes, links, plot, nodeWidth, labels }
}

/** The x of a link's ends: the facing edges of its source and its target. */
const linkEnds = (link: Link, nodeWidth: number): [number, number] =>
  link.source.x > link.target.x
    ? [link.source.x, link.target.x + nodeWidth]
    : [link.source.x + nodeWidth, link.target.x]

/** Path of a link: two cubic Béziers between the slices at its ends. */
function linkPath(link: Link, nodeWidth: number): string {
  const [x0, x1] = linkEnds(link, nodeWidth)
  const xm = (x0 + x1) / 2
  const { sy, ty, width } = link
  const p = (...v: number[]) => v.map(round).join(',')
  return `M${p(x0, sy)}C${p(xm, sy, xm, ty, x1, ty)}L${p(x1, ty + width)}C${p(xm, ty + width, xm, sy + width, x0, sy + width)}Z`
}

/** A point on a cubic Bézier with control points `a`, `b`, `c`, `d`. */
const cubic = (a: number, b: number, c: number, d: number, t: number): number => {
  const u = 1 - t
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}

/** Whether `(px, py)` lies inside the ribbon of `link`. */
function inLink(link: Link, nodeWidth: number, px: number, py: number): boolean {
  const [x0, x1] = linkEnds(link, nodeWidth)
  if (px < Math.min(x0, x1) || px > Math.max(x0, x1) || x0 === x1) return false
  const xm = (x0 + x1) / 2
  // x(t) is monotone, so bisection finds the t under the pointer.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (cubic(x0, xm, xm, x1, mid) < px === x1 > x0) lo = mid
    else hi = mid
  }
  const top = cubic(link.sy, link.sy, link.ty, link.ty, (lo + hi) / 2)
  return py >= top && py <= top + link.width
}

function renderSankey(options: SankeyOptions, ctx: RenderContext): ChildInput {
  const { nodes, links, plot, nodeWidth, labels } = layout(options, ctx)
  const drawn = links.filter((link) => link.data.value > 0)
  const formatValue = formatDetail(options.format, ctx.locale)

  const nodeMark = (n: Node) => ({
    d: `M0,0h${round(nodeWidth)}v${round(n.height)}h${round(-nodeWidth)}Z`,
    x: n.x,
    y: n.y,
  })
  const linkItem = (link: Link): HitItem => ({
    name: `${link.source.data.name} ${ctx.rtl ? '←' : '→'} ${link.target.data.name}`,
    seriesIndex: link.index,
    color: colorOf(link.source),
    value: link.data.value,
    text: formatValue(link.data.value),
    x: (link.source.x + nodeWidth + link.target.x) / 2,
    y: cubic(link.sy, link.sy, link.ty, link.ty, 0.5) + link.width / 2,
  })
  const hitNode = (n: Node, linkIndex?: number): Hit => {
    const own: HitItem = {
      name: n.data.name,
      seriesIndex: links.length + n.index,
      color: colorOf(n),
      value: n.value,
      text: formatValue(n.value),
      x: n.x + nodeWidth / 2,
      y: n.y + n.height / 2,
    }
    const flows = [...n.ins, ...n.outs].map(linkItem)
    const focused = flows.find((item) => item.seriesIndex === linkIndex)
    const link = focused && drawn.find((l) => l.index === linkIndex)
    return {
      index: n.index,
      label: n.data.name,
      title: '',
      x: own.x,
      area: plot,
      items: [own, ...flows],
      seriesIndex: focused ? linkIndex : own.seriesIndex,
      mark: link ? { d: linkPath(link, nodeWidth), x: 0, y: 0 } : nodeMark(n),
    }
  }
  const hitLink = (link: Link): Hit => {
    const item = linkItem(link)
    return {
      index: link.source.index,
      label: link.source.data.name,
      title: '',
      x: item.x,
      area: plot,
      items: [item],
      seriesIndex: link.index,
      mark: { d: linkPath(link, nodeWidth), x: 0, y: 0 },
    }
  }

  const interaction: Interaction = {
    count: nodes.length,
    hitTest(px, py) {
      const n = nodes.find(
        (n) =>
          px >= n.x - HOVER_SLOP &&
          px <= n.x + nodeWidth + HOVER_SLOP &&
          py >= n.y - HOVER_SLOP &&
          py <= n.y + n.height + HOVER_SLOP,
      )
      if (n) return hitNode(n)
      const link = drawn.find((l) => inLink(l, nodeWidth, px, py))
      return link ? hitLink(link) : null
    },
    hitIndex(index, seriesIndex) {
      const n = nodes[index]
      return n ? hitNode(n, seriesIndex) : null
    },
  }
  ctx.onHitTest(interaction)

  return [
    h(
      'g',
      { key: 'links', class: 'tc-sankey-links' },
      drawn.map((link) =>
        h('path', {
          key: `${link.source.data.name}→${link.target.data.name}#${link.index}`,
          class: ['tc-series', `tc-series-${link.source.slot}`, 'tc-sankey-link'],
          style: { '--tc-series-color': link.source.data.color },
          d: linkPath(link, nodeWidth),
        }),
      ),
    ),
    h(
      'g',
      { key: 'nodes', class: 'tc-sankey-nodes' },
      nodes.map((n) =>
        h(
          'g',
          {
            key: n.data.name,
            class: ['tc-series', `tc-series-${n.slot}`],
            'data-series': n.data.name,
            style: { '--tc-series-color': n.data.color },
          },
          h('rect', {
            class: 'tc-sankey-node',
            x: round(n.x),
            y: round(n.y),
            width: round(nodeWidth),
            height: round(n.height),
          }),
        ),
      ),
    ),
    h(
      'g',
      { key: 'labels', class: 'tc-sankey-labels', 'aria-hidden': 'true' },
      nodes.map((n, i) => {
        const label = labels[i]!
        if (!label.name && !label.value) return null
        // The label's side is the one of the left-to-right layout: mirrored with it.
        const before = (label.side === 'left') !== (ctx.rtl === true)
        const x = round(before ? n.x - LABEL_GAP : n.x + nodeWidth + LABEL_GAP)
        const y = round(n.y + n.height / 2)
        const anchor = before ? 'end' : 'start'
        return h(
          'g',
          { key: n.data.name, class: 'tc-sankey-label' },
          h(
            'text',
            {
              class: 'tc-value-label tc-sankey-name',
              x,
              y,
              dy: label.value ? '-0.25em' : '0.35em',
              'text-anchor': anchor,
            },
            label.name,
          ),
          label.value &&
            h(
              'text',
              {
                class: 'tc-tick-label tc-sankey-value',
                x,
                y,
                dy: '0.95em',
                'text-anchor': anchor,
              },
              label.value,
            ),
        )
      }),
    ),
  ]
}

/** One legend entry per custom color, named after the first node wearing it. */
function sankeyLegend(options: SankeyOptions): LegendItem[] {
  const seen = new Map<string, LegendItem>()
  for (const n of options.data.nodes ?? []) {
    if (n.color && !seen.has(n.color)) {
      const item: LegendItem = { key: n.name, name: n.name, index: seen.size, color: n.color }
      if (n.hidden) item.hidden = true
      seen.set(n.color, item)
    }
  }
  return [...seen.values()]
}

function sankeyTable(options: SankeyOptions, ctx: RenderContext): DataTable {
  const { links } = graph(options.data, ctx.hidden, true)
  const value = formatDetail(options.format, ctx.locale)
  return {
    columns: ['From', 'To', 'Value'],
    rows: links.map((link) => [link.data.from, link.data.to, value(link.data.value)]),
  }
}

/** Nodes and links from users, APIs and JSON, in the shape the layout expects. */
const cleanSankey = (data: unknown): unknown => {
  const d = isRecord(data) ? data : {}
  return {
    ...d,
    nodes: Array.isArray(d.nodes) ? records(d.nodes, (r) => named(r)) : undefined,
    links: records(d.links, (r) => ({
      from: text(r.from),
      to: text(r.to),
      value: Math.max(0, finite(r.value) ?? 0),
    })),
  }
}

/**
 * Sankey diagram: flows between nodes, as ribbons whose width is their
 * value. Nodes are made from the links (or declared, to set their order and
 * colors) and placed in columns by the longest path from a source.
 *
 * ```ts
 * new Chart('#el', {
 *   type: sankey,
 *   data: {
 *     links: [
 *       { from: 'Wages', to: 'Income', value: 60 },
 *       { from: 'Dividends', to: 'Income', value: 15 },
 *       { from: 'Income', to: 'Rent', value: 30 },
 *       { from: 'Income', to: 'Savings', value: 45 },
 *     ],
 *   },
 * })
 * ```
 */
export const sankey: ChartType<SankeyOptions> = {
  name: 'sankey',
  clean: cleanData(cleanSankey),
  render: renderSankey,
  legend: sankeyLegend,
  table: sankeyTable,
}
