/**
 * Annular sector paths with padding and rounded corners, ported from
 * d3-shape's `arc()` (ISC license, Mike Bostock) so geometry matches d3.
 *
 * Angles are in radians, clockwise from 12 o'clock; paths are centered on
 * the origin (translate the group to place them).
 */

const EPSILON = 1e-12
const PI = Math.PI
const HALF_PI = PI / 2
const TAU = 2 * PI

// Clamped like d3-shape's math helpers, so out-of-range inputs saturate instead of NaN.
const asin = (x: number): number => (x >= 1 ? HALF_PI : x <= -1 ? -HALF_PI : Math.asin(x))
const acos = (x: number): number => (x > 1 ? 0 : x < -1 ? PI : Math.acos(x))

export interface ArcOptions {
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  /** Angle removed between adjacent arcs, split between both ends. Defaults to `0`. */
  padAngle?: number
  /** Radius the pad angle is measured at. Defaults to `sqrt(inner² + outer²)` like d3. */
  padRadius?: number
  /** Radius of the rounded corners, clamped to half the ring thickness. Defaults to `0`. */
  cornerRadius?: number
  /** Decimal places kept in the path data. Defaults to `2`. */
  precision?: number
}

/** Canvas-like path builder emitting SVG path data (after d3-path). */
class ArcPath {
  d = ''
  #x0: number | null = null
  #y0: number | null = null
  #x1: number | null = null
  #y1: number | null = null
  readonly #k: number

  constructor(precision: number) {
    this.#k = 10 ** Math.max(0, Math.min(12, Math.floor(precision)))
  }

  #n(value: number): string {
    const rounded = Math.round(value * this.#k) / this.#k
    return String(rounded === 0 ? 0 : rounded)
  }

  moveTo(x: number, y: number): void {
    this.#x0 = this.#x1 = x
    this.#y0 = this.#y1 = y
    this.d += `M${this.#n(x)},${this.#n(y)}`
  }

  lineTo(x: number, y: number): void {
    this.#x1 = x
    this.#y1 = y
    this.d += `L${this.#n(x)},${this.#n(y)}`
  }

  closePath(): void {
    if (this.#x1 !== null) {
      this.#x1 = this.#x0
      this.#y1 = this.#y0
      this.d += 'Z'
    }
  }

  arc(x: number, y: number, r: number, a0: number, a1: number, ccw: boolean): void {
    const dx = r * Math.cos(a0)
    const dy = r * Math.sin(a0)
    const x0 = x + dx
    const y0 = y + dy
    const cw = ccw ? 0 : 1
    let da = ccw ? a0 - a1 : a1 - a0

    if (this.#x1 === null || this.#y1 === null) {
      this.d += `M${this.#n(x0)},${this.#n(y0)}`
      this.#x0 = x0
      this.#y0 = y0
    } else if (Math.abs(this.#x1 - x0) > EPSILON || Math.abs(this.#y1 - y0) > EPSILON) {
      this.d += `L${this.#n(x0)},${this.#n(y0)}`
    }
    this.#x1 = x0
    this.#y1 = y0
    if (!r) return

    if (da < 0) da = (da % TAU) + TAU
    const rr = this.#n(r)
    if (da > TAU - EPSILON) {
      // A complete circle: two half arcs.
      this.d += `A${rr},${rr},0,1,${cw},${this.#n(x - dx)},${this.#n(y - dy)}`
      this.d += `A${rr},${rr},0,1,${cw},${this.#n(x0)},${this.#n(y0)}`
    } else if (da > EPSILON) {
      this.#x1 = x + r * Math.cos(a1)
      this.#y1 = y + r * Math.sin(a1)
      this.d += `A${rr},${rr},0,${da >= PI ? 1 : 0},${cw},${this.#n(this.#x1)},${this.#n(this.#y1)}`
    }
  }
}

function intersect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): [number, number] | undefined {
  const x10 = x1 - x0
  const y10 = y1 - y0
  const x32 = x3 - x2
  const y32 = y3 - y2
  let t = y32 * x10 - x32 * y10
  if (t * t < EPSILON) return undefined
  t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / t
  return [x0 + t * x10, y0 + t * y10]
}

