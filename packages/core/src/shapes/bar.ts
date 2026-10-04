import { round as to2 } from '../layout.ts'

/** Rounded for path data, without a `-0`. */
const round = (value: number): number => {
  const rounded = to2(value)
  return rounded === 0 ? 0 : rounded
}

/**
 * Path of a vertical bar from `baseline` to `value` (both y in pixels),
 * `x`…`x + width` wide. Only the data end is rounded, with `radius` clamped
 * to half the width and to the bar height; the baseline end stays square.
 * Works for bars growing up (value above baseline) and down (negative values).
 * Square corners are zero-radius arcs and every side is an `L`, so every
 * bar path, vertical or horizontal, has the same commands and CSS can
 * transition `d` between rounded and square (stacking) and between
 * orientations.
 */
export function barPath(
  x: number,
  width: number,
  baseline: number,
  value: number,
  radius = 0,
): string {
  const w = Math.max(0, width)
  const height = Math.abs(baseline - value)
  const r = Math.max(0, Math.min(radius, w / 2, height))
  const x0 = round(x)
  const x1 = round(x + w)
  const b = round(baseline)
  const v = round(value)

  const up = value <= baseline
  const edge = round(up ? value + r : value - r)
  const sweep = up ? 1 : 0
  const rr = round(r)
  return (
    `M${x0},${b}L${x0},${edge}` +
    `A${rr},${rr},0,0,${sweep},${round(x + r)},${v}` +
    `L${round(x + w - r)},${v}` +
    `A${rr},${rr},0,0,${sweep},${x1},${edge}` +
    `L${x1},${b}Z`
  )
}

/**
 * Path of a horizontal bar from `baseline` to `value` (both x in pixels),
 * `y`…`y + height` tall. Only the data end is rounded, with `radius` clamped
 * to half the height and to the bar length; the baseline end stays square.
 * Works for bars growing right (positive values) and left (negative values).
 * Same commands as `barPath`, so a chart can morph between orientations.
 */
export function hbarPath(
  y: number,
  height: number,
  baseline: number,
  value: number,
  radius = 0,
): string {
  const hgt = Math.max(0, height)
  const length = Math.abs(value - baseline)
  const r = Math.max(0, Math.min(radius, hgt / 2, length))
  const y0 = round(y)
  const y1 = round(y + hgt)
  const b = round(baseline)
  const v = round(value)

  const right = value >= baseline
  const edge = round(right ? value - r : value + r)
  const sweep = right ? 1 : 0
  const rr = round(r)
  return (
    `M${b},${y0}L${edge},${y0}` +
    `A${rr},${rr},0,0,${sweep},${v},${round(y + r)}` +
    `L${v},${round(y + hgt - r)}` +
    `A${rr},${rr},0,0,${sweep},${edge},${y1}` +
    `L${b},${y1}Z`
  )
}
