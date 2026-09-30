import type { Locale } from './format.ts'
import { render } from './render/dom.ts'
import { renderToString } from './render/string.ts'
import { observeResize } from './resize.ts'
import { cancel, schedule } from './scheduler.ts'
import { type ChildInput, type ClassValue, h, type VNode } from './vnode.ts'

/** Size and environment a chart type renders into. */
export interface RenderContext {
  width: number
  height: number
  /** Font size used to estimate label sizes. */
  fontSize: number
  locale: Locale
  /** Unique, stable prefix for ids inside this chart. */
  id: string
}

/**
 * A chart type plugin (`line`, `bar`, …). Receives the chart options and
 * returns the content of the root `<svg>`.
 */
export interface ChartType<O extends object = object> {
  readonly name: string
  render(options: O, context: RenderContext): ChildInput
}

/** Options shared by every chart type. */
export interface BaseOptions {
  /** Fixed width in pixels. Defaults to the container width. */
  width?: number
  /**
   * Height in pixels, or `'container'` to follow the container's height (the
   * container then needs a height of its own). Defaults to width / aspectRatio.
   */
  height?: number | 'container'
  /** Width to height ratio used when `height` is not set. Defaults to `2`. */
  aspectRatio?: number
  /** Accessible name of the chart. */
  title?: string
  /** Longer accessible description. */
  description?: string
  /** Extra classes on the root `<svg>`. */
  class?: ClassValue
  /** Locale for number and date formatting. Set it explicitly for SSR. */
  locale?: Locale
  /** Font size used for layout (keep in sync with `--tc-font-size`). Defaults to `12`. */
  fontSize?: number
  /** Id prefix; set it explicitly for SSR so server and client ids match. */
  id?: string
}

/** Full chart configuration: base options, the chart type and its options. */
export type ChartConfig<O extends object = object> = BaseOptions & O & { type: ChartType<O> }

export interface Size {
  width: number
  height: number
}

const DEFAULT_WIDTH = 600
const DEFAULT_ASPECT_RATIO = 2
const DEFAULT_FONT_SIZE = 12

let uid = 0
const nextId = (): string => `tc-${++uid}`

/** Resolve the final pixel size from options and the measured container size. */
export function resolveSize(options: BaseOptions, measured?: Partial<Size>): Size {
  const measuredWidth = measured?.width ?? 0
  const width = Math.max(
    0,
    Math.round(options.width ?? (measuredWidth > 0 ? measuredWidth : DEFAULT_WIDTH)),
  )
  const ratio =
    options.aspectRatio && options.aspectRatio > 0 ? options.aspectRatio : DEFAULT_ASPECT_RATIO
  const height =
    typeof options.height === 'number'
      ? options.height
      : options.height === 'container' && (measured?.height ?? 0) > 0
        ? (measured?.height as number)
        : width / ratio
  return { width, height: Math.max(0, Math.round(height)) }
}

/**
 * Build the VNode tree of a chart: a pure function of the config and size,
 * shared by the DOM chart and server-side rendering.
 */
export function buildChart<O extends object>(
  config: ChartConfig<O>,
  size: Size,
  id: string = config.id ?? 'tc',
): VNode {
  const { type } = config
  if (!type || typeof type.render !== 'function') {
    throw new TypeError('@tabler/charts: `type` must be a chart type, e.g. `type: line`.')
  }
  const { width, height } = size
  const context: RenderContext = {
    width,
    height,
    fontSize: config.fontSize ?? DEFAULT_FONT_SIZE,
    locale: config.locale,
    id,
  }
  const titleId = config.title ? `${id}-title` : undefined
  const descId = config.description ? `${id}-desc` : undefined

  return h(
    'svg',
    {
      class: ['tc-chart', `tc-chart-${type.name}`, config.class],
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: 'img',
      'aria-labelledby': titleId,
      'aria-describedby': descId,
    },
    titleId && h('title', { id: titleId }, config.title),
    descId && h('desc', { id: descId }, config.description),
    type.render(config, context),
  )
}

