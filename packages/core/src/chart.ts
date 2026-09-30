import type { DataTable } from './a11y.ts'
import type { Locale } from './format.ts'
import { type Hit, hitKey, type Interaction, toChartPoint } from './interaction.ts'
import { defaultHidden, type LegendItem, type LegendOptions } from './legend.ts'
import type { ChartPlugin, PluginInstance } from './plugin.ts'
import { render } from './render/dom.ts'
import { renderToString } from './render/string.ts'
import { observeResize } from './resize.ts'
import { cancel, schedule } from './scheduler.ts'
import type { TooltipOptions } from './tooltip.ts'
import { type ChildInput, type ClassValue, h, type Props, type VNode } from './vnode.ts'

/** Size and environment a chart type renders into. */
export interface RenderContext {
  width: number
  height: number
  /** Font size used to estimate label sizes. */
  fontSize: number
  locale: Locale
  /** Unique, stable prefix for ids inside this chart. */
  id: string
  /** Register how pointer and keyboard map to data (ignored in SSR). */
  onHitTest(interaction: Interaction): void
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
  /**
   * The data as a text table, for screen readers and the visible table
   * option. `limit` is the most rows wanted; report the real count in `total`.
   */
  table?(options: O, context: RenderContext, limit: number): DataTable
}

export type { DataTable, LegendItem }

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
  /** Animate entrances and data updates. Defaults to `true` (reduced motion always wins). */
  animate?: boolean
  /**
   * Render the data as an HTML table: visually hidden for screen readers
   * (`true`, the default), shown below the chart (`'visible'`), or not at all.
   * An object sets `visible` and `maxRows` (default 1000; longer data is cut
   * and the caption says so).
   */
  table?: boolean | 'visible' | { visible?: boolean; maxRows?: number }
  /** Make the chart focusable and navigable with arrow keys. Defaults to `true`. */
  keyboard?: boolean
  /**
   * Extra plugins, installed when the chart is created. The default `Chart`
   * from `@tabler/charts` already includes the built-in ones; the bare `Chart`
   * from `@tabler/charts/core` only runs these.
   */
  plugins?: readonly ChartPlugin[]
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
  onHitTest: (interaction: Interaction) => void,
  hidden: ReadonlySet<string>,
): ChildInput {
  return config.type.render(config, renderContext(config, size, id, onHitTest, hidden))
}

/** Render context for a config and size (also used by plugins such as the data table). */
export function renderContext<O extends object>(
  config: ChartConfig<O>,
  size: Size,
  id: string,
  onHitTest: (interaction: Interaction) => void,
  hidden: ReadonlySet<string>,
): RenderContext {
  return {
    width: size.width,
    height: size.height,
    fontSize: config.fontSize ?? DEFAULT_FONT_SIZE,
    locale: config.locale,
    id,
    onHitTest,
    hidden,
  }
}

function assertType(config: ChartConfig<object>): void {
  if (!config.type || typeof config.type.render !== 'function') {
    throw new TypeError('@tabler/charts: `type` must be a chart type, e.g. `type: line`.')
  }
}

/** Legend entries of a config, whether a legend is shown and where. */
export interface ResolvedLegend {
  items: LegendItem[]
  show: boolean
  position: 'top' | 'bottom'
}

