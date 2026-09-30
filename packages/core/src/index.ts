import { version } from '../package.json'

/** Version of the `@tabler/charts` package. */
export const VERSION: string = version

export { render } from './render/dom.ts'
export type { RenderToStringOptions } from './render/string.ts'
export { escapeAttr, escapeText, renderToString } from './render/string.ts'
export type { BandKey, BandScale, BandScaleOptions } from './scales/band.ts'
export { band, point } from './scales/band.ts'
export { extent } from './scales/extent.ts'
export type { LinearScale, LinearScaleOptions } from './scales/linear.ts'
export { linear } from './scales/linear.ts'
export { niceDomain, tickIncrement, tickStep, ticks } from './scales/ticks.ts'
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