/**
 * Render a chart to an SVG string, e.g. on the server.
 *
 * ```ts
 * chartToString({ type: line, data, id: 'sales', locale: 'en-US' }, { width: 600, height: 300 })
 * ```
 */
export function chartToString<O extends object>(config: ChartConfig<O>, size: Size): string {
  return renderToString(buildChart(config, size))
}

export interface ChartEvents {
  /** After the chart rendered into the DOM. */
  render: { size: Size }
}

type Handler<T> = (event: T) => void

/**
 * A chart bound to a DOM element: measures its container, renders SVG into
 * it and re-renders on `update()` and resize, batched per animation frame.
 *
 * ```ts
 * const chart = new Chart('#sales', { type: line, data })
 * chart.update({ data: next })
 * ```
 */
export class Chart<O extends object = object> {
  /** Element the chart renders into. */
  readonly element: Element
  /** Id prefix used for elements inside the chart. */
  readonly id: string
  private cfg: ChartConfig<O>
  private measured: Partial<Size> = {}
  private readonly handlers = new Map<keyof ChartEvents, Set<Handler<never>>>()
  private readonly unobserve: () => void
  private destroyed = false

  constructor(target: Element | string, config: ChartConfig<O>) {
    const element = typeof target === 'string' ? document.querySelector(target) : target
    if (!element) throw new Error(`@tabler/charts: element "${String(target)}" not found.`)
    this.element = element
    this.cfg = config
    this.id = config.id ?? nextId()
    this.measure()
    this.unobserve = observeResize(element, (width, height) => {
      // Our own SVG sets the container height unless it follows the container.
      const followsHeight = this.cfg.height === 'container'
      const changed =
        width !== this.measured.width || (followsHeight && height !== this.measured.height)
      this.measured = { width, height }
      if (changed) this.schedule()
    })
    this.render()
  }

  /** Current configuration. */
  get config(): ChartConfig<O> {
    return this.cfg
  }

  /** Size of the last render. */
  get size(): Size {
    return resolveSize(this.cfg, this.measured)
  }

  /** Merge `options` into the configuration and re-render in the next frame. */
  update(options: Partial<ChartConfig<O>>): this {
    this.cfg = { ...this.cfg, ...options }
    this.schedule()
    return this
  }

  /** Replace the data and re-render in the next frame. */
  setData(data: O extends { data: infer D } ? D : never): this {
    return this.update({ data } as unknown as Partial<ChartConfig<O>>)
  }

  /** Re-measure the container and re-render in the next frame. */
  resize(): this {
    this.measure()
    this.schedule()
    return this
  }

  /** Render synchronously now. */
  render(): this {
    if (this.destroyed) return this
    cancel(this)
    const size = this.size
    render(this.element, buildChart(this.cfg, size, this.id))
    this.emit('render', { size })
    return this
  }

  /** Subscribe to an event; returns a function that unsubscribes. */
  on<K extends keyof ChartEvents>(name: K, handler: Handler<ChartEvents[K]>): () => void {
    let set = this.handlers.get(name)
    if (!set) {
      set = new Set()
      this.handlers.set(name, set)
    }
    set.add(handler as Handler<never>)
    return () => {
      set.delete(handler as Handler<never>)
    }
  }

  /** Remove the chart from the DOM and stop observing its container. */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    cancel(this)
    this.unobserve()
    this.handlers.clear()
    render(this.element, null)
  }

  private schedule(): void {
    if (!this.destroyed) schedule(this, () => this.render())
  }

  /** Measure the content box, matching what `ResizeObserver` reports. */
  private measure(): void {
    const el = this.element as HTMLElement
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : undefined
    const px = (value: string | undefined) => Number.parseFloat(value ?? '') || 0
    this.measured = {
      width: el.clientWidth - px(style?.paddingLeft) - px(style?.paddingRight),
      height: el.clientHeight - px(style?.paddingTop) - px(style?.paddingBottom),
    }
  }

  private emit<K extends keyof ChartEvents>(name: K, event: ChartEvents[K]): void {
    const set = this.handlers.get(name)
    if (set) for (const handler of set) (handler as Handler<ChartEvents[K]>)(event)
  }
}
