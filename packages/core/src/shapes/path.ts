/** A point in pixels; `null` (or a non-finite coordinate) marks a gap. */
export type Point = readonly [x: number, y: number] | null | undefined

/** Curve used to connect consecutive points. */
export type Curve = 'linear' | 'monotone' | 'step' | 'step-before' | 'step-after'

export interface PathOptions {
  /** Interpolation between points. Defaults to `'linear'`. */
  curve?: Curve
  /** Decimal places kept in the path data. Defaults to `2`. */
  precision?: number
}

type Pt = readonly [number, number]

/** Writes a coordinate pair, rounded to `precision` decimals. */
type XY = (x: number, y: number) => string

function pair(precision: number): XY {
  const k = 10 ** Math.max(0, Math.min(12, Math.floor(precision)))
  const n = (value: number): number => Math.round(value * k) / k || 0
  return (x, y) => `${n(x)},${n(y)}`
}

/** Monotone tangents break on zero-length segments, so coincident points are dropped. */
const prepare = (input: readonly Pt[], curve: Curve): readonly Pt[] =>
  curve === 'monotone' ? dedupe(input) : input

/**
 * Path commands through `points` with a curve. The first point is a move
 * when `move` is true, otherwise a line (continuing an existing subpath).
 */
function emit(xy: XY, points: readonly Pt[], curve: Curve, move: boolean): string {
  const first = points[0]
  if (!first) return ''
  const start = (move ? 'M' : 'L') + xy(first[0], first[1])
  if (curve === 'monotone') return start + monotone(xy, points)
  const t = STEPS[curve]
  if (t !== undefined) return start + step(xy, points, t)
  let d = start
  for (let i = 1; i < points.length; i++) {
    const p = points[i] as Pt
    d += `L${xy(p[0], p[1])}`
  }
  return d
}

/** Where a step curve turns between two points, as a share of the way. */
const STEPS: Partial<Record<Curve, number>> = { step: 0.5, 'step-before': 0, 'step-after': 1 }

function dedupe(points: readonly Pt[]): readonly Pt[] {
  return points.filter((p, i) => {
    const prev = points[i - 1]
    return !prev || p[0] !== prev[0] || p[1] !== prev[1]
  })
}

function step(xy: XY, points: readonly Pt[], t: number): string {
  let d = ''
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1] as Pt
    const [x1, y1] = points[i] as Pt
    if (t <= 0) d += `L${xy(x0, y1)}L${xy(x1, y1)}`
    else if (t >= 1) d += `L${xy(x1, y0)}L${xy(x1, y1)}`
    else {
      const xm = x0 * (1 - t) + x1 * t
      d += `L${xy(xm, y0)}L${xy(xm, y1)}`
      // The next horizontal run continues from here, so only the last point is needed.
      if (i === points.length - 1) d += `L${xy(x1, y1)}`
    }
  }
  return d
}

const sign = (x: number): number => (x < 0 ? -1 : 1)

/**
 * Monotone cubic interpolation in x (Steffen, 1990), as in d3's
 * `curveMonotoneX`: smooth, but never overshoots the data.
 */
function monotone(xy: XY, points: readonly Pt[]): string {
  const n = points.length
  if (n < 2) return ''
  if (n === 2) {
    const p = points[1] as Pt
    return `L${xy(p[0], p[1])}`
  }

  const tangents = new Array<number>(n)
  for (let i = 1; i < n - 1; i++) {
    const [x0, y0] = points[i - 1] as Pt
    const [x1, y1] = points[i] as Pt
    const [x2, y2] = points[i + 1] as Pt
    const h0 = x1 - x0
    const h1 = x2 - x1
    const s0 = (y1 - y0) / (h0 || (h1 < 0 ? -0 : 0))
    const s1 = (y2 - y1) / (h1 || (h0 < 0 ? -0 : 0))
    const p = (s0 * h1 + s1 * h0) / (h0 + h1)
    tangents[i] =
      (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
  }
  tangents[0] = endTangent(points[0] as Pt, points[1] as Pt, tangents[1] as number)
  tangents[n - 1] = endTangent(points[n - 2] as Pt, points[n - 1] as Pt, tangents[n - 2] as number)

  let d = ''
  for (let i = 1; i < n; i++) {
    const [x0, y0] = points[i - 1] as Pt
    const [x1, y1] = points[i] as Pt
    const dx = (x1 - x0) / 3
    d += `C${xy(x0 + dx, y0 + dx * (tangents[i - 1] as number))},${xy(
      x1 - dx,
      y1 - dx * (tangents[i] as number),
    )},${xy(x1, y1)}`
  }
  return d
}

/** One-sided tangent for the first/last point from the neighbour's tangent. */
function endTangent(a: Pt, b: Pt, t: number): number {
  const h = b[0] - a[0]
  return h ? (3 * (b[1] - a[1])) / h / 2 - t / 2 : t
}

const isValid = (p: Point): p is Pt => p != null && Number.isFinite(p[0]) && Number.isFinite(p[1])

/** Split points into runs of consecutive valid points, keeping their indices. */
function runs(points: readonly Point[], valid: (i: number) => boolean = () => true): number[][] {
  const out: number[][] = []
  let current: number[] | undefined
  for (let i = 0; i < points.length; i++) {
    if (isValid(points[i]) && valid(i)) {
      if (!current) {
        current = []
        out.push(current)
      }
      current.push(i)
    } else {
      current = undefined
    }
  }
  return out
}

/**
 * Build the `d` attribute of a line through `points`. Gaps (`null`/`NaN`)
 * start a new subpath; a lone point renders as `M x,y Z`.
 *
 * ```ts
 * linePath([[0, 10], [50, 40], null, [100, 20]], { curve: 'monotone' })
 * ```
 */
export function linePath(points: readonly Point[], options: PathOptions = {}): string {
  const { curve = 'linear', precision = 2 } = options
  const xy = pair(precision)
  let d = ''
  for (const run of runs(points)) {
    const drawn = prepare(
      run.map((i) => points[i] as Pt),
      curve,
    )
    d += emit(xy, drawn, curve, true)
    if (drawn.length === 1) d += 'Z'
  }
  return d
}

/**
 * Build the `d` attribute of an area between `points` and a `baseline`:
 * a constant y (e.g. the zero line) or one y per point (stacked areas).
 * Each run of valid points becomes a closed subpath.
 */
export function areaPath(
  points: readonly Point[],
  baseline: number | readonly (number | null | undefined)[],
  options: PathOptions = {},
): string {
  const { curve = 'linear', precision = 2 } = options
  const xy = pair(precision)
  let d = ''
  const baseAt = (i: number): number =>
    typeof baseline === 'number' ? baseline : (baseline[i] ?? Number.NaN)

  for (const run of runs(points, (i) => Number.isFinite(baseAt(i)))) {
    d += emit(
      xy,
      prepare(
        run.map((i) => points[i] as Pt),
        curve,
      ),
      curve,
      true,
    )

    const bottom = run.map((i) => [(points[i] as Pt)[0], baseAt(i)] as const).reverse()
    // Walking backwards mirrors step curves, so stacked steps line up. A flat
    // baseline takes the same curve (it stays straight) so that the path keeps
    // its commands between flat and stacked, and CSS can morph one into the other.
    const back =
      curve === 'step-before' ? 'step-after' : curve === 'step-after' ? 'step-before' : curve
    d += `${emit(xy, prepare(bottom, back), back, false)}Z`
  }
  return d
}
