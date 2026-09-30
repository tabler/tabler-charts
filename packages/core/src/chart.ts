import { hoverOverlay, hoverUnderlay } from './components/hover.ts'
import type { Locale } from './format.ts'
import { type Hit, type HitTester, hitKey, toChartPoint } from './interaction.ts'
import { defaultHidden, type LegendItem, type LegendOptions, legendContent } from './legend.ts'
import { render } from './render/dom.ts'
import { renderToString } from './render/string.ts'
import { observeResize } from './resize.ts'
import { cancel, schedule } from './scheduler.ts'
import { placeTooltip, type TooltipOptions, tooltipContent } from './tooltip.ts'
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
  /** Keys of legend entries (series) currently hidden. */
  hidden: ReadonlySet<string>
}

/**
 * A chart type plugin (`line`, `bar`, …). Receives the chart options and
 * returns the content of the root `<svg>`.
 */
export interface ChartType<O extends object = object> {
  readonly name: string
  render(options: O, context: RenderContext): ChildInput
  /** Entries for the legend (series, slices); charts without it get no legend. */
  legend?(options: O): LegendItem[]
}

export type { LegendItem }

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
  /** Show a tooltip on hover, optionally with custom content. Defaults to `true`. */
  tooltip?: boolean | TooltipOptions
  /** Show a vertical crosshair on hover (point charts). Defaults to `true`. */
  crosshair?: boolean
  /** Show a legend with toggles. Defaults to showing it for two or more entries. */
  legend?: boolean | LegendOptions
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

/** Run the chart type's `render()` for a config and size. */
function renderContent<O extends object>(
  config: ChartConfig<O>,
  size: Size,
  id: string,
  onHitTest: (tester: HitTester) => void,
  hidden: ReadonlySet<string>,
): ChildInput {
  return config.type.render(config, {
    width: size.width,
    height: size.height,
    fontSize: config.fontSize ?? DEFAULT_FONT_SIZE,
    locale: config.locale,
    id,
    onHitTest,
    hidden,
  })
}

function assertType(config: ChartConfig<object>): void {
  if (!config.type || typeof config.type.render !== 'function') {
    throw new TypeError('@tabler/charts: `type` must be a chart type, e.g. `type: line`.')
  }
}

/** Legend entries of a config, and whether the legend is shown. */
export function resolveLegend<O extends object>(
  config: ChartConfig<O>,
): { items: LegendItem[]; show: boolean; position: 'top' | 'bottom' } {
  const items = config.type.legend?.(config) ?? []
  const option = config.legend
  const show = option === undefined ? items.length >= 2 : option !== false && items.length > 0
  const position = typeof option === 'object' && option.position === 'bottom' ? 'bottom' : 'top'
  return { items, show, position }
}

