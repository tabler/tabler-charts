import { estimateTextWidth, type Rect } from '../layout.ts'
import type { BandKey, BandScale } from '../scales/band.ts'
import { type ClassValue, h, type VNode } from '../vnode.ts'
import { labelKey, toMs } from './cartesian.ts'

/** A category label, a number, or a date (on a time axis). */
type AnnotationLabel = string | number | Date

/**
 * A reference line or band drawn with the series: a target on the value
 * axis (`y: 99.9`), a normal range (`y: [40, 60]`), an event on the category
 * axis (`x: 'Jun'`, or a date on a time axis) or a period (`x: [from, to]`).
 */
export interface Annotation {
  /** A line at a value, or a band between two values, on the value axis. */
  y?: number | readonly [number, number]
  /** A line at a category (or a date on a time axis), or a band between two, on the category axis. */
  x?: AnnotationLabel | readonly [AnnotationLabel, AnnotationLabel]
  /** Short text next to the line or inside the band. */
  label?: string
  /** Where the label sits along the line or band. Defaults to `'end'` (right, or top). */
  position?: 'start' | 'end'
  /** Any CSS color; sets `--tc-annotation-color`. */
  color?: string
  /** Extra classes on the annotation group. */
  class?: ClassValue
  /** Stable identity for keyed updates. Defaults to the position in the list. */
  id?: string
}

/** How the layout maps data to pixels for annotations. */
export interface AnnotationScales {
  area: Rect
  /** Whether categories run along y (horizontal bars). */
  horizontal: boolean
  fontSize: number
  /** Pixel position of a value along the value axis. */
  value: (v: number) => number
  /** The category scale, and the keys of its categories in order. */
  band: BandScale
  keys: readonly BandKey[]
  /** Pixel position of a date, when the category axis is a time axis. */
  time?: ((date: Date) => number) | undefined
}

/** Pixel span of a category (or a date on a time axis), or `undefined` if it is not on the axis. */
function categorySpan(
  scales: AnnotationScales,
  label: AnnotationLabel,
): readonly [number, number] | undefined {
  if (scales.time) {
    const p = scales.time(new Date(toMs(label)))
    return Number.isFinite(p) ? [p, p] : undefined
  }
  const i = scales.keys.indexOf(labelKey(label))
  return i < 0 ? undefined : [scales.band.at(i), scales.band.at(i) + scales.band.bandwidth]
}

const round = (value: number): number => Math.round(value * 100) / 100

const isPair = <T>(v: T | readonly [T, T]): v is readonly [T, T] => Array.isArray(v)

/** Values the value axis should include so every annotation shows. */
export function annotationValues(annotations: readonly Annotation[] | undefined): number[] {
  const out: number[] = []
  for (const a of annotations ?? []) {
    if (a.y === undefined) continue
    for (const v of isPair(a.y) ? a.y : [a.y]) if (Number.isFinite(v)) out.push(v)
  }
  return out
}

/**
 * Annotation layers: bands go below the series, lines and labels above
 * them. Annotations outside the plot area are skipped.
 */
