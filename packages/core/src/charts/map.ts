import type { ChartType, DataTable, RenderContext } from '../chart.ts'
import { formatNumber, type NumberFormat } from '../format.ts'
import type { Hit, Interaction } from '../interaction.ts'
import {
  estimateTextWidth,
  type InsetsInput,
  innerRect,
  insets,
  LINE_HEIGHT,
  round,
} from '../layout.ts'
import { mapInteraction } from '../plugins/map.ts'
import { h, type StyleValue, type VNode } from '../vnode.ts'
import { finite, isRecord, list, records, text } from './clean.ts'
import { fitView, type MapLayout, type MapView } from './map-view.ts'

export type { MapLayout, MapView }

/** One region of a map (a country, a state …). */
export interface MapRegion {
  name: string
  /**
   * SVG path data in the coordinates of the map (`M`, `L`, `H`, `V` and `Z`,
   * absolute or relative; curves are drawn but not hit by the pointer).
   */
  path: string
  /** Too small for a shape at the scale of the map: `path` is a single point, drawn as a dot when it has a value. */
  point?: boolean
}

/** A map: shapes already projected into a `width` × `height` box, as the files in `@tabler/charts/maps/*` are. */
export interface MapData {
  width: number
  height: number
  /** How the shapes were projected, to place a marker by its coordinates. */
  projection?: { type: 'miller'; scale: number; translate: readonly number[] }
  /** Regions by their code, e.g. ISO 3166-1 alpha-2 for countries. */
  regions: Readonly<Record<string, MapRegion>>
}

/** A place on the map, by its coordinates. */
export interface MapMarker {
  /** Shown in the tooltip, and what a line refers to. */
  name?: string
  /** Latitude and longitude in degrees. */
  lat: number
  lng: number
}

/** A curve between two markers, by their names. */
export interface MapLine {
  from: string
  to: string
}

export interface MapOptions {
  /** The map: a map file (`import { world } from '@tabler/charts/maps/world'`), or the name it was given with `addMap()`. */
  map: MapData | string
  /** A value per region code, e.g. `{ PL: 80, DE: 45 }`. Regions without one keep the empty shade. */
  data: Readonly<Record<string, number | null>>
  /** Value shown with the lightest shade (or the first color). Defaults to the smaller of `0` and the data minimum. */
  min?: number
  /** Value shown with the full color (or the last color). Defaults to the data maximum. */
  max?: number
  /**
   * A continuous scale through two or more colors (any CSS color, including
   * `var(--tc-…)`), from `min` to `max`, instead of one hue (`--tc-heat-color`).
   * Values that could inject CSS are ignored, as for series colors.
   */
  colors?: readonly string[]
  /** Value placed on the middle color of `colors` (e.g. `0` for changes). Defaults to halfway. */
  mid?: number
  /** Places drawn as dots over the map. */
  markers?: readonly MapMarker[]
  /** Dashed curves between markers. */
  lines?: readonly MapLine[]
  /** Radius of the markers and of the regions drawn as a dot, in pixels. Defaults to `4`. */
  markerRadius?: number
  /** Format of the values (tooltip, scale, table). */
  format?: NumberFormat
  /**
   * The bar below the map with the lowest and the highest value: `false`
   * hides it, an object names its ends instead of the values.
   */
  scale?: boolean | { low?: string; high?: string }
  /** Extra space around the map, in pixels. */
  padding?: InsetsInput
  /**
   * Let the map be magnified with its buttons, the wheel, a double click, a
   * pinch or the `+` and `-` keys, and dragged around. An object sets the
   * most it magnifies (`max`, `8` by default), turns the wheel off
   * (`wheel: false`) and names the buttons (`labels`).
   */
  zoom?: boolean | { max?: number; wheel?: boolean; labels?: { in?: string; out?: string } }
  /**
   * The part of the map in sight. Zooming and dragging write it; set it
   * yourself to start on a part of the map, leave it out for the whole map.
   */
  view?: Partial<MapView>
  /**
   * Let regions be selected with a click (or Enter on the region the
   * keyboard is on): one at a time, or any number of them. A click on a
   * selected region takes it out again.
   */
  select?: 'single' | 'multiple'
  /** Codes of the selected regions. Selecting writes it; `onSelect` hears of it. */
  selected?: readonly string[]
  /** Called when a click or a key changes the selection, with the codes now selected and the one that changed. */
  onSelect?: (selected: string[], code: string) => void
}

