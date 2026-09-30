/** Axis-aligned rectangle in pixels. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Space around a box, in pixels. */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/** Insets given as one number for all sides or per side. */
export type InsetsInput = number | Partial<Insets>

/** Normalize an {@link InsetsInput}; missing sides fall back to `fallback`. */
export function insets(value: InsetsInput | undefined, fallback = 0): Insets {
  if (typeof value === 'number') return { top: value, right: value, bottom: value, left: value }
  return {
    top: value?.top ?? fallback,
    right: value?.right ?? fallback,
    bottom: value?.bottom ?? fallback,
    left: value?.left ?? fallback,
  }
}

/** Rectangle left inside `width × height` after `margins`; never negative. */
export function innerRect(width: number, height: number, margins: Insets): Rect {
  return {
    x: margins.left,
    y: margins.top,
    width: Math.max(0, width - margins.left - margins.right),
    height: Math.max(0, height - margins.top - margins.bottom),
  }
}

// Approximate advance widths in em for common UI sans-serif fonts
// (system-ui / SF, Segoe UI, Roboto), measured in the browser.
const THIN = /* @__PURE__ */ new Set(" !'.,:;|ijlI`")
const NARROW = /* @__PURE__ */ new Set('()[]{}-/frt')
const ROUND = /* @__PURE__ */ new Set('CDGHNOQU')
const WIDE = /* @__PURE__ */ new Set('%@MWmw')

function charWidth(char: string): number {
  if (char >= '0' && char <= '9') return char === '1' ? 0.45 : 0.63
  if (THIN.has(char)) return 0.27
  if (NARROW.has(char)) return 0.38
  if (WIDE.has(char)) return 0.88
  if (ROUND.has(char)) return 0.76
  if (char >= 'A' && char <= 'Z') return 0.66
  return 0.57
}

/**
 * Estimate the rendered width of `text` without a DOM, for layout on the
 * server and in workers. Tuned for common UI sans-serif fonts; deterministic,
 * so SSR and client layouts agree.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let em = 0
  for (const char of text) em += charWidth(char)
  return em * fontSize
}

/** Line height used for single-line labels, relative to the font size. */
export const LINE_HEIGHT = 1.25