/** Center and tangent points of a rounded corner between a radial edge and an arc. */
function cornerTangents(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r1: number,
  rc: number,
  cw: boolean,
) {
  const x01 = x0 - x1
  const y01 = y0 - y1
  const lo = (cw ? rc : -rc) / Math.sqrt(x01 * x01 + y01 * y01)
  const ox = lo * y01
  const oy = -lo * x01
  const x11 = x0 + ox
  const y11 = y0 + oy
  const x10 = x1 + ox
  const y10 = y1 + oy
  const x00 = (x11 + x10) / 2
  const y00 = (y11 + y10) / 2
  const dx = x10 - x11
  const dy = y10 - y11
  const d2 = dx * dx + dy * dy
  const r = r1 - rc
  const D = x11 * y10 - x10 * y11
  const d = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, r * r * d2 - D * D))
  let cx0 = (D * dy - dx * d) / d2
  let cy0 = (-D * dx - dy * d) / d2
  const cx1 = (D * dy + dx * d) / d2
  const cy1 = (-D * dx + dy * d) / d2
  const dx0 = cx0 - x00
  const dy0 = cy0 - y00
  const dx1 = cx1 - x00
  const dy1 = cy1 - y00
  // Pick the intersection closest to the edge midpoint.
  if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) {
    cx0 = cx1
    cy0 = cy1
  }
  return {
    cx: cx0,
    cy: cy0,
    x01: -ox,
    y01: -oy,
    x11: cx0 * (r1 / r - 1),
    y11: cy0 * (r1 / r - 1),
  }
}

/**
 * Padded angles, clamped corner radii and edge points of a partial sector,
 * shared by both path generators so they agree exactly.
 */
function sector(
  options: ArcOptions,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  da: number,
  cw: boolean,
) {
  let a01 = a0
  let a11 = a1
  let a00 = a0
  let a10 = a1
  let da0 = da
  let da1 = da
  const ap = (options.padAngle ?? 0) / 2
  const rp = ap > EPSILON ? (options.padRadius ?? Math.sqrt(r0 * r0 + r1 * r1)) : 0
  const rc = Math.min(Math.abs(r1 - r0) / 2, options.cornerRadius ?? 0)
  let rc0 = rc
  let rc1 = rc

  // Apply padding: equal linear offsets at both radii keep the gap parallel.
  if (rp > EPSILON) {
    let p0 = asin((rp / r0) * Math.sin(ap))
    let p1 = asin((rp / r1) * Math.sin(ap))
    da0 -= p0 * 2
    if (da0 > EPSILON) {
      p0 *= cw ? 1 : -1
      a00 += p0
      a10 -= p0
    } else {
      da0 = 0
      a00 = a10 = (a0 + a1) / 2
    }
    da1 -= p1 * 2
    if (da1 > EPSILON) {
      p1 *= cw ? 1 : -1
      a01 += p1
      a11 -= p1
    } else {
      da1 = 0
      a01 = a11 = (a0 + a1) / 2
    }
  }

  const x01 = r1 * Math.cos(a01)
  const y01 = r1 * Math.sin(a01)
  const x10 = r0 * Math.cos(a10)
  const y10 = r0 * Math.sin(a10)
  const x11 = r1 * Math.cos(a11)
  const y11 = r1 * Math.sin(a11)
  const x00 = r0 * Math.cos(a00)
  const y00 = r0 * Math.sin(a00)

  // Restrict the corner radius for narrow sectors, where corners would overlap.
  if (rc > EPSILON && da < PI) {
    const oc = intersect(x01, y01, x00, y00, x11, y11, x10, y10)
    if (oc) {
      const ax = x01 - oc[0]
      const ay = y01 - oc[1]
      const bx = x11 - oc[0]
      const by = y11 - oc[1]
      const cos =
        (ax * bx + ay * by) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by))
      const kc = 1 / Math.sin(acos(cos) / 2)
      const lc = Math.sqrt(oc[0] * oc[0] + oc[1] * oc[1])
      rc0 = Math.min(rc, (r0 - lc) / (kc - 1))
      rc1 = Math.min(rc, (r1 - lc) / (kc + 1))
    } else {
      rc0 = rc1 = 0
    }
  }
  return { a00, a01, a10, a11, da0, da1, rc, rc0, rc1, x01, y01, x10, y10, x11, y11, x00, y00 }
}

