import type { DataTable } from './a11y.ts'
import type { ValueLabelOptions } from './charts/value-labels.ts'
import { feature, features } from './features.ts'
import type { Locale, NumberFormat } from './format.ts'
import { type Hit, hitKey, type Interaction } from './interaction.ts'
import { defaultHidden, type LegendItem, type LegendOptions } from './legend.ts'
import type { ChartPlugin, PluginInstance } from './plugin.ts'
import type { DownloadOption } from './plugins/download.ts'
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
  /** Lay the chart out right to left (the `rtl` option, resolved). */
  rtl?: boolean
}

/**
 * A chart type plugin (`line`, `bar`, …). Receives the chart options and
 * returns the content of the root `<svg>`.
 */
export interface ChartType<O extends object = object> {
  readonly name: string
  /**
   * Clean options that may come from outside (data, annotations, axis
   * bounds from users, APIs, JSON) into the shape `render()` expects; called
   * as the config comes in, before anything reads it.
   */
  clean?(options: O): unknown
  render(options: O, context: RenderContext): ChildInput
  /** Entries for the legend (series, slices); charts without it get no legend. */
  legend?(options: O): LegendItem[]
  /**
   * The data as a text table, for screen readers and the visible table
   * option. `limit` is the most rows wanted; report the real count in `total`.
   */
  table?(options: O, context: RenderContext, limit: number): DataTable
  /**
   * Whether the chart should be focusable and keyboard-navigable by default
   * (`keyboard` in the config overrides it). Decorative types such as
   * sparklines opt out so a page of stat tiles does not multiply tab stops.
   */
  readonly keyboard?: boolean
  /**
   * How value labels (`valueLabels`) read this chart type, when not as bars
   * or points: `marks: 'slice'` writes each value as its share, inside its
   * slice; `marks: 'cell'` writes it in the middle of its mark. `format`
   * names the number format of the values in the options (by default a label
   * shows the text of the tooltip).
   */
  readonly valueLabels?: {
    marks?: 'slice' | 'cell'
    format?(options: O): NumberFormat | undefined
  }
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
  /**
   * Mirror the layout for right-to-left pages: the value axis on the right
   * and categories running from the right (`x.reverse` overrides the latter).
   * `'auto'` follows the `direction` of the container (left to right in SSR).
   * Line, area, bar and candlestick charts. Defaults to `false`.
   */
  rtl?: boolean | 'auto'
  /**
   * Font size used to lay out labels. In the browser it is read from the
   * `--tc-font-size` custom property of the container when not set; set it
   * explicitly for SSR so server and client layouts match. Defaults to `12`.
   */
  fontSize?: number
  /** Id prefix; set it explicitly for SSR so server and client ids match. */
  id?: string
  /** Show a tooltip on hover, optionally with custom content. Defaults to `true`. */
  tooltip?: boolean | TooltipOptions
  /** Show a vertical crosshair on hover (point charts). Defaults to `true`. */
  crosshair?: boolean
  /** Show a legend with toggles. Defaults to showing it for two or more entries. */
  legend?: boolean | LegendOptions
  /**
   * Animate entrances and data updates (reduced motion always wins). By
   * default charts animate unless they draw more than 1000 elements (e.g. a
   * scatter of a thousand points), where transitions cost far more frame
   * time than they show; `true` animates those too.
   */
  animate?: boolean
  /**
   * Fill bars, areas, slices, rings and bubbles with patterns (and dash
   * lines), so series do not depend on color alone: `true` always, `'auto'`
   * (the default) only in forced colors (Windows High Contrast), where the
   * colors are gone, `false` never. Needs `@tabler/charts/patterns` on the
   * core (`@tabler/charts` includes it).
   */
  patterns?: boolean | 'auto'
  /**
   * Write the values on the marks: bars at their end, stacked segments,
   * cells and slices inside (slices show their share), lines and points
   * above their last point (`points: 'all'` for every one). Labels that do
   * not fit are left out. Needs `@tabler/charts/value-labels` on the core
   * (`@tabler/charts` includes it).
   */
  valueLabels?: boolean | ValueLabelOptions
  /**
   * Share the hover with the other charts of this group: the category under
   * the pointer is highlighted in all of them (matched by label), with its
   * tooltip. Needs the `sync()` plugin (the `Chart` of `@tabler/charts` has it).
   */
  sync?: string
  /**
   * Give the points of each series a shape of their own (circle, square,
   * triangle, diamond…) in line, radar and scatter charts, so they do not
   * depend on color alone. Defaults to `patterns === true`. Needs
   * `@tabler/charts/point-shapes` on the core (`@tabler/charts` includes it).
   */
  shapes?: boolean
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
   * A download menu in the chart's corner: `true` offers PNG and SVG, a list
   * picks the formats (`['png', 'svg', 'jpeg', 'webp']`), an object also
   * sets the file name and the export options. Needs `@tabler/charts/export`
   * imported, and on the core the `download()` plugin (the `Chart` of
   * `@tabler/charts` has it).
   */
  download?: DownloadOption
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
  // (Sizes that are not finite numbers count as not set.)
  const width = Math.max(
    0,
    Math.round(
      Number.isFinite(options.width)
        ? (options.width as number)
        : measuredWidth > 0
          ? measuredWidth
          : DEFAULT_WIDTH,
    ),
  )
  const ratio =
    options.aspectRatio && options.aspectRatio > 0 ? options.aspectRatio : DEFAULT_ASPECT_RATIO
  const height = Number.isFinite(options.height)
    ? (options.height as number)
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
  fontSize?: number,
  rtl?: boolean,
): ChildInput {
  let found: Interaction | undefined
  const ctx = renderContext(
    config,
    size,
    id,
    (interaction) => {
      found = interaction
      onHitTest(interaction)
    },
    hidden,
    fontSize,
    rtl,
  )
  const content = config.type.render(config, ctx)
  // Optional features finish the content (point shapes, value labels).
  return features.post ? features.post(config as ChartConfig<object>, content, found, ctx) : content
}

