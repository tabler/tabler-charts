import type { Attrs, VNode } from '../vnode.ts'
import { childNamespace, createNode, patchAttrs, rendered, SVG_NS } from './dom.ts'

/** Whether existing DOM `node` can stand for `vnode` in namespace `ns`. */
function matches(node: Node, vnode: VNode, ns: string): node is Element {
  return (
    node.nodeType === 1 &&
    (node as Element).localName === vnode.tag &&
    (node as Element).namespaceURI === ns
  )
}

/**
 * Claim server-rendered DOM for a tree: the element takes the vnode's
 * attributes (extra ones are removed), and its children are matched by
 * position: text with text, elements with the same tag (hydrated in turn).
 * Anything that does not match is created in place, leftovers are removed.
 * Afterwards the nodes are tracked like freshly rendered ones.
 */
export function hydrateElement(el: Element, vnode: VNode): void {
  // The server attributes are the previous state to patch from.
  const current: Attrs = {}
  for (const name of el.getAttributeNames()) current[name] = el.getAttribute(name) as string
  patchAttrs(el, current, vnode.attrs)

  // Comments never stand for anything, and neither does text where the tree has none
  // (whitespace between elements). Text only ever sits in leaf elements here.
  const texts = vnode.children.some((child) => typeof child === 'string')
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 8 || (!texts && node.nodeType === 3)) el.removeChild(node)
  }

  const ns = childNamespace(el)
  let node: Node | null = el.firstChild
  for (const child of vnode.children) {
    const next: Node | null = node ? node.nextSibling : null
    if (
      typeof child === 'string'
        ? node?.nodeType === 3
        : node && matches(node, child, child.tag === 'svg' ? SVG_NS : ns)
    ) {
      if (typeof child === 'string') {
        if ((node as Text).data !== child) (node as Text).data = child
        rendered.set(node as Node, child)
      } else {
        hydrateElement(node as Element, child)
      }
      node = next
    } else {
      const created = createNode(child, ns, el.ownerDocument)
      if (created) el.insertBefore(created, node)
    }
  }
  while (node) {
    const extra: Node = node
    node = node.nextSibling
    el.removeChild(extra)
  }
  rendered.set(el, vnode)
}

/**
 * Hydrate `el` for the root `vnode` when it is foreign markup (not rendered
 * here) with the root's tag in namespace `ns`. Returns whether it did.
 */
export function hydrate(el: Element, vnode: VNode, ns: string): boolean {
  if (rendered.has(el) || !matches(el, vnode, ns)) return false
  hydrateElement(el, vnode)
  return true
}
