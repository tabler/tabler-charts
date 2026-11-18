import type { DataTable } from '../a11y.ts'
import type { ChartType, RenderContext } from '../chart.ts'
import { formatNumber, getNumberFormat, type NumberFormat } from '../format.ts'
import type { Hit, HitItem, Interaction } from '../interaction.ts'
import { type InsetsInput, innerRect, insets, round } from '../layout.ts'
import { DEG } from '../shapes/arc.ts'
import { type ChildInput, type ClassValue, h } from '../vnode.ts'
import { cleanData, finite, named, records } from './clean.ts'
import { groupAttrs, keyOf, legendItems } from './named.ts'

/** One party (or group) of a parliament. */
export interface ParliamentParty {
  name: string
  /** Seats won; a fraction is rounded, a negative count is zero. */
  seats: number
  /** Stable identity for keyed updates and legend toggles. Defaults to `name`. */
  id?: string
  /**
   * Custom color; overrides the palette slot via `--tc-series-color`.
   * Values that could inject CSS (`;`, quotes, `url()` …) are ignored, so colors from user data are safe.
   */
  color?: string
  /** Extra classes on the party group. */
  class?: ClassValue
  /** Start hidden (toggle it back from the legend). */
  hidden?: boolean
}

export interface ParliamentOptions {
  /** Parties in their order along the benches, from the left. */
  data: readonly ParliamentParty[]
  /**
   * Seats in the house. Defaults to the parties' sum; more than that leaves
   * vacant seats, drawn empty after the last party.
   */
  total?: number
  /** Rows of seats. Defaults to the fewest rows that seat everyone comfortably. */
  rows?: number
  /** Where the benches start, in degrees clockwise from 12 o'clock. Defaults to `-angle / 2`. */
  startAngle?: number
  /** Degrees the benches span, `0…360`. Defaults to `180` (a hemicycle). */
  angle?: number
  /** Radius of the innermost row relative to the outermost, `0…0.95`. Defaults to `0.45`. */
  innerRadius?: number
  /** Space between seats as a share of their pitch, `0…0.9`. Defaults to `0.35`. */
  gap?: number
  /** Format of the seat counts (tooltip, table, center). */
  format?: NumberFormat
  /**
   * Text in the middle: the number of seats by default; `false` hides it, or
   * give your own `value` / `label` (the label sits above the value).
   */
  center?: false | { value?: string; label?: string }
  /** Extra space around the chart, in pixels. */
  padding?: InsetsInput
}

/** The most seats a house can have: enough for any parliament, few enough to draw. */
const MAX_SEATS = 5000

interface Party {
  data: ParliamentParty
  index: number
  seats: number
  /** Slot among the visible parties, from the left. */
  position: number
}

/** A seat in units of the outer radius, before the chart is placed. */
interface Seat {
  x: number
  y: number
  angle: number
  row: number
}

interface Layout {
  seats: Seat[]
  /** Radius of a seat, in units of the outer radius. */
  dot: number
  /** Outline of the benches, in units of the outer radius. */
  box: { x0: number; y0: number; x1: number; y1: number }
}

function partiesOf(options: ParliamentOptions, hidden: ReadonlySet<string>): Party[] {
  return options.data
    .map((data, index) => ({
      data,
      index,
      seats: Math.min(MAX_SEATS, Math.max(0, Math.round(data.seats || 0))),
    }))
    .filter((party) => !hidden.has(keyOf(party.data)))
    .map((party, position) => ({ ...party, position }))
}

/** Seats of the house: the visible parties', and the vacant ones up to `total`. */
function seatCounts(
  options: ParliamentOptions,
  parties: readonly Party[],
): { taken: number; total: number } {
  const taken = Math.min(
    MAX_SEATS,
    parties.reduce((sum, party) => sum + party.seats, 0),
  )
  const wanted = Math.min(MAX_SEATS, Math.round(options.total ?? 0))
  // biome-ignore lint/complexity/useMathMinMax: the ternary also turns a NaN `total` into 0, Math.max would not
  return { taken, total: Math.max(taken, wanted > 0 ? wanted : 0) }
}

/** Seats per row, proportional to each row's length so the angular pitch is the same everywhere. */
function distribute(total: number, radii: readonly number[]): number[] {
  const sum = radii.reduce((a, r) => a + r, 0)
  const counts = radii.map((r) => Math.floor((total * r) / sum))
  let left = total - counts.reduce((a, n) => a + n, 0)
  // The remainder goes to the rows that lost most in rounding, outer rows first.
  const order = radii
    .map((r, i) => ({ i, lost: (total * r) / sum - counts[i]! }))
    .sort((a, b) => b.lost - a.lost || b.i - a.i)
  for (const { i } of order) {
    if (left <= 0) break
    counts[i] = counts[i]! + 1
    left--
  }
  return counts
}

/**
 * The seats of `total` places on `rows` concentric arcs (the fewest rows
 * that fit when not given), sorted by angle so parties take contiguous
 * wedges, in units of the outer radius.
 */