/** SVG path data of an annular sector (a pie slice when `innerRadius` is 0). */
export function arcPath(options: ArcOptions): string {
  const path = new ArcPath(options.precision ?? 2)
  let r0 = Math.max(0, options.innerRadius)
  let r1 = Math.max(0, options.outerRadius)
  if (r1 < r0) [r0, r1] = [r1, r0]
  const a0 = options.startAngle - HALF_PI
  const a1 = options.endAngle - HALF_PI
  const da = Math.abs(a1 - a0)
  const cw = a1 > a0

  if (!(r1 > EPSILON)) {
    path.moveTo(0, 0)
  } else if (da > TAU - EPSILON) {
    // A full ring (or disc).
    path.moveTo(r1 * Math.cos(a0), r1 * Math.sin(a0))
    path.arc(0, 0, r1, a0, a1, !cw)
    if (r0 > EPSILON) {
      path.moveTo(r0 * Math.cos(a1), r0 * Math.sin(a1))
      path.arc(0, 0, r0, a1, a0, cw)
    }
  } else {
    const g = sector(options, r0, r1, a0, a1, da, cw)
    const { a00, a01, a10, a11, da0, da1, rc, rc0, rc1, x01, y01, x10, y10 } = g

    // Outer ring.
    if (!(da1 > EPSILON)) {
      path.moveTo(x01, y01)
    } else if (rc1 > EPSILON) {
      const { x00, y00, x11, y11 } = g
      const t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw)
      const t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw)
      path.moveTo(t0.cx + t0.x01, t0.cy + t0.y01)
      if (rc1 < rc) {
        path.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw)
      } else {
        path.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw)
        path.arc(
          0,
          0,
          r1,
          Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11),
          Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11),
          !cw,
        )
        path.arc(t1.cx, t1.cy, rc1, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw)
      }
    } else {
      path.moveTo(x01, y01)
      path.arc(0, 0, r1, a01, a11, !cw)
    }

    // Inner ring (or the center of a pie slice).
    if (!(r0 > EPSILON) || !(da0 > EPSILON)) {
      path.lineTo(x10, y10)
    } else if (rc0 > EPSILON) {
      const { x00, y00, x11, y11 } = g
      const t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw)
      const t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw)
      path.lineTo(t0.cx + t0.x01, t0.cy + t0.y01)
      if (rc0 < rc) {
        path.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw)
      } else {
        path.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw)
        path.arc(
          0,
          0,
          r0,
          Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11),
          Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11),
          cw,
        )
        path.arc(t1.cx, t1.cy, rc0, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw)
      }
    } else {
      path.arc(0, 0, r0, a10, a00, cw)
    }
  }

  path.closePath()
  return path.d
}

/** Midpoint of an arc, e.g. to anchor a tooltip or label (like d3's `arc.centroid`). */
export function arcCentroid(options: ArcOptions): [number, number] {
  const r = (options.innerRadius + options.outerRadius) / 2
  const a = (options.startAngle + options.endAngle) / 2 - HALF_PI
  return [Math.cos(a) * r, Math.sin(a) * r]
}

/** Pad angle giving a constant `gap` (in pixels) between arcs of a ring. */
export function padAngleForGap(gap: number, innerRadius: number, outerRadius: number): number {
  const rp = Math.sqrt(innerRadius * innerRadius + outerRadius * outerRadius)
  return rp > 0 ? 2 * Math.asin(Math.min(1, gap / 2 / rp)) : 0
}

/** Angle of a point around the origin. */
const angleOf = (x: number, y: number): number => Math.atan2(y, x)

/**
 * The same sector as {@link arcPath}, drawn with a fixed command structure:
 * every corner is always present (zero length when there is none) and each
 * ring is split into two half arcs, so the large-arc flag never flips.
 * Paths of different angles therefore interpolate with CSS `transition: d`,
 * which is what pie and donut slices need when data changes.
 */