/** Legend entries of a config, and whether the legend is shown. */
export function resolveLegend<O extends object>(config: ChartConfig<O>): ResolvedLegend {
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
  extraAttrs?: Props,
): VNode {
  const { width, height } = size
  const titleId = config.title ? `${id}-title` : undefined
  const descId = config.description ? `${id}-desc` : undefined
  return h(
    'svg',
    {
      class: [
        'tc-chart',
        `tc-chart-${config.type.name}`,
        config.animate === false && 'tc-static',
        config.class,
      ],
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: 'img',
      'aria-labelledby': titleId,
      'aria-describedby': descId,
      ...extraAttrs,
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
  onHitTest: (interaction: Interaction) => void = () => {},
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
   * The highlighted category (or mark) changed, or its data changed while
   * highlighted. `hit` is `null` when the pointer left the plot.
   */
  hover: { hit: Hit | null; event?: PointerEvent }
  /** A click on the plot. */
  click: { hit: Hit; event: MouseEvent }
}

type Handler<T> = (event: T) => void

/** Where the current highlight came from. */
type Source =
  | { kind: 'pointer'; x: number; y: number }
  | { kind: 'index'; index: number; seriesIndex?: number }

/**
 * A chart bound to a DOM element: measures its container, renders SVG into
 * it, re-renders on `update()` and resize (batched per animation frame) and
 * turns pointer input into `hover` / `click` events. Features such as the
 * tooltip or legend are plugins; the `Chart` exported by `@tabler/charts`
 * installs the built-in ones.
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
  private readonly plugins: PluginInstance[]
  private destroyed = false
  private current: Interaction | undefined
  private source: Source | undefined
  private hovered = ''
  private hit: Hit | null = null
  /** Chart type output of the last render, reused while only the highlight changes. */
  private cache:
    | { cfg: ChartConfig<O>; width: number; height: number; hidden: string; content: ChildInput }
    | undefined
  private resizeTimer: ReturnType<typeof setTimeout> | undefined
  /** Visibility set by the user, overriding each entry's default. */
  private readonly toggled = new Map<string, boolean>()
  /** Server-rendered svg to take over on the first render, if any. */
  private adopt: Element | null

  constructor(
    target: Element | string,
    config: ChartConfig<O>,
    defaultPlugins: readonly ChartPlugin[] = [],
  ) {
    const element = typeof target === 'string' ? document.querySelector(target) : target
    if (!element) throw new Error(`@tabler/charts: element "${String(target)}" not found.`)
    this.element = element
    this.cfg = config
    this.id = config.id ?? nextId()
    this.adopt = element.querySelector(':scope > svg.tc-chart')
    this.measure()
    this.unobserve = observeResize(element, (width, height) => {
      // Our own SVG sets the container height unless it follows the container.
      const followsHeight = this.cfg.height === 'container'
      const changed =
        width !== this.measured.width || (followsHeight && height !== this.measured.height)
      this.measured = { width, height }
      if (changed) {
        this.markResizing()
        this.schedule()
      }
    })
    this.unlisten = this.listen()
    const self = this as unknown as Chart<object>
    this.plugins = [...defaultPlugins, ...(config.plugins ?? [])].map((plugin) =>
      plugin.install(self),
    )
    this.render()
  }

  /** Current configuration. */
  get config(): ChartConfig<O> {
    return this.cfg
  }

  /** Size of the last render. */
  get size(): Size {
    // In 'container' height mode, plugins such as the legend take part of the container.
    let reserved = 0
    for (const plugin of this.plugins) reserved += plugin.reservedHeight?.() ?? 0
    const measured =
      reserved && this.measured.height
        ? { ...this.measured, height: this.measured.height - reserved }
        : this.measured
    return resolveSize(this.cfg, measured)
  }

  /** How pointer and keyboard map to data for the current render. */
  get interaction(): Interaction | undefined {
    return this.current
  }

  /** The highlighted category (hover or keyboard), or `null`. */
  get active(): Hit | null {
    return this.hit
  }

  /** Where the highlight is anchored in chart pixels (pointer, or the focused value). */
  get anchor(): { x: number; y: number } | undefined {
    const source = this.source
    const hit = this.hit
    if (!source || !hit) return undefined
    if (source.kind === 'pointer') return { x: source.x, y: source.y }
    const item = hit.items.find((i) => i.seriesIndex === hit.seriesIndex) ?? hit.items[0]
    if (hit.axis === 'y') return { x: item?.x ?? hit.x, y: hit.y ?? hit.area.y }
    return { x: hit.x, y: item?.y ?? hit.area.y + hit.area.height / 2 }
  }

  /** Whether the highlight comes from the pointer or from `highlightIndex()` (keyboard). */
  get highlightSource(): 'pointer' | 'index' | undefined {
    return this.hit ? this.source?.kind : undefined
  }

  /**
   * Highlight a category by index (and optionally one series in it), as
   * keyboard navigation does. Returns the hit, or `null` for an invalid index.
   */
  highlightIndex(index: number, seriesIndex?: number): Hit | null {
    const hit = this.current?.hitIndex(index, seriesIndex) ?? null
    if (!hit) return null
    this.source =
      seriesIndex === undefined ? { kind: 'index', index } : { kind: 'index', index, seriesIndex }
    this.setHover(hit)
    return hit
  }

  /** Remove any highlight. */
  clearHighlight(): void {
    this.source = undefined
    this.setHover(null)
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
    const config = cfg as ChartConfig<object>
    assertType(config)
    const legend = resolveLegend(cfg)
    const hidden = this.hiddenSet(legend.items)
    const hiddenKey = [...hidden].sort().join('\u0000')
    for (const plugin of this.plugins) plugin.beforeRender?.({ config, legend, hidden })
    const size = this.size

    let cache = this.cache
    const stale =
      !cache ||
      cache.cfg !== cfg ||
      cache.width !== size.width ||
      cache.height !== size.height ||
      cache.hidden !== hiddenKey
    if (!cache || stale) {
      this.current = undefined
      const content = renderContent(
        cfg,
        size,
        this.id,
        (interaction) => {
          this.current = interaction
        },
        hidden,
      )
      cache = { cfg, width: size.width, height: size.height, hidden: hiddenKey, content }
      this.cache = cache
    }

    // Keep the highlight (and its consumers, like tooltips) in sync with new data or layout.
    const source = this.source
    if (stale && source) {
      const next =
        source.kind === 'pointer'
          ? this.hitTest(source.x, source.y)
          : (this.current?.hitIndex(source.index, source.seriesIndex) ?? null)
      this.setHover(next, undefined, true, false)
    }

    const hit = this.hit
    const under: ChildInput[] = []
    const over: ChildInput[] = []
    let attrs: Props | undefined
    for (const plugin of this.plugins) {
      if (hit && plugin.layers) {
        const layer = plugin.layers(hit, config)
        under.push(layer.under)
        over.push(layer.over)
      }
      const extra = plugin.svgAttrs?.(config)
      if (extra) attrs = { ...attrs, ...extra }
    }
    render(
      this.element,
      composeChart(config, size, this.id, cache.content, under, over, attrs),
      this.adopt,
    )
    this.adopt = null

    for (const plugin of this.plugins) plugin.afterRender?.({ config, legend, hidden, size, stale })
    if (stale) this.emit('render', { size })
    return this
  }

  /** What lies at a point in chart pixels, or `null`. */
  hitTest(x: number, y: number): Hit | null {
    return this.current?.hitTest(x, y) ?? null
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
    clearTimeout(this.resizeTimer)
    this.unobserve()
    this.unlisten()
    for (const plugin of this.plugins) plugin.destroy?.()
    this.handlers.clear()
    render(this.element, null)
  }

  /** One set of delegated pointer listeners on the element; survives re-renders. */
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
      if (!point) return
      this.source = { kind: 'pointer', x: point.x, y: point.y }
      this.setHover(this.hitTest(point.x, point.y), event)
    }
    const onLeave = (event: PointerEvent) => {
      // On touch, keep the last highlight after the finger lifts.
      if (event.pointerType === 'touch' || this.source?.kind !== 'pointer') return
      this.source = undefined
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

  /**
   * Update the highlighted hit: emit `hover` when it changed (or when
   * `force`d after new data) and re-render the hover layers in the next frame.
   */
  private setHover(hit: Hit | null, event?: PointerEvent, force = false, rerender = true): void {
    const key = hitKey(hit)
    if (!force && key === this.hovered) return
    // After a re-render, only a highlight that is still active is worth repeating.
    if (force && key === '' && this.hovered === '') return
    this.hovered = key
    this.hit = hit
    this.emit('hover', event ? { hit, event } : { hit })
    if (rerender) this.schedule()
  }

  private hiddenSet(items: readonly LegendItem[]): Set<string> {
    const hidden = new Set<string>()
    for (const item of items) {
      if (this.toggled.get(item.key) ?? item.hidden) hidden.add(item.key)
    }
    return hidden
  }

  /** Suspend transitions while the container keeps resizing (see `[data-resizing]` in CSS). */
  private markResizing(): void {
    const svg = this.element.querySelector(':scope > svg.tc-chart')
    if (!svg) return
    svg.setAttribute('data-resizing', '')
    clearTimeout(this.resizeTimer)
    this.resizeTimer = setTimeout(() => svg.removeAttribute('data-resizing'), 200)
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
