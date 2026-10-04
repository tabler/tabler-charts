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
  // A side that is not a finite number (left out, or junk from outside) takes the fallback.
  const side = (key: keyof Insets): number => {
    const v = typeof value === 'number' ? value : value?.[key]
    return Number.isFinite(v) ? (v as number) : fallback
  }
  return { top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left') }
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
const THIN = " !'.,:;|ijlI`"
const NARROW = '()[]{}-/frt'
const ROUND = 'CDGHNOQU'
const WIDE = '%@MWmw'

/**
 * Full-width characters, a whole em each: Hangul, CJK and kana, compatibility
 * ideographs, fullwidth forms and pictographs (emoji).
 */
const isWide = (code: number): boolean =>
  code >= 0x1100 &&
  (code <= 0x115f ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xff60) ||
    code >= 0x1f300)

/** The width of an ASCII character, in em. */
function charWidth(char: string): number {
  if (char >= '0' && char <= '9') return char === '1' ? 0.45 : 0.63
  if (THIN.includes(char)) return 0.27
  if (NARROW.includes(char)) return 0.38
  if (WIDE.includes(char)) return 0.88
  if (ROUND.includes(char)) return 0.76
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
  for (let i = 0; i < text.length; i++) {
    const point = text.codePointAt(i) as number
    // Beyond ASCII a character is a whole em or an average one; a pair of surrogates is one.
    em += ASCII[point] ?? (isWide(point) ? 1 : 0.57)
    if (point > 0xffff) i++
  }
  return em * fontSize
}

/**
 * The width of every ASCII character, looked up instead of worked out: an
 * axis of 100,000 long labels estimates millions of characters per render.
 */
const ASCII = /* @__PURE__ */ Array.from({ length: 128 }, (_, code) =>
  charWidth(String.fromCharCode(code)),
)

/** A pixel value rounded to two decimals, as written into attributes and path data. */
export const round = (value: number): number => Math.round(value * 100) / 100

/** Line height used for single-line labels, relative to the font size. */
export const LINE_HEIGHT = 1.25