/** Render context for a config and size (also used by plugins such as the data table). */
export function renderContext<O extends object>(
  config: ChartConfig<O>,
  size: Size,
  id: string,
  onHitTest: (interaction: Interaction) => void,
  hidden: ReadonlySet<string>,
  measuredFontSize?: number,
  rtl: boolean = config.rtl === true,
): RenderContext {
  return {
    rtl,
    width: size.width,
    height: size.height,
    fontSize: config.fontSize ?? measuredFontSize ?? DEFAULT_FONT_SIZE,
    locale: config.locale,
    id,
    onHitTest,
    hidden,
  }
}

/**
 * The config as cleaned by its chart type, without the options that are
 * numbers nothing can be drawn with (NaN, ±Infinity, from a division or a
 * parse gone wrong outside): their defaults apply, as if they were left out.
 */
function cleanData<O extends object>(config: ChartConfig<O>): ChartConfig<O> {
  const out = {
    ...(config.type?.clean ? (config.type.clean(config) as object) : config),
  } as Record<string, unknown>
  for (const key in out) {
    if (typeof out[key] === 'number' && !Number.isFinite(out[key])) delete out[key]
  }
  return out as ChartConfig<O>
}

function assertType(config: ChartConfig<object>): void {
  if (!config.type || typeof config.type.render !== 'function') {
    throw new TypeError('@tabler/charts: `type` must be a chart type such as line.')
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

/**
 * The chart's accessible name: its `title`, or else the chart type and its
 * legend entries ("line chart: Visitors, Sign-ups"), since an image without
 * a name is announced as nothing at all. Set `title` for a name in the
 * page's language.
 */
export function chartLabel(config: ChartConfig<object>): string {
  if (config.title) return config.title
  const names = (config.type.legend?.(config) ?? []).map((item) => item.name).filter(Boolean)
  const shown = names.slice(0, 6).join(', ')
  // Screen readers do not care for capitals; a long list of names is cut short.
  return `${config.type.name} chart${names.length ? `: ${shown}${names.length > 6 ? ', …' : ''}` : ''}`
}

/** Elements beyond which charts skip transitions unless `animate: true`. */
const ANIMATION_LIMIT = 1000

/** Number of elements in chart content. */
const countNodes = (child: ChildInput): number =>
  Array.isArray(child)
    ? child.reduce((n: number, c: ChildInput) => n + countNodes(c), 0)
    : child && typeof child === 'object'
      ? 1 + countNodes((child as VNode).children)
      : 0

/** Whether a chart renders without transitions: asked to, or too big to animate cheaply. */
const isStatic = (config: ChartConfig<object>, content: ChildInput): boolean =>
  config.animate === false || (config.animate !== true && countNodes(content) > ANIMATION_LIMIT)

/** Wrap chart content (and hover layers) in the accessible root `<svg>`. */
function composeChart(
  config: ChartConfig<object>,
  size: Size,
  id: string,
  still: boolean,
  content: ChildInput,
  underlay?: ChildInput,
  overlay?: ChildInput,
  extraAttrs?: Props,
  rtl: boolean = config.rtl === true,
): VNode {
  const { width, height } = size
  const descId = config.description ? `${id}-desc` : undefined
  const { patterns } = config
  // [class, root style, defs] of the pattern fills, when the chart has them.
  const fills =
    patterns === false
      ? undefined
      : (patterns === true ? feature('patterns') : features.patterns)?.(config, id)
  return h(
    'svg',
    {
      class: [
        'tc-chart',
        `tc-chart-${config.type.name}`,
        still && 'tc-static',
        rtl && 'tc-rtl',
        fills?.[0],
        config.class,
      ],
      style: fills?.[1],
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: 'img',
      // An svg <title> would also show as a native tooltip, so the name is an attribute.
      'aria-label': chartLabel(config),
      'aria-describedby': descId,
      ...extraAttrs,
    },
    // Keyed, so their coming and going never shifts the (unkeyed) chart
    // content in the DOM patcher: that would recreate it and restart animations.
    descId && h('desc', { key: 'desc', id: descId }, config.description),
    fills?.[2],
    underlay && h('g', { key: 'hover-under', class: 'tc-hover-layer' }, underlay),
    content,
    overlay && h('g', { key: 'hover-over', class: 'tc-hover-layer' }, overlay),
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
  config = cleanData(config)
  const hidden = defaultHidden(resolveLegend(config).items)
  const content = renderContent(config, size, id, onHitTest, hidden)
  const base = config as ChartConfig<object>
  return composeChart(base, size, id, isStatic(base, content), content)
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

/** The name of every chart event, for adapters that pass them all on. */
export const chartEvents: readonly (keyof ChartEvents)[] = [
  'hover',
  'click',
  'legend-toggle',
  'render',
]

type Handler<T> = (event: T) => void

/** Where the current highlight came from. */
type Source =
  | { kind: 'pointer'; x: number; y: number }
  | { kind: 'index'; index: number; seriesIndex?: number }

/** The output of a chart type, with what it was built for. */
interface Content<O extends object> {
  cfg: ChartConfig<O>
  width: number
  height: number
  hidden: string
  fontSize: number | undefined
  rtl: boolean
  content: ChildInput
  /** Whether the content renders without transitions. */
  still: boolean
}

/** The chart on each element. */
const mounted = /* @__PURE__ */ new WeakMap<Element, Chart<object>>()

/**
 * A chart bound to a DOM element: measures its container, renders SVG into
 * it and re-renders on `update()` and resize (batched per animation frame).
 * Features such as the tooltip, the legend and pointer input (`hover` /
 * `click` events, from `pointer()`, which the highlight and tooltip plugins
 * turn on themselves) are plugins; the `Chart` exported by `@tabler/charts`
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
  #cfg: ChartConfig<O>
  /** Container size changes, from the shared ResizeObserver. */
  #onResize = (width: number, height: number): void => {
    // Our own SVG sets the container height unless it follows the container.
    const followsHeight = this.#cfg.height === 'container'
    const changed =
      width !== this.#measured.width || (followsHeight && height !== this.#measured.height)
    this.#measured = { width, height }
    // A hidden container (display: none) measures 0×0: nothing to draw until it shows again.
    if (changed && (width || height)) {
      this.#font = undefined
      this.#markResizing()
      this.#schedule()
    }
  }
  #measured: Partial<Size> = {}
  readonly #handlers = new Map<keyof ChartEvents, Set<Handler<never>>>()
  #unobserve: () => void
  readonly #plugins: PluginInstance[] = []
  #destroyed = false
  #current: Interaction | undefined
  #source: Source | undefined
  #hovered = ''
  #hit: Hit | null = null
  /** Chart type output of the last render, reused while only the highlight changes. */
  #cache: Content<O> | undefined
  #resizeTimer: ReturnType<typeof setTimeout> | undefined
  /** Visibility set by the user, overriding each entry's default. */
  readonly #toggled = new Map<string, boolean>()
  /** Server-rendered svg to take over on the first render, if any. */
  #adopt: Element | null
  /**
   * The measured `--tc-font-size` (`undefined` reads it again). Reading it
   * forces the browser to restyle the page, so new data alone reuses it.
   */
  #font: number | undefined
  /** The resolved `rtl` option, read with the font size (`'auto'` asks the container). */
  #rtl = false

  constructor(
    target: Element | string,
    config: ChartConfig<O>,
    defaultPlugins: readonly ChartPlugin[] = [],
  ) {
    const element = typeof target === 'string' ? document.querySelector(target) : target
    if (!element) throw new Error(`@tabler/charts: element "${String(target)}" not found.`)
    // One chart per element: a new one replaces the chart already there.
    mounted.get(element)?.destroy()
    mounted.set(element, this as unknown as Chart<object>)
    this.element = element
    this.#cfg = cleanData(config)
    this.id = config.id ?? nextId()
    this.#adopt = element.querySelector(':scope > svg.tc-chart')
    this.#measure()
    this.#unobserve = observeResize(element, this.#onResize)
    try {
      for (const plugin of [...defaultPlugins, ...(config.plugins ?? [])]) {
        this.#plugins.push(plugin.install(this as unknown as Chart<object>))
      }
      this.render()
    } catch (error) {
      // Nobody gets this chart to destroy it: leave the element as it was found.
      this.destroy()
      throw error
    }
  }

  /** Current configuration. */
  get config(): ChartConfig<O> {
    return this.#cfg
  }

  /** Size of the last render. */
  get size(): Size {
    // In 'container' height mode, plugins such as the legend take part of the
    // container. Only then: measuring them forces a layout of the page.
    let measured = this.#measured
    if (this.#cfg.height === 'container' && measured.height) {
      let reserved = 0
      for (const plugin of this.#plugins) reserved += plugin.reservedHeight?.() ?? 0
      if (reserved) measured = { ...measured, height: measured.height - reserved }
    }
    return resolveSize(this.#cfg, measured)
  }

  /** Font size used by the last render (explicit, measured, or the default). */
  get fontSize(): number {
    return this.#cache?.fontSize ?? this.#cfg.fontSize ?? DEFAULT_FONT_SIZE
  }

  /** How pointer and keyboard map to data for the current render. */
  get interaction(): Interaction | undefined {
    return this.#current
  }

  /** The highlighted category (hover or keyboard), or `null`. */
  get active(): Hit | null {
    return this.#hit
  }

  /**
   * The pointer in chart pixels while it drives the highlight (`undefined`
   * for keyboard highlights). `hitAnchor(chart.active, chart.pointer)` gives
   * where a tooltip belongs either way.
   */
  get pointer(): { x: number; y: number } | undefined {
    const source = this.#source
    return this.#hit && source?.kind === 'pointer' ? { x: source.x, y: source.y } : undefined
  }

  /** Whether the highlight comes from the pointer or from `highlightIndex()` (keyboard). */
  get highlightSource(): 'pointer' | 'index' | undefined {
    return this.#hit ? this.#source?.kind : undefined
  }

  /**
   * Highlight a category by index (and optionally one series in it), as
   * keyboard navigation does. Returns the hit, or `null` for an invalid index.
   */
  highlightIndex(index: number, seriesIndex?: number): Hit | null {
    const hit = this.#current?.hitIndex(index, seriesIndex) ?? null
    if (!hit) return null
    this.#source = { kind: 'index', index, seriesIndex }
    this.#setHover(hit)
    return hit
  }

  /**
   * Highlight what lies at a point in chart pixels, as the pointer does (the
   * `pointer()` plugin calls it). Returns the hit, or `null` for none.
   */
  highlightAt(x: number, y: number, event?: PointerEvent): Hit | null {
    const hit = this.hitTest(x, y)
    this.#source = { kind: 'pointer', x, y }
    this.#setHover(hit, event)
    return hit
  }

  /** Remove any highlight. */
  clearHighlight(event?: PointerEvent): void {
    this.#source = undefined
    this.#setHover(null, event)
  }

  /**
   * Show or hide a legend entry (series) by key, name or index; toggles when
   * `hidden` is omitted. Re-renders in the next frame.
   */
  toggleSeries(target: string | number, hidden?: boolean): this {
    const { items } = resolveLegend(this.#cfg)
    const item =
      typeof target === 'number'
        ? items.find((entry) => entry.index === target)
        : (items.find((entry) => entry.key === target) ??
          items.find((entry) => entry.name === target))
    if (!item) return this
    const next = hidden ?? !this.#hiddenSet(items).has(item.key)
    this.#toggled.set(item.key, next)
    this.emit('legend-toggle', { key: item.key, name: item.name, index: item.index, hidden: next })
    this.#schedule()
    return this
  }

  /** Whether a legend entry is hidden. */
  isHidden(key: string): boolean {
    return this.#hiddenSet(resolveLegend(this.#cfg).items).has(key)
  }

  /** Merge `options` into the configuration and re-render in the next frame. */
  update(options: Partial<ChartConfig<O>>): this {
    this.#cfg = cleanData({ ...this.#cfg, ...options })
    // Options such as `class` may change the font size; new data does not.
    for (const key in options) if (key !== 'data') this.#font = undefined
    this.#schedule()
    return this
  }

  /**
   * Replace the whole configuration and re-render in the next frame: options
   * left out go back to their defaults (`update()` would keep them).
   */
  setConfig(config: ChartConfig<O>): this {
    this.#cfg = cleanData(config)
    this.#font = undefined
    this.#schedule()
    return this
  }

  /** Replace the data and re-render in the next frame. */
  setData(data: O extends { data: infer D } ? D : never): this {
    return this.update({ data } as unknown as Partial<ChartConfig<O>>)
  }

  /**
   * Re-measure the container and re-render in the next frame. Call it when a
   * container taken out of the page without `destroy()` comes back.
   */
  resize(): this {
    // A container taken out of the page and put back is observed again.
    if (!this.#destroyed) this.#unobserve = observeResize(this.element, this.#onResize)
    this.#measure()
    this.#font = undefined
    this.#schedule()
    return this
  }

  /** Render synchronously now. */
  render(): this {
    if (this.#destroyed) return this
    cancel(this)
    const cfg = this.#cfg
    const config = cfg as ChartConfig<object>
    assertType(config)
    const legend = resolveLegend(cfg)
    const hidden = this.#hiddenSet(legend.items)
    for (const plugin of this.#plugins) plugin.beforeRender?.({ config, legend, hidden })
    const size = this.size
    const { content, stale, changed } = this.#content(size, hidden)
    if (stale) this.#refreshHighlight()

    const adopted = this.#adopt
    render(this.element, this.#compose(content, size), adopted)
    this.#adopt = null
    // The server markup was hydrated in place: snap it to the real size and
    // data instead of morphing (the server could not measure the container).
    if (adopted) this.#markResizing()

    for (const plugin of this.#plugins)
      plugin.afterRender?.({ config, legend, hidden, size, stale, changed })
    if (stale) this.emit('render', { size })
    return this
  }

  /**
   * The chart type's output for the current config, size, hidden series and
   * font size: built again when one of them changed (`stale`; `changed` when
   * it is what the chart shows, not only its size), else the one of the last render.
   */
  #content(
    size: Size,
    hidden: ReadonlySet<string>,
  ): { content: Content<O>; stale: boolean; changed: boolean } {
    const cfg = this.#cfg
    const hiddenKey = [...hidden].sort().join('\u0000')
    if (this.#font === undefined) {
      this.#rtl =
        cfg.rtl === 'auto'
          ? typeof getComputedStyle === 'function' &&
            getComputedStyle(this.element).direction === 'rtl'
          : cfg.rtl === true
      this.#font = cfg.fontSize ?? this.#measureFontSize()
    }
    const fontSize = cfg.fontSize ?? this.#font
    const rtl = this.#rtl

    let cache = this.#cache
    const changed = !cache || cache.cfg !== cfg || cache.hidden !== hiddenKey
    const stale =
      changed ||
      cache?.width !== size.width ||
      cache.height !== size.height ||
      cache.fontSize !== fontSize ||
      cache.rtl !== rtl
    if (!cache || stale) {
      this.#current = undefined
      const content = renderContent(
        cfg,
        size,
        this.id,
        (interaction) => {
          this.#current = interaction
        },
        hidden,
        fontSize,
        rtl,
      )
      cache = {
        cfg,
        width: size.width,
        height: size.height,
        hidden: hiddenKey,
        fontSize,
        rtl,
        content,
        still: isStatic(cfg as ChartConfig<object>, content),
      }
      this.#cache = cache
    }
    return { content: cache, stale, changed }
  }

  /** Keep the highlight (and its consumers, like tooltips) in sync with new data or layout. */
  #refreshHighlight(): void {
    const source = this.#source
    if (!source) return
    const next =
      source.kind === 'pointer'
        ? this.hitTest(source.x, source.y)
        : (this.#current?.hitIndex(source.index, source.seriesIndex) ?? null)
    this.#setHover(next, undefined, true, false)
  }

  /** The root svg: the content, with the plugins' hover layers and attributes. */
  #compose(content: Content<O>, size: Size): VNode {
    const config = this.#cfg as ChartConfig<object>
    const hit = this.#hit
    const under: ChildInput[] = []
    const over: ChildInput[] = []
    let attrs: Props | undefined
    for (const plugin of this.#plugins) {
      if (hit && plugin.layers) {
        const layer = plugin.layers(hit, config)
        under.push(layer.under)
        over.push(layer.over)
      }
      const extra = plugin.svgAttrs?.(config)
      if (extra) attrs = { ...attrs, ...extra }
    }
    // Hover layers only while something is highlighted (an empty list would still render).
    return composeChart(
      config,
      size,
      this.id,
      content.still,
      content.content,
      under.length ? under : undefined,
      over.length ? over : undefined,
      attrs,
      content.rtl,
    )
  }

  /** What lies at a point in chart pixels, or `null`. */
  hitTest(x: number, y: number): Hit | null {
    return this.#current?.hitTest(x, y) ?? null
  }

  /** Subscribe to an event; returns a function that unsubscribes. */
  on<K extends keyof ChartEvents>(name: K, handler: Handler<ChartEvents[K]>): () => void {
    let set = this.#handlers.get(name)
    if (!set) {
      set = new Set()
      this.#handlers.set(name, set)
    }
    set.add(handler as Handler<never>)
    return () => {
      set.delete(handler as Handler<never>)
    }
  }

  /** Remove the chart from the DOM and stop observing its container. */
  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    if (mounted.get(this.element) === (this as never)) mounted.delete(this.element)
    cancel(this)
    clearTimeout(this.#resizeTimer)
    this.#unobserve()
    for (const plugin of this.#plugins) plugin.destroy?.()
    this.#handlers.clear()
    render(this.element, null)
  }

  /**
   * Update the highlighted hit: emit `hover` when it changed (or when
   * `force`d after new data) and re-render the hover layers in the next frame.
   */
  #setHover(hit: Hit | null, event?: PointerEvent, force = false, rerender = true): void {
    const key = hitKey(hit)
    if (!force && key === this.#hovered) return
    // After a re-render, only a highlight that is still active is worth repeating.
    if (force && key === '' && this.#hovered === '') return
    this.#hovered = key
    this.#hit = hit
    this.emit('hover', event ? { hit, event } : { hit })
    if (rerender) this.#schedule()
  }

  #hiddenSet(items: readonly LegendItem[]): Set<string> {
    const hidden = new Set<string>()
    for (const item of items) {
      if (this.#toggled.get(item.key) ?? item.hidden) hidden.add(item.key)
    }
    return hidden
  }

  /** Suspend transitions while the container keeps resizing (see `[data-resizing]` in CSS). */
  #markResizing(): void {
    const svg = this.element.querySelector(':scope > svg.tc-chart')
    if (!svg) return
    svg.setAttribute('data-resizing', '')
    clearTimeout(this.#resizeTimer)
    this.#resizeTimer = setTimeout(() => svg.removeAttribute('data-resizing'), 200)
  }

  #schedule(): void {
    if (!this.#destroyed) schedule(this, () => this.render())
  }

  /** The `--tc-font-size` in effect on the container, in pixels (browser only). */
  #measureFontSize(): number | undefined {
    if (typeof getComputedStyle !== 'function') return undefined
    const value = Number.parseFloat(
      getComputedStyle(this.element).getPropertyValue('--tc-font-size'),
    )
    return Number.isFinite(value) && value > 0 ? value : undefined
  }

  /** Measure the content box, matching what `ResizeObserver` reports. */
  #measure(): void {
    const el = this.element as HTMLElement
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(el) : undefined
    const px = (value: string | undefined) => Number.parseFloat(value ?? '') || 0
    this.#measured = {
      width: el.clientWidth - px(style?.paddingLeft) - px(style?.paddingRight),
      height: el.clientHeight - px(style?.paddingTop) - px(style?.paddingBottom),
    }
  }

  /** Call the handlers of an event (plugins emit `click`, for instance). */
  emit<K extends keyof ChartEvents>(name: K, event: ChartEvents[K]): void {
    const set = this.#handlers.get(name)
    if (set) for (const handler of set) (handler as Handler<ChartEvents[K]>)(event)
  }
}
