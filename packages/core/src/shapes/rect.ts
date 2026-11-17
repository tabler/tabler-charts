import { round } from '../layout.ts'

/** A rounded rectangle as path data (the hover ring of a cell or a tile). */
export function rectPath(x: number, y: number, w: number, hgt: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, hgt / 2))
  const n = round
  return (
    `M${n(x + rr)},${n(y)}H${n(x + w - rr)}A${n(rr)},${n(rr)},0,0,1,${n(x + w)},${n(y + rr)}` +
    `V${n(y + hgt - rr)}A${n(rr)},${n(rr)},0,0,1,${n(x + w - rr)},${n(y + hgt)}` +
    `H${n(x + rr)}A${n(rr)},${n(rr)},0,0,1,${n(x)},${n(y + hgt - rr)}` +
    `V${n(y + rr)}A${n(rr)},${n(rr)},0,0,1,${n(x + rr)},${n(y)}Z`
  )
}
