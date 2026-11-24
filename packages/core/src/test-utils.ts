import { types } from './chart-types.ts'
import { estimateTextWidth } from './layout.ts'
import type { Child, VNode } from './vnode.ts'

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

/**
 * The built-in chart types a cross-cutting test leaves out: every name in
 * `types` that `covered` does not name. A test asserts it is empty, so a new
 * chart type cannot be forgotten. `without` names the types the test does
 * not apply to, each with the reason.
 */
export function missingTypes(
  covered: Iterable<{ name: string } | string>,
  without: Readonly<Record<string, string>> = {},
): string[] {
  const names = new Set([...covered].map((t) => (typeof t === 'string' ? t : t.name)))
  return Object.keys(types).filter((name) => !names.has(name) && !(name in without))
}