function layoutSeats(
  total: number,
  rows: number | undefined,
  start: number,
  span: number,
  inner: number,
  gap: number,
): Layout {
  const box = { x0: 0, y0: 0, x1: 0, y1: 0 }
  if (total <= 0) return { seats: [], dot: 0, box }
  const depth = 1 - inner
  // On a closed ring the last seat would land on the first: one step less.
  const closed = span >= Math.PI * 2 - 1e-9
  const radiiOf = (n: number) =>
    Array.from({ length: n }, (_, i) => (n > 1 ? inner + (i * depth) / (n - 1) : 1))
  // Pitch between rows; a single row is as deep as the ring is.
  const pitchOf = (n: number) => (n > 1 ? depth / (n - 1) : depth)
  // How many seats `n` rows hold at the row pitch along each arc.
  const capacity = (n: number) => {
    const pitch = pitchOf(n)
    return radiiOf(n).reduce((sum, r) => sum + Math.floor((r * span) / pitch) + (closed ? 0 : 1), 0)
  }
  let n = rows && rows > 0 ? Math.min(Math.round(rows), total) : 1
  if (!rows) while (n < total && capacity(n) < total) n++
  const radii = radiiOf(n)
  const pitch = pitchOf(n)
  const counts = distribute(total, radii)
  const seats: Seat[] = []
  // Seats are as far apart as the tightest row's neighbors, or the rows.
  let spacing = n > 1 ? pitch : Number.POSITIVE_INFINITY
  radii.forEach((r, row) => {
    const count = counts[row]!
    const step = count > 1 ? span / (closed ? count : count - 1) : 0
    if (count > 1) spacing = Math.min(spacing, r * step)
    for (let k = 0; k < count; k++) {
      const angle = count > 1 ? start + k * step : start + span / 2
      seats.push({ x: r * Math.sin(angle), y: -r * Math.cos(angle), angle, row })
    }
  })
  seats.sort((a, b) => a.angle - b.angle || a.row - b.row)
  const dot = (Number.isFinite(spacing) ? spacing : depth) * (1 - gap) * 0.5
  for (const seat of seats) {
    box.x0 = Math.min(box.x0, seat.x - dot)
    box.x1 = Math.max(box.x1, seat.x + dot)
    box.y0 = Math.min(box.y0, seat.y - dot)
    box.y1 = Math.max(box.y1, seat.y + dot)
  }
  return { seats, dot, box }
}

