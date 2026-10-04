/**
 * Pattern fills, so series do not depend on color alone (color vision
 * deficiency, grayscale print, forced colors). Every legend entry gets an
 * 8×8 tile: its series color with lines or dots in `--tc-pattern-color` (the
 * surface by default) over it, one shape per color slot. The chart root
 * carries `--tc-pattern-{n}: url(#…)` and the slot classes map it to
 * `--tc-series-pattern`, which the stylesheet uses as the fill of bars,
 * areas, slices, rings and bubbles (lines get dashes instead) when
 * `patterns` is `true`, or with `'auto'` (the default) in forced colors.
 */
import { type ChartConfig, resolveLegend } from '../chart.ts'
import type { LegendItem } from '../legend.ts'
import { h, type VNode } from '../vnode.ts'

/** Tile shapes by color slot: lines as strokes, dots as round-capped stubs. */
const TILES = [
  // Diagonal ／, with the corners filled in so tiles join up.
  'M-2,2L2,-2M0,8L8,0M6,10L10,6',
  // Dots.
  'M2,2h.01M6,6h.01',
  // Diagonal ＼.
  'M-2,6L2,10M0,0L8,8M6,-2L10,2',
  // Horizontal.
  'M0,4H8',
  // Cross-hatch.
  'M0,8L8,0M0,0L8,8',
  // Vertical.
  'M4,0V8',
  // Grid.
  'M0,4H8M4,0V8',
  // Dashes.
  'M1,2H4M5,6H8',
]

/** Slots with a pattern of their own; series 9+ share the one of the "other" color. */
const SLOTS = TILES.length

/** The pattern of a slot (0-based): its id suffix and slot class. */
const slot = (index: number): [string, string] =>
  index < SLOTS ? [`${index + 1}`, `tc-series-${index + 1}`] : ['other', '']

/** `<pattern>` elements for the legend entries of a chart. */
export function patternDefs(items: readonly LegendItem[], id: string): VNode[] {
  const out = new Map<string, VNode>()
  for (const item of items) {
    const [n, cls] = slot(item.index)
    if (out.has(n)) continue
    out.set(
      n,
      h(
        'pattern',
        {
          key: n,
          id: `${id}-pattern-${n}`,
          class: ['tc-pattern', 'tc-series', cls],
          width: 8,
          height: 8,
          patternUnits: 'userSpaceOnUse',
          // A map, so a color from data cannot inject CSS (see normalizeStyle).
          style: { '--tc-series-color': item.color },
        },
        h('rect', { class: 'tc-pattern-bg', width: 8, height: 8 }),
        h('path', { class: 'tc-pattern-ink', d: TILES[item.index % SLOTS] as string }),
      ),
    )
  }
  return [...out.values()]
}

/** The `--tc-pattern-{n}` references for the chart root. */
export function patternVars(items: readonly LegendItem[], id: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const item of items) {
    const [n] = slot(item.index)
    vars[`--tc-pattern-${n}`] = `url(#${id}-pattern-${n})`
  }
  return vars
}

/**
 * The pattern fills of a chart: its root class (`tc-patterned` with
 * `patterns: true`, `tc-patterns-auto` for forced colors), the root's
 * `--tc-pattern-{n}` references and the `<defs>` with the patterns;
 * `undefined` for a chart without legend entries.
 */
export function patternFills(
  config: ChartConfig<object>,
  id: string,
): [string, Record<string, string>, VNode] | undefined {
  const { items } = resolveLegend(config)
  if (!items.length) return undefined
  return [
    config.patterns === true ? 'tc-patterned' : 'tc-patterns-auto',
    patternVars(items, id),
    h('defs', { key: 'patterns' }, patternDefs(items, id)),
  ]
}