export function arcPathStable(options: ArcOptions): string {
  const k = 10 ** Math.max(0, Math.min(12, Math.floor(options.precision ?? 2)))
  const n = (v: number): string => {
    const r = Math.round(v * k) / k
    return String(r === 0 ? 0 : r)
  }
  let d = ''
  const move = (x: number, y: number) => {
    d += `M${n(x)},${n(y)}`
  }
  const line = (x: number, y: number) => {
    d += `L${n(x)},${n(y)}`
  }
  const arc = (r: number, sweep: 0 | 1, x: number, y: number) => {
    d += `A${n(r)},${n(r)},0,0,${sweep},${n(x)},${n(y)}`
  }
  /** Two half arcs of radius `r` around the origin from angle `a0` to `a1`. */
  const ring = (r: number, a0: number, a1: number, ccw: boolean) => {
    let delta = ccw ? a0 - a1 : a1 - a0
    delta = ((delta % TAU) + TAU) % TAU
    if (delta < EPSILON && Math.abs(a1 - a0) > EPSILON) delta = TAU
    const mid = ccw ? a0 - delta / 2 : a0 + delta / 2
    const sweep: 0 | 1 = ccw ? 0 : 1
    arc(r, sweep, r * Math.cos(mid), r * Math.sin(mid))
    arc(r, sweep, r * Math.cos(a1), r * Math.sin(a1))
  }

  let r0 = Math.max(0, options.innerRadius)
  let r1 = Math.max(0, options.outerRadius)
  if (r1 < r0) [r0, r1] = [r1, r0]
  const a0 = options.startAngle - HALF_PI
  const a1 = options.endAngle - HALF_PI
  const da = Math.abs(a1 - a0)
  const cw = a1 > a0
  const outerSweep: 0 | 1 = cw ? 1 : 0

  if (!(r1 > EPSILON)) {
    // A point: eleven no-op commands at the origin.
    move(0, 0)
    for (let i = 0; i < 4; i++) arc(0, outerSweep, 0, 0)
    line(0, 0)
    for (let i = 0; i < 4; i++) arc(0, outerSweep, 0, 0)
    return `${d}Z`
  }

  if (da > TAU - EPSILON) {
    // A full ring (or disc): the seam between the two rings closes the path.
    const ox = r1 * Math.cos(a0)
    const oy = r1 * Math.sin(a0)
    move(ox, oy)
    arc(r1, outerSweep, ox, oy)
    ring(r1, a0, a0 + (cw ? TAU : -TAU) * (1 - 1e-9), !cw)
    arc(r1, outerSweep, ox, oy)
    const ix = r0 * Math.cos(a0)
    const iy = r0 * Math.sin(a0)
    line(ix, iy)
    arc(r0, outerSweep, ix, iy)
    if (r0 > EPSILON) ring(r0, a0, a0 + (cw ? -TAU : TAU) * (1 - 1e-9), cw)
    else for (let i = 0; i < 2; i++) arc(0, outerSweep, 0, 0)
    arc(r0, outerSweep, ix, iy)
    return `${d}Z`
  }

  const { a00, a01, a10, a11, da0, da1, rc, rc0, rc1, x01, y01, x10, y10, x11, y11, x00, y00 } =
    sector(options, r0, r1, a0, a1, da, cw)

  // Outer edge: corner, two ring halves, corner.
  if (da1 > EPSILON && rc1 > EPSILON) {
    const t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw)
    const t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw)
    move(t0.cx + t0.x01, t0.cy + t0.y01)
    if (rc1 < rc) {
      // Corners merged: one corner arc covers the edge, the rest is empty.
      const ex = t1.cx + t1.x01
      const ey = t1.cy + t1.y01
      arc(rc1, outerSweep, ex, ey)
      arc(r1, outerSweep, ex, ey)
      arc(r1, outerSweep, ex, ey)
      arc(rc1, outerSweep, ex, ey)
    } else {
      arc(rc1, outerSweep, t0.cx + t0.x11, t0.cy + t0.y11)
      ring(
        r1,
        angleOf(t0.cx + t0.x11, t0.cy + t0.y11),
        angleOf(t1.cx + t1.x11, t1.cy + t1.y11),
        !cw,
      )
      arc(rc1, outerSweep, t1.cx + t1.x01, t1.cy + t1.y01)
    }
  } else {
    move(x01, y01)
    arc(r1, outerSweep, x01, y01)
    if (da1 > EPSILON) ring(r1, a01, a11, !cw)
    else for (let i = 0; i < 2; i++) arc(r1, outerSweep, x01, y01)
    arc(r1, outerSweep, x11, y11)
  }

  // Inner edge (or the center of a pie slice): corner, two ring halves, corner.
  if (!(r0 > EPSILON) || !(da0 > EPSILON)) {
    line(x10, y10)
    for (let i = 0; i < 4; i++) arc(r0, outerSweep, x10, y10)
  } else if (rc0 > EPSILON) {
    const t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw)
    const t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw)
    line(t0.cx + t0.x01, t0.cy + t0.y01)
    if (rc0 < rc) {
      const ex = t1.cx + t1.x01
      const ey = t1.cy + t1.y01
      arc(rc0, outerSweep, ex, ey)
      arc(r0, outerSweep, ex, ey)
      arc(r0, outerSweep, ex, ey)
      arc(rc0, outerSweep, ex, ey)
    } else {
      arc(rc0, outerSweep, t0.cx + t0.x11, t0.cy + t0.y11)
      ring(r0, angleOf(t0.cx + t0.x11, t0.cy + t0.y11), angleOf(t1.cx + t1.x11, t1.cy + t1.y11), cw)
      arc(rc0, outerSweep, t1.cx + t1.x01, t1.cy + t1.y01)
    }
  } else {
    line(x10, y10)
    arc(r0, outerSweep, x10, y10)
    ring(r0, a10, a00, cw)
    arc(r0, outerSweep, x00, y00)
  }
  return `${d}Z`
}