/** A hit of a map: what it is on. */
export interface MapHit extends Hit {
  /** Code of the region, for a hit on a region. */
  region?: string
  /** Name of the marker, for a hit on a marker. */
  marker?: string
}

/** The interaction of a map, with where the map was drawn. */
export interface MapInteraction extends Interaction {
  map: MapLayout
}

/** The selected regions of the options that are allowed: one when only one can be selected. */
export const selectedOf = (options: MapOptions): readonly string[] =>
  options.select === 'multiple'
    ? (options.selected ?? [])
    : options.select === 'single'
      ? (options.selected ?? []).slice(0, 1)
      : []

/** Share of the full color at the minimum, so the lowest value still stands out from a region without one. */
const FLOOR = 0.1
const EMPTY = 'var(--tc-heat-empty,var(--tc-grid-color))'
const MARKER = 'var(--tc-map-marker-color,var(--tc-color-1))'
/** Slices of the scale's bar: enough to read as one smooth gradient. */
const SCALE_STEPS = 24
const SCALE_STEP = 5
const SCALE_HEIGHT = 8
/** How far a line bends away from the straight one, as a share of its length. */
const LINE_CURVE = 0.2
const RADIANS = Math.PI / 180

const maps: Record<string, MapData> = {}

/** Register a map under a name, so `map: 'world'` finds it (configs from JSON, `<tabler-chart>`, the data API). */
export function addMap(name: string, data: MapData): void {
  maps[name] = data
}

const isMap = (v: unknown): v is MapData =>
  isRecord(v) && isRecord(v.regions) && (finite(v.width) ?? 0) > 0 && (finite(v.height) ?? 0) > 0

/** A region ready to draw and to hit: its rings as flat `x, y` lists in map coordinates. */
interface Shape {
  code: string
  name: string
  path: string
  point: boolean
  rings: number[][]
  /** Bounds of the shape: left, top, right, bottom. */
  box: [number, number, number, number]
  /** Middle of the largest ring (the mainland), where the keyboard's tooltip sits. */
  x: number
  y: number
}

/** Rings of path data made of moves and straight lines. */
function parsePath(d: string): number[][] {
  const rings: number[][] = []
  let ring: number[] = []
  let x = 0
  let y = 0
  for (const [, command = '', args = ''] of d.matchAll(/([MLHVZ])([^MLHVZ]*)/gi)) {
    const n = (args.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number)
    const relative = command >= 'a'
    const type = command.toUpperCase()
    if (type === 'Z') {
      if (ring.length) {
        x = ring[0] as number
        y = ring[1] as number
      }
      continue
    }
    const step = type === 'H' || type === 'V' ? 1 : 2
    for (let i = 0; i + step <= n.length; i += step) {
      const a = n[i] as number
      const b = n[i + 1] as number
      if (type === 'H') x = relative ? x + a : a
      else if (type === 'V') y = relative ? y + a : a
      else {
        x = relative ? x + a : a
        y = relative ? y + b : b
      }
      // A move starts a ring; the pairs after its first are lines.
      if (type === 'M' && i === 0) {
        ring = []
        rings.push(ring)
      }
      ring.push(x, y)
    }
  }
  return rings
}

const parsed = new WeakMap<MapData, Map<string, Shape>>()

/** The regions of a map, parsed once per map file. */
function shapesOf(map: MapData): Map<string, Shape> {
  let shapes = parsed.get(map)
  if (shapes) return shapes
  shapes = new Map()
  for (const [code, region] of Object.entries(map.regions)) {
    if (!isRecord(region) || typeof region.path !== 'string') continue
    const rings = parsePath(region.path).filter((ring) => ring.every(Number.isFinite))
    const box: Shape['box'] = [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]
    let x = 0
    let y = 0
    let largest = -1
    for (const ring of rings) {
      let x0 = Number.POSITIVE_INFINITY
      let y0 = Number.POSITIVE_INFINITY
      let x1 = Number.NEGATIVE_INFINITY
      let y1 = Number.NEGATIVE_INFINITY
      for (let i = 0; i < ring.length; i += 2) {
        x0 = Math.min(x0, ring[i] as number)
        x1 = Math.max(x1, ring[i] as number)
        y0 = Math.min(y0, ring[i + 1] as number)
        y1 = Math.max(y1, ring[i + 1] as number)
      }
      box[0] = Math.min(box[0], x0)
      box[1] = Math.min(box[1], y0)
      box[2] = Math.max(box[2], x1)
      box[3] = Math.max(box[3], y1)
      const size = (x1 - x0) * (y1 - y0)
      if (size > largest) {
        largest = size
        x = (x0 + x1) / 2
        y = (y0 + y1) / 2
      }
    }
    if (largest < 0) continue
    shapes.set(code, {
      code,
      name: text(region.name) || code,
      path: region.path,
      point: region.point === true,
      rings,
      box,
      x,
      y,
    })
  }
  parsed.set(map, shapes)
  return shapes
}

