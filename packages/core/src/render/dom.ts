import { features } from '../features.ts'
import type { Attrs, Child, VNode } from '../vnode.ts'
import { isValidAttr, isValidTag } from './attrs.ts'

export const SVG_NS = 'http://www.w3.org/2000/svg'
const HTML_NS = 'http://www.w3.org/1999/xhtml'

/** VNode each rendered DOM node was last patched with. */
export const rendered: WeakMap<Node, Child> = /* @__PURE__ */ new WeakMap<Node, Child>()

/** Root element rendered into each container. */
const roots = /* @__PURE__ */ new WeakMap<Element, Element>()

/**
 * Render a VNode tree into `container`.
 *
 * The first call mounts the tree; later calls patch the existing DOM in place,
 * reusing nodes matched by `key` (or by position for unkeyed children), so CSS
 * transitions on changed attributes keep working. Passing `null` unmounts.
 *
 * The rendered root is appended to `container`; other content of the
 * container is left untouched. On the first call, `replace` names an element
 * already in the container (e.g. server-rendered markup) for the root: when
 * it has the root's tag and `@tabler/charts/hydrate` is loaded (it is part
 * of `@tabler/charts`), its nodes are hydrated: reused and patched to the
 * tree, so nothing is re-created and entrance animations do not run again.
 * Otherwise the root takes its place.
 */
export function render(
  container: Element,
  vnode: VNode | null,
  replace?: Element | null,
): Element | null {
  const prev = roots.get(container) ?? (replace?.parentNode === container ? replace : undefined)

  if (vnode === null || !isValidTag(vnode.tag)) {
    if (prev) {
      prev.remove()
      roots.delete(container)
    }
    return null
  }

  if (prev && canPatch(prev, vnode)) {
    patchElement(prev, vnode)
    roots.set(container, prev)
    return prev
  }

  if (prev && features.hydrate?.(prev, vnode, namespaceFor(container, vnode.tag))) {
    roots.set(container, prev)
    return prev
  }

  const el = createElement(vnode, namespaceFor(container, vnode.tag), container.ownerDocument)
  if (prev) prev.replaceWith(el)
  else container.appendChild(el)
  roots.set(container, el)
  return el
}

function namespaceFor(parent: Element, tag: string): string {
  if (tag === 'svg') return SVG_NS
  if (parent.namespaceURI === SVG_NS && parent.localName !== 'foreignObject') return SVG_NS
  return HTML_NS
}

export function childNamespace(el: Element): string {
  return el.namespaceURI === SVG_NS && el.localName !== 'foreignObject' ? SVG_NS : HTML_NS
}

export function createNode(child: Child, ns: string, doc: Document): Node | null {
  if (typeof child === 'string') {
    const text = doc.createTextNode(child)
    rendered.set(text, child)
    return text
  }
  if (!isValidTag(child.tag)) return null
  return createElement(child, child.tag === 'svg' ? SVG_NS : ns, doc)
}

function createElement(vnode: VNode, ns: string, doc: Document): Element {
  const el = doc.createElementNS(ns, vnode.tag)
  const { attrs } = vnode
  for (const name in attrs) {
    if (isValidAttr(name)) el.setAttribute(name, String(attrs[name]))
  }
  const childNs = childNamespace(el)
  for (const child of vnode.children) {
    const node = createNode(child, childNs, doc)
    if (node) el.appendChild(node)
  }
  rendered.set(el, vnode)
  return el
}

function canPatch(node: Node, next: Child): boolean {
  const prev = rendered.get(node)
  if (prev === undefined) return false
  if (typeof next === 'string') return typeof prev === 'string'
  return typeof prev !== 'string' && prev.tag === next.tag && prev.key === next.key
}

function patchNode(node: Node, next: Child): void {
  if (typeof next === 'string') {
    if (rendered.get(node) !== next) {
      ;(node as Text).data = next
      rendered.set(node, next)
    }
    return
  }
  patchElement(node as Element, next)
}

function patchElement(el: Element, next: VNode): void {
  const prev = rendered.get(el) as VNode
  if (prev === next) return
  patchAttrs(el, prev.attrs, next.attrs, true)
  patchChildren(el, next.children)
  rendered.set(el, next)
}

export function patchAttrs(el: Element, prev: Attrs, next: Attrs, update = false): void {
  for (const name in next) {
    const value = next[name] as string | number
    if (prev[name] === value || !isValidAttr(name)) continue
    // Where CSS cannot transition `d` (Safari), the morph feature animates it.
    if (update && name === 'd' && features.morph?.(el, String(prev[name] ?? ''), String(value))) {
      continue
    }
    el.setAttribute(name, String(value))
  }
  for (const name in prev) {
    if (!(name in next) && isValidAttr(name)) el.removeAttribute(name)
  }
}

function patchChildren(parent: Element, next: Child[]): void {
  if (next.length === 0 && parent.firstChild === null) return

  const oldNodes = Array.from(parent.childNodes)
  const keyed = new Map<unknown, Node>()
  const unkeyed: Node[] = []

  for (const node of oldNodes) {
    const vnode = rendered.get(node)
    if (vnode === undefined) continue
    if (typeof vnode !== 'string' && vnode.key !== undefined) keyed.set(vnode.key, node)
    else unkeyed.push(node)
  }

  // Match new children against existing nodes.
  const matched = new Array<Node | undefined>(next.length)
  const used = new Set<Node>()
  let cursor = 0
  for (let i = 0; i < next.length; i++) {
    const child = next[i] as Child
    let candidate: Node | undefined
    if (typeof child !== 'string' && child.key !== undefined) {
      candidate = keyed.get(child.key)
    } else if (cursor < unkeyed.length) {
      candidate = unkeyed[cursor]
    }
    if (candidate && !used.has(candidate) && canPatch(candidate, child)) {
      matched[i] = candidate
      used.add(candidate)
      if (candidate === unkeyed[cursor]) cursor++
    }
  }

  // Remove unmatched nodes first, so placing the rest needs as few moves as possible.
  for (const node of oldNodes) {
    if (!used.has(node)) parent.removeChild(node)
  }

  // Patch or create, then place from the end using the next sibling as anchor.
  const ns = childNamespace(parent)
  const doc = parent.ownerDocument
  let anchor: Node | null = null
  for (let i = next.length - 1; i >= 0; i--) {
    const child = next[i] as Child
    let node = matched[i]
    if (node) {
      patchNode(node, child)
    } else {
      node = createNode(child, ns, doc) ?? undefined
      if (!node) continue
    }
    if (node.parentNode !== parent || node.nextSibling !== anchor) {
      parent.insertBefore(node, anchor)
    }
    anchor = node
  }
}