/** Wrap chart content (and hover layers) in the accessible root `<svg>`. */
function composeChart(
  config: ChartConfig<object>,
  size: Size,
  id: string,
  content: ChildInput,
  underlay?: ChildInput,
  overlay?: ChildInput,
): VNode {
  const { width, height } = size
  const titleId = config.title ? `${id}-title` : undefined
  const descId = config.description ? `${id}-desc` : undefined
  return h(
    'svg',
    {
      class: ['tc-chart', `tc-chart-${config.type.name}`, config.class],
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: 'img',
      'aria-labelledby': titleId,
      'aria-describedby': descId,
    },
    titleId && h('title', { id: titleId }, config.title),
    descId && h('desc', { id: descId }, config.description),
    underlay,
    content,
    overlay,
  )
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
  assertType(config as ChartConfig<object>)
  const hidden = defaultHidden(resolveLegend(config).items)
  const content = renderContent(config, size, id, onHitTest, hidden)
  return composeChart(config as ChartConfig<object>, size, id, content)
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
  /** A legend entry was toggled (by the user or `toggleSeries()`). */
  'legend-toggle': { key: string; name: string; index: number; hidden: boolean }
  /** After the chart content rendered into the DOM (not on hover-only updates). */
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
  private active: Hit | null = null
  /** Chart type output of the last render, reused while only hover state changes. */
  private cache:
    | { cfg: ChartConfig<O>; width: number; height: number; hidden: string; content: ChildInput }
    | undefined
  private tooltipEl: HTMLElement | undefined
  private legendEl: HTMLElement | undefined
  /** Visibility set by the user, overriding each entry's default. */
  private readonly toggled = new Map<string, boolean>()
  private readonly addedContainerClass: boolean

  constructor(target: Element | string, config: ChartConfig<O>) {
    const element = typeof target === 'string' ? document.querySelector(target) : target
    if (!element) throw new Error(`@tabler/charts: element "${String(target)}" not found.`)
    this.element = element
    this.cfg = config
    this.id = config.id ?? nextId()
    // Positioning context for the tooltip (zero specificity in CSS, so page styles win).
    this.addedContainerClass = !element.classList.contains('tc-container')
    element.classList.add('tc-container')
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
    // In 'container' height mode the legend takes part of the container.
    const legend = this.legendEl?.isConnected ? this.legendEl.offsetHeight : 0
    const measured =
      legend && this.measured.height
        ? { ...this.measured, height: this.measured.height - legend }
        : this.measured
    return resolveSize(this.cfg, measured)
  }

  /**
   * Show or hide a legend entry (series) by key, name or index; toggles when
   * `hidden` is omitted. Re-renders in the next frame.
   */
  toggleSeries(target: string | number, hidden?: boolean): this {
    const { items } = resolveLegend(this.cfg)
    const item =
      typeof target === 'number'
        ? items.find((entry) => entry.index === target)
        : (items.find((entry) => entry.key === target) ??
          items.find((entry) => entry.name === target))
    if (!item) return this
    const next = hidden ?? !this.hiddenSet(items).has(item.key)
    this.toggled.set(item.key, next)
    this.emit('legend-toggle', { key: item.key, name: item.name, index: item.index, hidden: next })
    this.schedule()
    return this
  }

  /** Whether a legend entry is hidden. */
  isHidden(key: string): boolean {
    return this.hiddenSet(resolveLegend(this.cfg).items).has(key)
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
    const cfg = this.cfg
    assertType(cfg as ChartConfig<object>)
    const legend = resolveLegend(cfg)
    const hidden = this.hiddenSet(legend.items)
    const hiddenKey = [...hidden].sort().join('\u0000')
    this.renderLegend(legend, hidden)
    const size = this.size

    let cache = this.cache
    const stale =
      !cache ||
      cache.cfg !== cfg ||
      cache.width !== size.width ||
      cache.height !== size.height ||
      cache.hidden !== hiddenKey
    if (!cache || stale) {
      this.tester = undefined
      const content = renderContent(
        cfg,
        size,
        this.id,
        (tester) => {
          this.tester = tester
        },
        hidden,
      )
      cache = { cfg, width: size.width, height: size.height, hidden: hiddenKey, content }
      this.cache = cache
    }

    // Keep hover consumers (tooltips) in sync with new data or layout.
    if (this.pointer && stale)
      this.setHover(this.hitTest(this.pointer.x, this.pointer.y), undefined, true, false)

    const hit = this.active
    render(
      this.element,
      composeChart(
        cfg as ChartConfig<object>,
        size,
        this.id,
        cache.content,
        hit && hoverUnderlay(hit, cfg.crosshair !== false),
        hit && hoverOverlay(hit),
      ),
    )
    this.placeLegend()
    if (stale) this.emit('render', { size })
    this.updateTooltip()
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
    if (this.tooltipEl) {
      render(this.tooltipEl, null)
      this.tooltipEl.remove()
    }
    if (this.legendEl) {
      render(this.legendEl, null)
      this.legendEl.remove()
    }
    if (this.addedContainerClass) this.element.classList.remove('tc-container')
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

  private hover(point: { x: number; y: number }, event?: PointerEvent): void {
    this.pointer = point
    this.setHover(this.hitTest(point.x, point.y), event)
  }

  /**
   * Update the hovered hit: emit `hover` when it changed (or when `force`d
   * after new data) and re-render the hover layers in the next frame.
   */
  private setHover(hit: Hit | null, event?: PointerEvent, force = false, rerender = true): void {
    const key = hitKey(hit)
    if (!force && key === this.hovered) return
    // After a re-render, only a hover that is still active is worth repeating.
    if (force && key === '' && this.hovered === '') return
    this.hovered = key
    this.active = hit
    this.emit('hover', event ? { hit, event } : { hit })
    if (rerender) this.schedule()
  }

  /** Render, place or hide the tooltip for the active hit. */
  private updateTooltip(): void {
    const option = this.cfg.tooltip
    const hit = this.active
    const el = this.element as HTMLElement
    if (option === false || typeof document === 'undefined') return
    if (!hit || !this.pointer) {
      this.tooltipEl?.removeAttribute('data-visible')
      return
    }

    let tip = this.tooltipEl
    if (!tip) {
      tip = el.ownerDocument.createElement('div')
      tip.className = 'tc-tooltip'
      tip.setAttribute('aria-hidden', 'true')
      el.appendChild(tip)
      this.tooltipEl = tip
    }
    render(tip, tooltipContent(hit, typeof option === 'object' ? option : undefined))

    const svg = el.querySelector('svg.tc-chart')
    if (!svg) return
    const { width, height } = this.size
    const box = el.getBoundingClientRect()
    const rect = svg.getBoundingClientRect()
    const sx = rect.width > 0 ? rect.width / width : 1
    const sy = rect.height > 0 ? rect.height / height : 1
    const originX = rect.left - box.left - el.clientLeft
    const originY = rect.top - box.top - el.clientTop
    const anchor = { x: originX + hit.x * sx, y: originY + this.pointer.y * sy }
    const place = placeTooltip(
      anchor,
      { width: tip.offsetWidth, height: tip.offsetHeight },
      { width: el.clientWidth || width, height: el.clientHeight || height },
    )
    tip.style.transform = `translate(${place.x}px, ${place.y}px)`
    tip.dataset.side = place.side
    if (!tip.hasAttribute('data-visible')) {
      // Commit the position before becoming visible, so it does not glide in from the old spot.
      void getComputedStyle(tip).transform
      tip.setAttribute('data-visible', '')
    }
  }

  private hiddenSet(items: readonly LegendItem[]): Set<string> {
    const hidden = new Set<string>()
    for (const item of items) {
      if (this.toggled.get(item.key) ?? item.hidden) hidden.add(item.key)
    }
    return hidden
  }

  /** Render (or remove) the legend above or below the SVG. */
  private renderLegend(
    legend: ReturnType<typeof resolveLegend>,
    hidden: ReadonlySet<string>,
  ): void {
    if (!legend.show || typeof document === 'undefined') {
      if (this.legendEl) {
        render(this.legendEl, null)
        this.legendEl.remove()
        this.legendEl = undefined
      }
      return
    }
    let el = this.legendEl
    if (!el) {
      el = this.element.ownerDocument.createElement('div')
      el.className = 'tc-legend'
      el.addEventListener('click', (event) => {
        const button = (event.target as Element).closest?.('.tc-legend-item')
        const key = button?.getAttribute('data-key')
        if (key != null) this.toggleSeries(key)
      })
      this.legendEl = el
    }
    el.dataset.position = legend.position
    render(el, legendContent(legend.items, hidden))
    this.placeLegend()
  }

  /** Keep the legend right before or after the SVG, whatever else lives in the container. */
  private placeLegend(): void {
    const el = this.legendEl
    if (!el) return
    const svg = this.element.querySelector(':scope > svg.tc-chart')
    if (el.dataset.position === 'bottom') {
      if (!svg) {
        if (!el.isConnected) this.element.appendChild(el)
      } else if (svg.nextElementSibling !== el) {
        svg.after(el)
      }
    } else if (!el.isConnected || el.nextElementSibling !== svg) {
      this.element.insertBefore(el, svg ?? this.element.firstChild)
    }
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