/** Whether a point lies inside the rings (even-odd, so a hole is outside). */
function inside(rings: readonly number[][], x: number, y: number): boolean {
  let hit = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const xi = ring[i] as number
      const yi = ring[i + 1] as number
      const xj = ring[j] as number
      const yj = ring[j + 1] as number
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
    }
  }
  return hit
}

/** Path of a circle, for the ring around a hovered dot. */
const circlePath = (x: number, y: number, r: number): string =>
  `M${round(x - r)} ${round(y)}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`

/** What the pointer and the keyboard can land on. */
interface Entry {
  shape?: Shape
  marker?: { name: string; x: number; y: number }
  value: number | null
}

function renderMap(options: MapOptions, ctx: RenderContext) {
  const { width, height, fontSize, locale } = ctx
  if (typeof options.map === 'string' && !maps[options.map]) {
    throw new Error(
      `[tabler-charts] Map "${options.map}" is not registered. Import it (e.g. from '@tabler/charts/maps/world') and call addMap('${options.map}', data).`,
    )
  }
  const map = typeof options.map === 'string' ? maps[options.map] : options.map
  if (!isMap(map)) return null
  const shapes = shapesOf(map)
  const data = options.data ?? {}
  const value = formatNumber(options.format, locale)
  const radius = Math.max(0, finite(options.markerRadius) ?? 4)

  // Regions with a value, in the order of the data (the order the keyboard walks).
  const entries: Entry[] = []
  const indexOf = new Map<Shape, number>()
  let dataMin = Number.POSITIVE_INFINITY
  let dataMax = Number.NEGATIVE_INFINITY
  for (const code of Object.keys(data)) {
    const shape = shapes.get(code)
    const v = finite(data[code])
    if (!shape || v === null) continue
    indexOf.set(shape, entries.length)
    entries.push({ shape, value: v })
    if (v < dataMin) dataMin = v
    if (v > dataMax) dataMax = v
  }
  const valued = entries.length

  // Color domain and the scale of colors.
  const lo = finite(options.min) ?? (valued ? Math.min(0, dataMin) : 0)
  const hi = finite(options.max) ?? (valued ? dataMax : 1)
  const stops = options.colors && options.colors.length >= 2 ? options.colors : undefined
  const mid = finite(options.mid)
  /** Position of a value in the domain, 0…1 (through `mid` for a scale with a middle). */
  const position = (v: number) => {
    const t =
      stops && mid !== null && lo < mid && mid < hi
        ? v <= mid
          ? ((v - lo) / (mid - lo)) * 0.5
          : 0.5 + ((v - mid) / (hi - mid)) * 0.5
        : hi > lo
          ? (v - lo) / (hi - lo)
          : v > lo
            ? 1
            : 0
    return Math.min(1, Math.max(0, t))
  }
  /** How a region at position `t` of the scale is painted: its style and the tooltip swatch. */
  const paint = (t: number): { style: StyleValue; color: string } => {
    if (stops) {
      const at = t * (stops.length - 1)
      const k = Math.min(stops.length - 2, Math.floor(at))
      const u = round((at - k) * 100)
      const from = stops[k] as string
      const color =
        u <= 0
          ? from
          : u >= 100
            ? (stops[k + 1] as string)
            : `color-mix(in oklab,${stops[k + 1]} ${u}%,${from})`
      return { style: { '--tc-cell-fill': color }, color }
    }
    const pct = round((FLOOR + (1 - FLOOR) * t) * 100)
    return {
      style: `--tc-heat:${pct}%`,
      color: `color-mix(in oklab,var(--tc-heat-color,var(--tc-color-1)) ${pct}%,${EMPTY})`,
    }
  }

  // The map keeps its proportions, centered in the room above the scale.
  const pad = insets(options.padding, 0)
  const scale = options.scale !== false && valued > 0
  const scaleHeight = scale ? Math.ceil(fontSize * LINE_HEIGHT) + 8 : 0
  const area = innerRect(width, height, { ...pad, bottom: pad.bottom + scaleHeight })
  const zoom = typeof options.zoom === 'object' ? options.zoom : {}
  const layout: MapLayout = {
    ...area,
    k: Math.max(0, Math.min(area.width / map.width, area.height / map.height)),
    mapWidth: map.width,
    mapHeight: map.height,
    max: Math.max(1, finite(zoom.max) ?? 8),
  }
  const view = fitView(options.view, layout)
  // (`k` is pixels per unit of the map as it is drawn, magnified by the view.)
  const k = Math.round(layout.k * view.scale * 1e4) / 1e4
  const tx = round(area.x - view.x * k)
  const ty = round(area.y - view.y * k)
  const px = (x: number) => tx + x * k
  const py = (y: number) => ty + y * k
  // A magnified map is cut at the edges of its room.
  const clipped = view.scale > 1
  const selected = new Set(selectedOf(options))

  // Markers, placed with the projection the map file was made with.
  const { projection } = map
  const project =
    isRecord(projection) &&
    finite(projection.scale) !== null &&
    Array.isArray(projection.translate) &&
    projection.translate.slice(0, 2).every((n) => finite(n) !== null)
      ? (lng: number, lat: number): [number, number] => [
          px(lng * RADIANS * projection.scale + (projection.translate[0] as number)),
          py(
            (projection.translate[1] as number) -
              1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * RADIANS)) * projection.scale,
          ),
        ]
      : undefined
  const markers: NonNullable<Entry['marker']>[] = []
  if (project && k > 0) {
    for (const marker of options.markers ?? []) {
      const [x, y] = project(marker.lng, marker.lat)
      if (Number.isFinite(x) && Number.isFinite(y)) markers.push({ name: marker.name ?? '', x, y })
    }
  }
  const firstMarker = entries.length
  for (const marker of markers) entries.push({ marker, value: null })
  // Regions without a value are not walked by the keyboard, but still name themselves on hover.
  const count = entries.length
  for (const shape of shapes.values()) {
    if (shape.point || indexOf.has(shape)) continue
    indexOf.set(shape, entries.length)
    entries.push({ shape, value: null })
  }

  const hitAt = (i: number): MapHit | null => {
    const entry = entries[i]
    if (!entry) return null
    const { shape, marker } = entry
    const dot = marker ?? (shape?.point ? { x: px(shape.x), y: py(shape.y) } : undefined)
    const x = dot?.x ?? px(shape?.x ?? 0)
    const y = dot?.y ?? py(shape?.y ?? 0)
    const name = marker?.name ?? shape?.name ?? ''
    const v = entry.value
    return {
      index: i,
      label: shape?.code ?? name,
      ...(shape ? { region: shape.code } : { marker: name }),
      // One row, "■ Poland 80": a region without a value and a marker only name themselves.
      title: '',
      x,
      area,
      items: [
        {
          name,
          seriesIndex: 0,
          value: v,
          text: v === null ? '' : value(v),
          x,
          y,
          color: marker ? MARKER : v === null ? EMPTY : paint(position(v)).color,
        },
      ],
      mark: {
        d: dot
          ? circlePath(dot.x, dot.y, radius + 3)
          : (shape?.rings ?? [])
              .map((ring) => {
                let d = ''
                for (let p = 0; p < ring.length; p += 2)
                  d += `${p ? 'L' : 'M'}${Math.round(px(ring[p] as number) * 10) / 10} ${Math.round(py(ring[p + 1] as number) * 10) / 10}`
                return `${d}Z`
              })
              .join(''),
        x: 0,
        y: 0,
      },
    }
  }

  const interaction: MapInteraction = {
    count,
    map: layout,
    hitIndex: hitAt,
    hitTest(x, y) {
      if (!(k > 0)) return null
      if (x < area.x || x > area.x + area.width || y < area.y || y > area.y + area.height)
        return null
      const near = (dot: { x: number; y: number }) => Math.hypot(dot.x - x, dot.y - y) <= radius + 4
      // What is drawn on top is hit first: markers, then dots, then shapes.
      for (let i = count - 1; i >= firstMarker; i--)
        if (near(entries[i]?.marker as { x: number; y: number })) return hitAt(i)
      for (let i = 0; i < valued; i++) {
        const shape = entries[i]?.shape as Shape
        if (shape.point && near({ x: px(shape.x), y: py(shape.y) })) return hitAt(i)
      }
      const mx = (x - tx) / k
      const my = (y - ty) / k
      for (const [shape, i] of indexOf) {
        const [x0, y0, x1, y1] = shape.box
        if (shape.point || mx < x0 || mx > x1 || my < y0 || my > y1) continue
        if (inside(shape.rings, mx, my)) return hitAt(i)
      }
      return null
    },
  }
  ctx.onHitTest(interaction)

  const regions: VNode[] = []
  // A selected shape goes in after the others, where nothing covers its outline.
  const raised: VNode[] = []
  const points: VNode[] = []
  for (const shape of shapes.values()) {
    const i = indexOf.get(shape)
    const v = i === undefined ? null : (entries[i]?.value ?? null)
    const style = v === null ? undefined : paint(position(v)).style
    const chosen = selected.has(shape.code) && 'tc-region-selected'
    if (!shape.point) {
      ;(chosen ? raised : regions).push(
        h('path', {
          key: shape.code,
          class: ['tc-region', v === null ? 'tc-region-empty' : 'tc-cell', chosen],
          'data-region': shape.code,
          d: shape.path,
          style,
        }),
      )
    } else if (v !== null) {
      // A country too small for a shape says nothing without a value, so only then is it drawn.
      points.push(
        h('circle', {
          key: shape.code,
          class: ['tc-region tc-region-point tc-cell', chosen],
          'data-region': shape.code,
          cx: round(px(shape.x)),
          cy: round(py(shape.y)),
          r: radius,
          style,
        }),
      )
    }
  }

  // Lines go in before the markers, so the markers sit on top of their ends.
  const byName = new Map(markers.map((marker) => [marker.name, marker]))
  const lines = (options.lines ?? []).flatMap((line, i) => {
    const from = byName.get(line.from)
    const to = byName.get(line.to)
    if (!from || !to) return []
    // A curve through a point pushed sideways from the middle of the line.
    const cx = (from.x + to.x) / 2 + (to.y - from.y) * LINE_CURVE
    const cy = (from.y + to.y) / 2 - (to.x - from.x) * LINE_CURVE
    return h('path', {
      key: `${line.from}›${line.to}›${i}`,
      class: 'tc-map-line',
      d: `M${round(from.x)} ${round(from.y)}Q${round(cx)} ${round(cy)} ${round(to.x)} ${round(to.y)}`,
    })
  })

  // The scale, centered below the map: the lowest value, a bar of the colors, the highest.
  const scaleText = typeof options.scale === 'object' ? options.scale : {}
  const low = scaleText.low ?? value(lo)
  const high = scaleText.high ?? value(hi)
  const lowWidth = estimateTextWidth(low, fontSize)
  const barWidth = SCALE_STEPS * SCALE_STEP
  const scaleWidth = lowWidth + 8 + barWidth + 8 + estimateTextWidth(high, fontSize)
  const scaleX = Math.round(area.x + Math.max(0, (area.width - scaleWidth) / 2))
  const barX = Math.round(scaleX + lowWidth + 8)
  const scaleY = area.y + area.height + 8 + (scaleHeight - 8) / 2

  const selectable = options.select === 'single' || options.select === 'multiple'
  const clip = `${ctx.id}-map`

  return [
    clipped &&
      h(
        'clipPath',
        { key: 'clip', id: clip },
        h('rect', { x: area.x, y: area.y, width: area.width, height: area.height }),
      ),
    h(
      'g',
      {
        key: 'map',
        class: ['tc-map', selectable && 'tc-map-selectable'],
        'clip-path': clipped ? `url(#${clip})` : undefined,
      },
      k > 0 &&
        h(
          'g',
          {
            key: 'regions',
            class: 'tc-map-regions',
            transform: `translate(${tx} ${ty}) scale(${k})`,
          },
          regions,
          raised,
        ),
      h('g', { key: 'points', class: 'tc-map-points' }, points),
      h('g', { key: 'lines', class: 'tc-map-lines' }, lines),
      h(
        'g',
        { key: 'markers', class: 'tc-map-markers' },
        markers.map((marker, i) =>
          h('circle', {
            key: `${marker.name}›${i}`,
            class: 'tc-map-marker',
            'data-marker': marker.name,
            cx: round(marker.x),
            cy: round(marker.y),
            r: radius,
          }),
        ),
      ),
    ),
    scale &&
      h(
        'g',
        // (Crisp edges: the slices of the bar meet without a seam.)
        {
          key: 'scale',
          class: 'tc-map-scale',
          'aria-hidden': 'true',
          'shape-rendering': 'crispEdges',
        },
        h('text', { class: 'tc-tick-label', x: scaleX, y: round(scaleY), dy: '0.32em' }, low),
        Array.from({ length: SCALE_STEPS }, (_, s) =>
          h('rect', {
            key: s,
            class: 'tc-cell',
            x: barX + s * SCALE_STEP,
            y: round(scaleY - SCALE_HEIGHT / 2),
            width: SCALE_STEP,
            height: SCALE_HEIGHT,
            style: paint(s / (SCALE_STEPS - 1)).style,
          }),
        ),
        h(
          'text',
          { class: 'tc-tick-label', x: barX + barWidth + 8, y: round(scaleY), dy: '0.32em' },
          high,
        ),
      ),
  ]
}

