import type { DataTable } from './a11y.ts'
import {
  type ChartConfig,
  type ContextOptions,
  chartModel,
  type RenderResult,
  renderChart,
  renderContext,
  type Size,
} from './chart.ts'
import type { Highlight, Hit, Interaction } from './interaction.ts'
import { estimateTextWidth } from './layout.ts'
import type { Child, ChildInput, VNode } from './vnode.ts'

/** How a chart built for a size answers pointer and keyboard (it must have an answer). */
export function chartInteraction<O extends object>(
  config: ChartConfig<O>,
  size: Size,
  id?: string,
): Interaction {
  const { interaction } = renderChart(config, size, id)
  if (!interaction) throw new Error('no interaction')
  return interaction
}

/**
 * What a config's chart type renders for a size, by itself (no root svg, no
 * cleaning, no optional steps), as a render result: `hidden`, `rtl`, `id` and
 * the font size can be set.
 */
export function renderOf<O extends object>(
  config: ChartConfig<O>,
  size: Size,
  context: Partial<Omit<ContextOptions, 'size'>> = {},
): RenderResult {
  const out = config.type.render(
    chartModel(config),
    renderContext(config, { id: 'tc', hidden: new Set(), ...context, size }),
  )
  return (out as RenderResult | null)?.content !== undefined
    ? (out as RenderResult)
    : { content: out as ChildInput }
}

/** A config's data table, with `hidden` series left out. */
export const tableOf = <O extends object>(
  config: ChartConfig<O>,
  limit: number = Number.POSITIVE_INFINITY,
  hidden: ReadonlySet<string> = new Set(),
): DataTable | undefined =>
  config.type.table?.(chartModel(config), { locale: config.locale, hidden }, limit)

/** Every node in `node`'s tree whose class list contains `cls`. */
export function findByClass(node: Child, cls: string, out: VNode[] = []): VNode[] {
  if (typeof node === 'string') return out
  const classes = String(node.attrs.class ?? '').split(' ')
  if (classes.includes(cls)) out.push(node)
  for (const child of node.children) findByClass(child, cls, out)
  return out
}

/** Every node in `node`'s tree with the given tag name. */
export function findByTag(node: Child, tag: string, out: VNode[] = []): VNode[] {
  if (typeof node === 'string') return out
  if (node.tag === tag) out.push(node)
  for (const child of node.children) findByTag(child, tag, out)
  return out
}

/** Offset of a grid line positioned with `transform:translateX/Y(<n>px)`. */
export function gridLineOffset(node: VNode | undefined): number {
  const match = String(node?.attrs.style ?? '').match(/translate[XY]\((-?[\d.]+)px\)/)
  return match ? Number(match[1]) : Number.NaN
}

/**
 * Horizontal extent [left, right] of the centered tick labels of an axis
 * (`tc-axis-bottom`), from each tick's translate and the estimated text width.
 */
export function tickLabelExtent(
  node: VNode,
  axisClass = 'tc-axis-bottom',
  fontSize = 12,
): [number, number] {
  const axis = findByClass(node, axisClass)[0]
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  for (const tick of axis ? findByClass(axis, 'tc-tick') : []) {
    const x = Number(String(tick.attrs.style).match(/translate\((-?[\d.]+)px/)?.[1])
    const label = findByClass(tick, 'tc-tick-label')[0]?.children.join('') ?? ''
    const half = estimateTextWidth(label, fontSize) / 2
    left = Math.min(left, x - half)
    right = Math.max(right, x + half)
  }
  return [left, right]
}

/** The highlight of a hit when it is of `kind`. */
export const highlightOf = <K extends Highlight['kind']>(
  hit: Hit | null | undefined,
  kind: K,
): Extract<Highlight, { kind: K }> | undefined =>
  hit?.highlight?.kind === kind ? (hit.highlight as Extract<Highlight, { kind: K }>) : undefined
