import type { Child, VNode } from '../vnode.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Valid XML-ish tag and attribute names; anything else is skipped. */
const NAME_RE = /^[a-zA-Z_][\w:.-]*$/

export interface RenderToStringOptions {
  /**
   * Add `xmlns` to a root `<svg>` that has none, so the output is a valid
   * standalone `.svg` file. Defaults to `true`.
   */
  xmlns?: boolean
}

/**
 * Serialize a VNode tree to an SVG/XML string (SSR, static export).
 *
 * Text and attribute values are escaped. Invalid tag or attribute names and
 * inline event handlers (`on*`) are dropped, so data coming from chart
 * options can never inject markup or scripts.
 */
export function renderToString(node: Child, options: RenderToStringOptions = {}): string {
  if (typeof node === 'string') return escapeText(node)
  const root =
    options.xmlns !== false && node.tag === 'svg' && node.attrs.xmlns === undefined
      ? { ...node, attrs: { xmlns: SVG_NS, ...node.attrs } }
      : node
  return renderNode(root)
}

function renderNode(node: VNode): string {
  const { tag, attrs, children } = node
  if (!NAME_RE.test(tag)) return ''

  let out = `<${tag}`
  for (const name in attrs) {
    if (!NAME_RE.test(name) || isEventHandler(name)) continue
    out += ` ${name}="${escapeAttr(String(attrs[name]))}"`
  }

  if (children.length === 0) return `${out}/>`

  out += '>'
  for (const child of children) {
    out += typeof child === 'string' ? escapeText(child) : renderNode(child)
  }
  return `${out}</${tag}>`
}

const EVENT_RE = /^on/i

function isEventHandler(name: string): boolean {
  return EVENT_RE.test(name)
}

const TEXT_RE = /[&<>]/
const ATTR_RE = /[&"<>]/
const TEXT_RE_G = /[&<>]/g
const ATTR_RE_G = /[&"<>]/g
const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
const replaceEntity = (char: string): string => ENTITIES[char] as string

/** Escape text content. */
export function escapeText(value: string): string {
  return TEXT_RE.test(value) ? value.replace(TEXT_RE_G, replaceEntity) : value
}

/** Escape a double-quoted attribute value. */
export function escapeAttr(value: string): string {
  return ATTR_RE.test(value) ? value.replace(ATTR_RE_G, replaceEntity) : value
}