/** Table: one row per region with a value, in the order of the data. */
function mapTable(options: MapOptions, ctx: RenderContext, limit: number): DataTable {
  const map = typeof options.map === 'string' ? maps[options.map] : options.map
  const shapes = isMap(map) ? shapesOf(map) : undefined
  const value = formatNumber(options.format, ctx.locale)
  const rows: string[][] = []
  for (const [code, raw] of Object.entries(options.data ?? {})) {
    const v = finite(raw)
    const shape = shapes?.get(code)
    if (shape && v !== null) rows.push([shape.name, value(v)])
  }
  return { columns: ['', 'Value'], total: rows.length, rows: rows.slice(0, limit) }
}

/** Width to height of the map with its scale at a usual size, so the map fills the chart. */
function ratioOf(options: MapOptions): number | undefined {
  const map = typeof options.map === 'string' ? maps[options.map] : options.map
  if (!isMap(map)) return undefined
  const scale = options.scale !== false && Object.keys(options.data ?? {}).length > 0
  return round(600 / ((600 * map.height) / map.width + (scale ? 23 : 0)))
}

/** Values that are finite numbers, markers with real coordinates, lines and colors that are text. */
const cleanMap = (options: MapOptions): MapOptions => {
  const o = options as unknown as Record<string, unknown>
  const data: Record<string, number> = {}
  if (isRecord(o.data))
    for (const [code, v] of Object.entries(o.data)) {
      const n = finite(v)
      if (n !== null) data[code] = n
    }
  return {
    ...options,
    map: typeof o.map === 'string' || isMap(o.map) ? o.map : (undefined as never),
    data,
    colors: list(o.colors).filter((c): c is string => typeof c === 'string' && c.trim() !== ''),
    markers: records(o.markers, (m) => ({
      lat: finite(m.lat) as number,
      lng: finite(m.lng) as number,
      ...(typeof m.name === 'string' ? { name: m.name } : {}),
    })).filter((m) => m.lat !== null && m.lng !== null),
    lines: records(o.lines, (l) => ({ from: text(l.from), to: text(l.to) })),
    select: o.select === 'single' || o.select === 'multiple' ? o.select : undefined,
    selected: list(o.selected).filter((code): code is string => typeof code === 'string'),
    view: isRecord(o.view) ? (o.view as Partial<MapView>) : undefined,
    onSelect: typeof o.onSelect === 'function' ? (o.onSelect as MapOptions['onSelect']) : undefined,
  }
}

/**
 * Map: the regions of a map file as SVG shapes, shaded by value from the
 * empty shade to the full color (`--tc-heat-color`, the cells of the
 * heatmap) or through a scale of `colors`, with markers placed by their
 * coordinates, lines between them and a bar of the scale. The shapes come
 * projected from the map file, so no geo library ships to the browser.
 *
 * ```ts
 * import { world } from '@tabler/charts/maps/world'
 *
 * new Chart('#el', {
 *   type: map,
 *   map: world,
 *   data: { PL: 80, DE: 45, US: 100 },
 * })
 * ```
 */
export const map: ChartType<MapOptions> = {
  name: 'map',
  // (The options come with the whole config: its proportions are defaulted here.)
  clean: (options) => {
    const config = cleanMap(options) as MapOptions & {
      aspectRatio?: number
      autoRatio?: number
    }
    // The ratio set here follows the map; one of your own is kept.
    if (config.aspectRatio !== undefined && config.aspectRatio !== config.autoRatio) return config
    const autoRatio = ratioOf(config)
    return { ...config, aspectRatio: autoRatio, autoRatio }
  },
  render: renderMap,
  table: mapTable,
  // Zoom, drag and selection: at work only with `zoom` or `select`.
  plugins: [mapInteraction()],
}
