import { version } from '../package.json'

/** Version of the `@tabler/charts` package. */
export const VERSION: string = version

export { render } from './render/dom.ts'
export type { RenderToStringOptions } from './render/string.ts'
export { escapeAttr, escapeText, renderToString } from './render/string.ts'
export type {
  Attrs,
  AttrValue,
  Child,
  ChildInput,
  ClassValue,
  Key,
  Props,
  StyleValue,
  VNode,
} from './vnode.ts'
export { h, normalizeClass, normalizeStyle } from './vnode.ts'
