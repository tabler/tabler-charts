import type { Locale } from './format.ts'
import { type Hit, type HitTester, hitKey, toChartPoint } from './interaction.ts'
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
  /** Register how points map to data, for pointer interaction (ignored in SSR). */
  onHitTest(tester: HitTester): void
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
  onHitTest: (tester: HitTester) => void = () => {},
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
    onHitTest,
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
  /**
   * The hovered category (or mark) changed, or its data changed while hovered.
   * `hit` is `null` when the pointer left the plot.
   */
  hover: { hit: Hit | null; event?: PointerEvent }
  /** A click on the plot. */
  click: { hit: Hit; event: MouseEvent }
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
  private readonly unlisten: () => void
  private destroyed = false
  private tester: HitTester | undefined
  /** Last pointer position in chart pixels while hovering. */
  private pointer: { x: number; y: number } | undefined
  private hovered = ''

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
    this.unlisten = this.listen()
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
    this.tester = undefined
    render(
      this.element,
      buildChart(this.cfg, size, this.id, (tester) => {
        this.tester = tester
      }),
    )
    this.emit('render', { size })
    // Keep hover consumers (tooltips) in sync with new data or layout.
    if (this.pointer) this.hover(this.pointer, undefined, true)
    return this
  }

  /** What lies at a point in chart pixels, or `null`. */
  hitTest(x: number, y: number): Hit | null {
    return this.tester?.(x, y) ?? null
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
    this.unlisten()
    this.handlers.clear()
    render(this.element, null)
  }

  /** One set of delegated listeners on the element; survives re-renders. */
  private listen(): () => void {
    const el = this.element
    if (typeof el.addEventListener !== 'function') return () => {}

    const local = (event: MouseEvent) => {
      const svg = el.querySelector('svg.tc-chart')
      if (!svg) return undefined
      const { width, height } = this.size
      return toChartPoint(svg, event.clientX, event.clientY, width, height)
    }
    const onMove = (event: PointerEvent) => {
      const point = local(event)
      if (point) this.hover(point, event)
    }
    const onLeave = (event: PointerEvent) => {
      // On touch, keep the last hover after the finger lifts.
      if (event.pointerType === 'touch') return
      this.pointer = undefined
      this.setHover(null, event)
    }
    const onClick = (event: MouseEvent) => {
      const point = local(event)
      const hit = point ? this.hitTest(point.x, point.y) : null
      if (hit) this.emit('click', { hit, event })
    }

    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerdown', onMove as EventListener)
    el.addEventListener('pointerleave', onLeave as EventListener)
    el.addEventListener('click', onClick as EventListener)
    return () => {
      el.removeEventListener('pointermove', onMove as EventListener)
      el.removeEventListener('pointerdown', onMove as EventListener)
      el.removeEventListener('pointerleave', onLeave as EventListener)
      el.removeEventListener('click', onClick as EventListener)
    }
  }

  private hover(point: { x: number; y: number }, event?: PointerEvent, force = false): void {
    this.pointer = point
    this.setHover(this.hitTest(point.x, point.y), event, force)
  }

  private setHover(hit: Hit | null, event?: PointerEvent, force = false): void {
    const key = hitKey(hit)
    if (!force && key === this.hovered) return
    // After a re-render, only a hover that is still active is worth repeating.
    if (force && key === '' && this.hovered === '') return
    this.hovered = key
    this.emit('hover', event ? { hit, event } : { hit })
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
