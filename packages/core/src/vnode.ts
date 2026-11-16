/**
 * Minimal virtual node tree shared by the string (SSR) and DOM renderers.
 *
 * VNodes are plain, serializable data: no event handlers, no component
 * functions. Interaction is handled by event delegation on the root element,
 * so the same tree can be rendered on the server, in a worker or in tests.
 */

/** Value accepted for a single attribute. `false`, `null`, `undefined` and non-finite numbers omit it. */
export type AttrValue = string | number | boolean | null | undefined

/** Normalized attributes stored on a {@link VNode}. */
export type Attrs = Record<string, string | number>

/** Identity used by the DOM renderer to match nodes between renders. */
export type Key = string | number

/** Class list: strings, falsy values (skipped) and nested arrays. */
export type ClassValue = string | false | null | undefined | ClassValue[]

/** Inline styles: a raw string or a map of properties (custom properties included). */
export type StyleValue = string | Record<string, string | number | null | undefined>

/** Props accepted by {@link h}. */
export interface Props {
  [name: string]: AttrValue | ClassValue | StyleValue
  key?: Key | null | undefined
  class?: ClassValue
  style?: StyleValue | null | undefined
}

/** A normalized child: an element node or a text node. */
export type Child = VNode | string

/** Anything that can be passed as a child to {@link h}; falsy values are skipped. */
export type ChildInput = Child | number | boolean | null | undefined | ChildInput[]

export interface VNode {
  /** Element name, e.g. `svg`, `g`, `path`. */
  tag: string
  /** Normalized attributes, without `key`. */
  attrs: Attrs
  /** Flattened children with adjacent text merged. */
  children: Child[]
  /** Optional identity used by the keyed DOM patcher. */
  key: Key | undefined
  /**
   * The arc a path draws (radii, angles, pad angle, corner radius), kept out
   * of the markup: the DOM patcher sweeps from the arc of the last render to
   * this one (see `sweep`).
   */
  arc?: readonly number[]
}

/**
 * Create a virtual node.
 *
 * ```ts
 * h('g', { class: ['tc-series', `tc-series-${i}`], key: series.id },
 *   h('path', { class: 'tc-line', d }),
 * )
 * ```
 */
export function h(tag: string, props?: Props | null, ...children: ChildInput[]): VNode {
  const attrs: Attrs = {}
  let key: Key | undefined

  if (props) {
    for (const name in props) {
      const value = props[name]
      if (name === 'key') {
        if (value != null) key = value as Key
      } else if (name === 'class') {
        const cls = normalizeClass(value as ClassValue)
        if (cls) attrs.class = cls
      } else if (name === 'style') {
        const style = normalizeStyle(value as StyleValue | null | undefined)
        if (style) attrs.style = style
      } else if (value === true) {
        attrs[name] = ''
      } else if (typeof value === 'string') {
        attrs[name] = value
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        attrs[name] = value
      }
    }
  }

  const out: Child[] = []
  flattenChildren(children, out)

  return { tag, attrs, children: out, key }
}

/** Join a class value into a space separated string. */
export function normalizeClass(value: ClassValue): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  let result = ''
  for (const item of value) {
    const cls = normalizeClass(item)
    if (cls) result = result ? `${result} ${cls}` : cls
  }
  return result
}

/**
 * Values that could leave their declaration (`;`, braces, quotes, escapes,
 * comments) or load something (`url()` and friends). Colors and dashes often
 * come from user data, and `red;position:fixed` would restyle the chart's
 * elements, `url(…)` would make the browser request it. A reference to an
 * element of the page, `url(#id)` (pattern fills), loads nothing and passes.
 */
const UNSAFE =
  /[;{}<>"'\\]|\/\*|\b(?:url(?!\(#[\w-]+\))|src|attr|image|image-set|cross-fade|element|expression)\s*\(/i

/**
 * Serialize a style value into a CSS declaration list. In a map, values that
 * could inject CSS (see {@link UNSAFE}) are left out, so use one for values
 * from data; a raw string is taken as it is.
 */
export function normalizeStyle(value: StyleValue | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  let result = ''
  for (const prop in value) {
    const v = value[prop]
    if (v == null || v === '' || UNSAFE.test(String(v))) continue
    result += `${result ? ';' : ''}${prop}:${v}`
  }
  return result
}

function flattenChildren(input: ChildInput[], out: Child[]): void {
  for (const child of input) {
    if (child == null || typeof child === 'boolean') continue
    if (Array.isArray(child)) {
      flattenChildren(child, out)
      continue
    }
    if (typeof child === 'object') {
      out.push(child)
      continue
    }
    const text = String(child)
    if (text === '') continue
    const last = out.length - 1
    if (last >= 0 && typeof out[last] === 'string') {
      out[last] += text
    } else {
      out.push(text)
    }
  }
}
