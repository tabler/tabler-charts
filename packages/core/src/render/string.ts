import type { Child, VNode } from '../vnode.ts'
import { isValidAttr, isValidTag } from './attrs.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface RenderToStringOptions {
  /**
   * Add `xmlns` to a root `<svg>` that has none, so the output is a valid
   * standalone `.svg` file. Defaults to `true`.
   */
  xmlns?: boolean
  /**
   * Markup context of the root. By default common HTML elements (`div`,
   * `table`, `button`…) render as HTML and everything else as SVG.
   */
  namespace?: 'svg' | 'html'
}

/** Root tags treated as HTML when no namespace is given. */
const HTML_ROOTS = /* @__PURE__ */ new Set([
  'a',
  'b',
  'button',
  'caption',
  'div',
  'em',
  'i',
  'label',
  'li',
  'ol',
  'p',
  'section',
  'small',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
])

/** HTML elements that never have content and must not get a closing tag. */
const VOID = /* @__PURE__ */ new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

/**
 * Serialize a VNode tree to markup (SSR, static export): SVG trees as
 * XML-compatible SVG, HTML trees (legend, table, tooltip) as HTML.
 *
 * Empty elements self-close only inside SVG; in HTML they get an explicit
 * closing tag (`<th></th>`), since `<th/>` would open an element there.
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
  const svg = options.namespace ? options.namespace === 'svg' : !HTML_ROOTS.has(node.tag)
  return renderNode(root, svg)
}

function renderNode(node: VNode, parentInSvg: boolean): string {
  const { tag, attrs, children } = node
  if (!isValidTag(tag)) return ''
  const inSvg = parentInSvg || tag === 'svg'

  let out = `<${tag}`
  for (const name in attrs) {
    if (!isValidAttr(name)) continue
    out += ` ${name}="${escapeAttr(String(attrs[name]))}"`
  }

  if (children.length === 0) {
    if (inSvg) return `${out}/>`
    if (VOID.has(tag.toLowerCase())) return `${out}>`
  }

  out += '>'
  // Content of foreignObject is HTML again.
  const childInSvg = inSvg && tag !== 'foreignObject'
  for (const child of children) {
    out += typeof child === 'string' ? escapeText(child) : renderNode(child, childInSvg)
  }
  return `${out}</${tag}>`
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