function renderParliament(options: ParliamentOptions, ctx: RenderContext): ChildInput {
  const { width, height, locale } = ctx
  const area = innerRect(width, height, insets(options.padding, 0))
  const span = Math.min(360, Math.max(0, options.angle ?? 180)) * DEG
  const start = (options.startAngle ?? -(span / DEG) / 2) * DEG
  const inner = Math.min(0.95, Math.max(0, options.innerRadius ?? 0.45))
  const gap = Math.min(0.9, Math.max(0, options.gap ?? 0.35))
  const parties = partiesOf(options, ctx.hidden)
  const { taken, total } = seatCounts(options, parties)
  const layout = layoutSeats(total, options.rows, start, span, inner, gap)

  // The text in the middle: inside the open side of a hemicycle, else around the center.
  const center = options.center
  const showCenter = center !== false
  const centerLabel = showCenter ? center?.label : undefined
  const open = span <= Math.PI + 1e-9 && Math.abs(start + span / 2) < 1e-9
  const em = ctx.fontSize
  // (The value is 1.75em tall; on the open side its label sits above it.)
  const textTop = showCenter ? (open ? -(centerLabel ? 3.4 : 2.1) * em : -1.4 * em) : 0
  const textBottom = showCenter ? (open ? 0 : (centerLabel ? 2 : 0.7) * em) : 0

  // Radius that fits the benches and the text: the text does not scale, so converge.
  let outer = Math.min(area.width, area.height) / 2
  let box = { x0: 0, y0: 0, x1: 0, y1: 0 }
  for (let i = 0; i < 4 && outer > 0; i++) {
    box = {
      x0: Math.min(layout.box.x0 * outer, 0),
      y0: Math.min(layout.box.y0 * outer, textTop),
      x1: Math.max(layout.box.x1 * outer, 0),
      y1: Math.max(layout.box.y1 * outer, textBottom),
    }
    const scale = Math.min(area.width / (box.x1 - box.x0), area.height / (box.y1 - box.y0))
    if (Math.abs(scale - 1) < 1e-3) break
    outer = Math.max(0, outer * scale)
  }
  const cx = area.x + (area.width - (box.x1 - box.x0)) / 2 - box.x0
  const cy = area.y + (area.height - (box.y1 - box.y0)) / 2 - box.y0
  const dot = round(layout.dot * outer)
  const at = (seat: Seat) => [cx + seat.x * outer, cy + seat.y * outer] as const

  // Parties take the seats in order from the left; the vacant ones come last.
  let next = 0
  const seatsOf = parties.map((party) => {
    const from = next
    next += party.seats
    return layout.seats.slice(from, next)
  })
  const vacant = layout.seats.slice(taken, total)
  const drawn = parties.filter((party) => party.seats > 0)

  const value = formatNumber(options.format, locale)
  const share = getNumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })
  const hitFor = (party: Party, seat?: Seat): Hit => {
    const seats = seatsOf[party.position] as Seat[]
    let x = 0
    let y = 0
    if (seat) [x, y] = at(seat)
    else {
      for (const s of seats) {
        const [sx, sy] = at(s)
        x += sx / seats.length
        y += sy / seats.length
      }
    }
    const item: HitItem = {
      name: party.data.name,
      seriesIndex: party.index,
      value: party.seats,
      text: `${value(party.seats)} (${share.format(total > 0 ? party.seats / total : 0)})`,
      x,
      y,
    }
    if (party.data.color) item.color = party.data.color
    // A halo around every seat of the party.
    const r = dot + 3
    const d = seats
      .map((s) => {
        const [sx, sy] = at(s)
        return `M${round(sx + r)},${round(sy)}A${r},${r},0,1,1,${round(sx - r)},${round(sy)}A${r},${r},0,1,1,${round(sx + r)},${round(sy)}Z`
      })
      .join('')
    return {
      index: drawn.indexOf(party),
      label: party.data.name,
      title: '',
      x,
      area: { x: cx - outer, y: cy - outer, width: outer * 2, height: outer * 2 },
      items: [item],
      seriesIndex: party.index,
      mark: { d, x: 0, y: 0 },
    }
  }

  const interaction: Interaction = {
    count: drawn.length,
    hitIndex: (position) => {
      const party = drawn[position]
      return party ? hitFor(party) : null
    },
    hitTest(px, py) {
      const reach = dot + 2
      let best: { party: Party; seat: Seat; d: number } | undefined
      for (const party of drawn) {
        for (const seat of seatsOf[party.position] as Seat[]) {
          const [x, y] = at(seat)
          const d = Math.hypot(px - x, py - y)
          if (d <= reach && (!best || d < best.d)) best = { party, seat, d }
        }
      }
      return best ? hitFor(best.party, best.seat) : null
    },
  }
  ctx.onHitTest(interaction)

  const circle = (seat: Seat, key: number, cls: string) => {
    const [x, y] = at(seat)
    return h('circle', {
      key,
      class: cls,
      r: dot,
      style: `transform:translate(${round(x - cx)}px,${round(y - cy)}px)`,
    })
  }
  const groups = parties.map((party) =>
    h(
      'g',
      groupAttrs(party.data, party.index),
      (seatsOf[party.position] as Seat[]).map((seat, i) => circle(seat, i, 'tc-seat')),
    ),
  )

  const centerValue = showCenter ? (center?.value ?? value(total)) : ''

  return [
    // Seats sit in their own group: the entrance animation transforms it, not the translated parent.
    h(
      'g',
      { class: 'tc-parliament', style: `transform:translate(${round(cx)}px,${round(cy)}px)` },
      h(
        'g',
        { class: 'tc-parliament-seats' },
        groups,
        vacant.length > 0 &&
          h(
            'g',
            { key: 'vacant', class: 'tc-parliament-vacant' },
            vacant.map((seat, i) => circle(seat, i, 'tc-seat tc-seat-vacant')),
          ),
      ),
    ),
    showCenter &&
      h(
        'g',
        { class: 'tc-parliament-center', 'aria-hidden': 'true' },
        centerLabel &&
          h(
            'text',
            {
              class: 'tc-parliament-label',
              x: round(cx),
              y: round(cy),
              dy: open ? '-2.5em' : '1.6em',
              'text-anchor': 'middle',
            },
            centerLabel,
          ),
        h(
          'text',
          {
            class: 'tc-parliament-value',
            x: round(cx),
            y: round(cy),
            dy: open ? '-0.4em' : centerLabel ? '0' : '0.35em',
            'text-anchor': 'middle',
          },
          centerValue,
        ),
      ),
  ]
}

function parliamentTable(options: ParliamentOptions, ctx: RenderContext): DataTable {
  const parties = partiesOf(options, ctx.hidden)
  const { total } = seatCounts(options, parties)
  const value = formatNumber(options.format, ctx.locale)
  const share = getNumberFormat(ctx.locale, { style: 'percent', maximumFractionDigits: 1 })
  return {
    columns: ['', 'Seats', 'Share'],
    rows: parties.map((party) => [
      party.data.name,
      value(party.seats),
      share.format(total > 0 ? party.seats / total : 0),
    ]),
  }
}

/**
 * Parliament chart: the seats of a house as dots on concentric benches, a
 * hemicycle by default, each party a wedge of them in data order from the
 * left, with the number of seats in the middle.
 *
 * ```ts
 * new Chart('#el', {
 *   type: parliament,
 *   data: [{ name: 'Left', seats: 135 }, { name: 'Right', seats: 57 }, { name: 'Other', seats: 7 }],
 * })
 * ```
 */
export const parliament: ChartType<ParliamentOptions> = {
  name: 'parliament',
  clean: cleanData((data) => records(data, (r) => ({ ...named(r), seats: finite(r.seats) ?? 0 }))),
  render: renderParliament,
  legend: (options) => legendItems(options.data),
  table: parliamentTable,
}
