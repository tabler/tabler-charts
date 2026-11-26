/**
 * Marker shapes, so the points of series do not depend on color alone
 * (color vision deficiency, grayscale print): one shape per color slot,
 * for line, radar and scatter points and the active points of the hover.
 * On with `shapes: true`, and with `patterns: true` unless `shapes` says
 * otherwise. Legend and tooltip swatches take the same shapes (`markerClip`).
 */
import type { PostStep } from '../features.ts'
import { round } from '../layout.ts'

/**
 * Outlines by color slot (0-based), as x, y pairs in units of the radius,
 * sized so the shapes weigh about the same as the circle of slot 0 (and of
 * slots 9 and up).
 */
const SHAPES: readonly (readonly number[])[] = [
  [],
  // Square.
  [-0.9, -0.9, 0.9, -0.9, 0.9, 0.9, -0.9, 0.9],
  // Triangle.
  [0, -1.3, 1.2, 0.9, -1.2, 0.9],
  // Diamond.
  [0, -1.3, 1.3, 0, 0, 1.3, -1.3, 0],
  // Triangle, pointing down.
  [-1.2, -0.9, 1.2, -0.9, 0, 1.3],
  // Plus.
  [
    -0.4, -1.2, 0.4, -1.2, 0.4, -0.4, 1.2, -0.4, 1.2, 0.4, 0.4, 0.4, 0.4, 1.2, -0.4, 1.2, -0.4, 0.4,
    -1.2, 0.4, -1.2, -0.4, -0.4, -0.4,
  ],
  // Cross.
  [
    -0.7, -1.2, 0, -0.5, 0.7, -1.2, 1.2, -0.7, 0.5, 0, 1.2, 0.7, 0.7, 1.2, 0, 0.5, -0.7, 1.2, -1.2,
    0.7, -0.5, 0, -1.2, -0.7,
  ],
  // Star.
  [
    0, -1.4, 0.32, -0.44, 1.33, -0.43, 0.52, 0.17, 0.82, 1.13, 0, 0.55, -0.82, 1.13, -0.52, 0.17,
    -1.33, -0.43, -0.32, -0.44,
  ],
]

/** The path of slot `slot`'s marker of radius `r` around (`x`, `y`). */
export function markerPath(slot: number, x: number, y: number, r: number): string {
  const shape = SHAPES[slot] ?? []
  if (!shape.length) {
    return `M${round(x - r)},${round(y)}a${r},${r},0,1,0,${2 * r},0a${r},${r},0,1,0,${-2 * r},0Z`
  }
  let d = ''
  for (let i = 0; i < shape.length; i += 2) {
    d += `${i ? 'L' : 'M'}${round(x + (shape[i] as number) * r)},${round(y + (shape[i + 1] as number) * r)}`
  }
  return `${d}Z`
}

/**
 * Inline style for the legend or tooltip swatch of slot `slot`: its marker as
 * a CSS shape (`--tc-shape`, a `clip-path`) in a box without rounded corners;
 * `undefined` for the slots that stay a circle.
 */
export function markerClip(slot: number): Record<string, string | number> | undefined {
  if (!SHAPES[slot]?.length) return undefined
  // In percent of the box: a radius of 35.7% keeps the largest shape (the star) inside.
  const points = markerPath(slot, 50, 50, 35.7).slice(1, -1).replace(/,/g, '% ').replace(/L/g, '%,')
  return {
    // The square is not cut from the swatch's box but set a little into it.
    '--tc-shape': slot === 1 ? 'inset(10% round 1px)' : `polygon(${points}%)`,
    '--tc-shape-radius': 0,
  }
}

/**
 * @deprecated Points are drawn in their shapes as the chart renders: this
 * step leaves the content as it is. It will be removed in the next major.
 */
export const shapesStep: PostStep = (_config, content) => content
