const round = (value: number): number => {
  const rounded = Math.round(value * 100) / 100
  return rounded === 0 ? 0 : rounded
}

/**
 * Path of a vertical bar from `baseline` to `value` (both y in pixels),
 * `x`…`x + width` wide. Only the data end is rounded, with `radius` clamped
 * to half the width and to the bar height; the baseline end stays square.
 * Works for bars growing up (value above baseline) and down (negative values).
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

  if (r === 0) return `M${x0},${b}V${v}H${x1}V${b}Z`

  const up = value <= baseline
  const edge = round(up ? value + r : value - r)
  const sweep = up ? 1 : 0
  const rr = round(r)
  return (
    `M${x0},${b}V${edge}` +
    `A${rr},${rr},0,0,${sweep},${round(x + r)},${v}` +
    `H${round(x + w - r)}` +
    `A${rr},${rr},0,0,${sweep},${x1},${edge}` +
    `V${b}Z`
  )
}
