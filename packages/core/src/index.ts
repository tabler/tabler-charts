import { version } from '../package.json'

/** Version of the `@tabler/charts` package. */
export const VERSION: string = version

export type { AxisOptions, AxisPosition, LinearTicksOptions, Tick } from './components/axis.ts'
export { axis, axisSize, bandTicks, linearTicks, thinTicks } from './components/axis.ts'
export type { GridOptions } from './components/grid.ts'
export { grid } from './components/grid.ts'
export type { DateFormat, Locale, NumberFormat } from './format.ts'
export {
  formatDate,
  formatNumber,
  formatTicks,
  getDateFormat,
  getNumberFormat,
  stepPrecision,
} from './format.ts'
export type { Insets, InsetsInput, Rect } from './layout.ts'
export { estimateTextWidth, innerRect, insets, LINE_HEIGHT } from './layout.ts'
export { render } from './render/dom.ts'
export type { RenderToStringOptions } from './render/string.ts'
export { escapeAttr, escapeText, renderToString } from './render/string.ts'
export type { BandKey, BandScale, BandScaleOptions } from './scales/band.ts'
export { band, point } from './scales/band.ts'
export { extent } from './scales/extent.ts'
export type { LinearScale, LinearScaleOptions } from './scales/linear.ts'
export { linear } from './scales/linear.ts'
export { niceDomain, tickIncrement, tickStep, ticks } from './scales/ticks.ts'
export type { Curve, PathOptions, Point } from './shapes/path.ts'
export { areaPath, linePath } from './shapes/path.ts'
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