export function annotationLayers(
  annotations: readonly Annotation[] | undefined,
  scales: AnnotationScales,
): { under: VNode | null; over: VNode | null } {
  if (!annotations?.length) return { under: null, over: null }
  const { area, horizontal, fontSize } = scales
  const bands: VNode[] = []
  const lines: VNode[] = []
  // Plot edges: "across" is the axis the annotation spans, "along" the one it marks.
  const x0 = area.x
  const x1 = area.x + area.width
  const y0 = area.y
  const y1 = area.y + area.height
  const inside = (p: number, lo: number, hi: number) => p >= lo - 0.5 && p <= hi + 0.5
  const pad = 4
  /** Boxes of the labels placed so far, so later ones can step aside. */
  const placed: [number, number, number, number][] = []
  const clear = (box: [number, number, number, number]) =>
    placed.every(([l, t, r, b]) => box[2] <= l || box[0] >= r || box[3] <= t || box[1] >= b)

  annotations.forEach((a, index) => {
    const key = a.id ?? index
    // Groups are named by axis; the line, band and label inside by what they are.
    const attrs = (part?: string) => ({
      key: part ? `${key}-${part}` : key,
      class: ['tc-annotation', a.y !== undefined ? 'tc-annotation-y' : 'tc-annotation-x', a.class],
      style: a.color ? `--tc-annotation-color:${a.color}` : undefined,
    })
    const end = a.position !== 'start'

    // The pixel span an annotation covers, and whether it runs across x (a vertical line).
    let span: readonly [number, number] | undefined
    let vertical: boolean
    if (a.y !== undefined) {
      const [from, to] = isPair(a.y) ? a.y : [a.y, a.y]
      if (!Number.isFinite(from) || !Number.isFinite(to)) return
      span = [scales.value(from), scales.value(to)]
      vertical = horizontal
    } else if (a.x !== undefined) {
      const [from, to] = isPair(a.x) ? a.x : [a.x, a.x]
      const start = categorySpan(scales, from)
      const stop = categorySpan(scales, to)
      if (!start || !stop) return
      // A single category: its center; a range: from the start of one to the end of the other.
      span = isPair(a.x)
        ? [Math.min(start[0], stop[0]), Math.max(start[1], stop[1])]
        : [(start[0] + start[1]) / 2, (start[0] + start[1]) / 2]
      vertical = !horizontal
    } else {
      return
    }
    const lo = Math.min(span[0], span[1])
    const hi = Math.max(span[0], span[1])
    const [min, max] = vertical ? [x0, x1] : [y0, y1]
    if (!inside(lo, min, max) && !inside(hi, min, max) && !(lo < min && hi > max)) return
    const a0 = Math.max(lo, min)
    const a1 = Math.min(hi, max)

    // Label: candidate spots in order of preference, inside the plot area; the
    // first that does not cover an earlier label wins (or the first one).
    let label: VNode | false | undefined
    if (a.label) {
      const w = estimateTextWidth(a.label, fontSize * 0.92)
      const line = a1 - a0 <= 0.5
      // [left edge, baseline] of each spot.
      const spots: [number, number][] = []
      if (vertical) {
        // Beside a line or at the start of a band; on the other side if it would run out.
        const after = a0 + pad
        const x = after + w <= x1 ? after : line ? a0 - pad - w : Math.max(x0, a1 - pad - w)
        const top = end ? y0 + fontSize : y1 - pad
        const step = (end ? 1 : -1) * fontSize * 1.2
        for (let k = 0; k < 3; k++) spots.push([Math.max(x0 + pad, x), top + k * step])
      } else {
        // At the preferred end above or below, then at the other end.
        const near = end ? x1 - pad - w : x0 + pad
        const far = end ? x0 + pad : x1 - pad - w
        for (const x of [near, far]) {
          if (line) spots.push([x, a0 - pad], [x, a0 + fontSize])
          else spots.push([x, a0 + fontSize], [x, a1 - pad])
        }
      }
      const box = ([x, y]: [number, number]): [number, number, number, number] => [
        x,
        y - fontSize,
        x + w,
        y + fontSize * 0.25,
      ]
      const spot = spots.find((s) => clear(box(s))) ?? (spots[0] as [number, number])
      placed.push(box(spot))
      label = h(
        'text',
        { class: 'tc-annotation-label', x: round(spot[0]), y: round(spot[1]) },
        a.label,
      )
    }

    if (a1 - a0 > 0.5) {
      // A band below the series; its label goes with the lines, above them.
      const d = vertical
        ? `M${round(a0)},${round(y0)}H${round(a1)}V${round(y1)}H${round(a0)}Z`
        : `M${round(x0)},${round(a0)}H${round(x1)}V${round(a1)}H${round(x0)}Z`
      bands.push(h('g', attrs(), h('path', { class: 'tc-annotation-band', d })))
      if (label) lines.push(h('g', attrs('label'), label))
      return
    }
    // A line across the plot area.
    const at = round(a0)
    lines.push(
      h(
        'g',
        attrs(),
        h(
          'line',
          vertical
            ? { class: 'tc-annotation-line', x1: at, x2: at, y1: round(y0), y2: round(y1) }
            : { class: 'tc-annotation-line', x1: round(x0), x2: round(x1), y1: at, y2: at },
        ),
        label,
      ),
    )
  })

  return {
    under: bands.length
      ? h('g', { key: 'annotations-under', class: 'tc-annotations', 'aria-hidden': 'true' }, bands)
      : null,
    over: lines.length
      ? h('g', { key: 'annotations-over', class: 'tc-annotations', 'aria-hidden': 'true' }, lines)
      : null,
  }
}
