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
