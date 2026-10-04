/**
 * `@tabler/charts-bootstrap`: a data API in the Bootstrap style. Charts are
 * declared in HTML and `init()` (or the CDN script, on its own) turns them
 * into charts.
 *
 * ```html
 * <div data-tc-chart="line" data-tc-src="/api/sales.json" data-tc-aspect-ratio="3"></div>
 * <div data-tc-chart="bar" data-tc-stacked="true">
 *   <script type="application/json">{ "labels": [...], "series": [...] }</script>
 * </div>
 * ```
 *
 * `data-tc-chart` names the type; data comes from `data-tc-src` (a JSON URL),
 * an inline `<script type="application/json">` or `data-tc-data`; every other
 * `data-tc-*` attribute is an option (`data-tc-aspect-ratio="3"`), and
 * `data-tc-options` takes a JSON object for the rest.
 */
import {
  area,
  bar,
  Chart,
  type ChartConfig,
  type ChartEvents,
  type ChartType,
  candlestick,
  donut,
  gauge,
  heatmap,
  line,
  pie,
  radar,
  scatter,
  sparkline,
} from '@tabler/charts'

/** Every built-in chart type, by its `data-tc-chart` name. */
export const types: Readonly<Record<string, ChartType<never>>> = {
  line,
  area,
  bar,
  pie,
  donut,
  scatter,
  sparkline,
  gauge,
  heatmap,
  candlestick,
  radar,
} as Record<string, ChartType<never>>

export interface InitOptions {
  /** Extra or replacement chart types, merged over the built-in ones. */
  types?: Readonly<Record<string, ChartType<never>>>
}

const SELECTOR = '[data-tc-chart]'
const EVENTS: readonly (keyof ChartEvents)[] = ['hover', 'click', 'legend-toggle', 'render']
/** Attributes that are not chart options. */
const RESERVED = new Set(['chart', 'src', 'data', 'options'])
/** Options that are text, whatever it spells: a title "2024" is not a number. */
const TEXT = new Set(['title', 'description', 'locale', 'sync', 'id', 'class'])

const charts = new WeakMap<Element, Chart<object>>()
/** Elements whose data is still loading, so a second init() does not fetch twice. */
const pending = new WeakSet<Element>()

/** The chart created for an element by `init()`, if any; `O` types its options (e.g. `LineOptions`). */
export function getChart<O extends object = object>(element: Element): Chart<O> | undefined {
  return charts.get(element) as Chart<O> | undefined
}

/** Destroy the chart of an element (it can be initialized again later). */
export function dispose(element: Element): void {
  charts.get(element)?.destroy()
  charts.delete(element)
}

/** `"true"`, `"3"`, `'{"a":1}'` or plain text, as the value it spells. */
function parseValue(text: string): unknown {
  if (text === 'true' || text === '') return true
  if (text === 'false') return false
  if (text !== '' && Number.isFinite(Number(text))) return Number(text)
  if (/^\s*[[{]/.test(text)) return parseJson(text, 'a data-tc-* attribute')
  return text
}

function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new SyntaxError(
      `@tabler/charts-bootstrap: invalid JSON in ${what}: ${(error as Error).message}`,
    )
  }
}

/** Options from the element's `data-tc-*` attributes. */
function optionsOf(element: HTMLElement): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const json = element.dataset.tcOptions
  if (json) Object.assign(out, parseJson(json, 'data-tc-options'))
  for (const [key, value] of Object.entries(element.dataset)) {
    if (!key.startsWith('tc') || value === undefined) continue
    // dataset turns data-tc-aspect-ratio into tcAspectRatio.
    const name = key.charAt(2).toLowerCase() + key.slice(3)
    if (RESERVED.has(name)) continue
    out[name] =
      name === 'legend' && value === 'bottom'
        ? { position: 'bottom' }
        : TEXT.has(name)
          ? value
          : parseValue(value)
  }
  return out
}

/** Inline data: `data-tc-data` or a `<script type="application/json">` child. */
function inlineData(element: HTMLElement): unknown {
  const attr = element.dataset.tcData
  if (attr) return parseJson(attr, 'data-tc-data')
  const script = element.querySelector(':scope > script[type="application/json"]')
  const text = script?.textContent?.trim()
  return text ? parseJson(text, 'the inline <script type="application/json">') : undefined
}

function emit(element: Element, name: string, detail: unknown): void {
  element.dispatchEvent(new CustomEvent(`tc-${name}`, { detail, bubbles: true }))
}

function create(element: HTMLElement, type: ChartType<object>, data: unknown): Chart<object> {
  const config = { ...optionsOf(element), type, data } as ChartConfig<object>
  const chart = new Chart(element, config)
  for (const name of EVENTS) chart.on(name, (detail) => emit(element, name, detail))
  charts.set(element, chart)
  // The first render ran in the constructor, before anyone could listen.
  emit(element, 'render', { size: chart.size })
  return chart
}

/** Set up one element; returns its chart, or a promise while `data-tc-src` loads. */
function setup(
  element: HTMLElement,
  known: Readonly<Record<string, ChartType<never>>>,
): Chart<object> | Promise<Chart<object> | undefined> | undefined {
  const existing = charts.get(element)
  if (existing || pending.has(element)) return existing
  const name = element.dataset.tcChart ?? ''
  const type = known[name] as ChartType<object> | undefined
  if (!type) {
    const list = Object.keys(known).join(', ')
    throw new Error(`@tabler/charts-bootstrap: unknown chart type "${name}". Known types: ${list}.`)
  }
  const src = element.dataset.tcSrc
  if (!src) return create(element, type, inlineData(element) ?? [])

  pending.add(element)
  element.setAttribute('aria-busy', 'true')
  return fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim())
      return response.json()
    })
    .then(
      (data) => (element.isConnected ? create(element, type, data) : undefined),
      (error: unknown) => {
        emit(element, 'error', { error, src })
        console.error(`@tabler/charts-bootstrap: could not load ${src}:`, error)
        return undefined
      },
    )
    .finally(() => {
      pending.delete(element)
      element.removeAttribute('aria-busy')
    })
}

/**
 * Create a chart for every `[data-tc-chart]` in `root` (and `root` itself)
 * that does not have one yet. Resolves once charts with `data-tc-src` have
 * loaded; the ones with inline data exist as soon as `init()` returns.
 */
export function init(
  root: ParentNode = document,
  options: InitOptions = {},
): Promise<Chart<object>[]> {
  const known = { ...types, ...options.types }
  const elements = [...root.querySelectorAll<HTMLElement>(SELECTOR)]
  if (root instanceof Element && root.matches(SELECTOR)) elements.unshift(root as HTMLElement)
  const made = elements.map((element) => {
    // One broken declaration (unknown type, bad JSON) must not stop the others.
    try {
      return setup(element, known)
    } catch (error) {
      emit(element, 'error', { error })
      console.error(error)
      return undefined
    }
  })
  return Promise.all(made).then((list) => list.filter((c): c is Chart<object> => c !== undefined))
}

/**
 * Keep `root` in sync: charts added later are initialized, charts removed
 * are destroyed. Returns a function that stops observing.
 */
export function observe(root: Element = document.body, options: InitOptions = {}): () => void {
  void init(root, options)
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      // A chart changing its own content (every hover, every update) adds no charts.
      const owner = (record.target as Element).closest?.(SELECTOR)
      if (owner && charts.has(owner)) continue
      for (const node of record.removedNodes) {
        if (!(node instanceof Element)) continue
        if (charts.has(node)) dispose(node)
        for (const inner of node.querySelectorAll(SELECTOR)) dispose(inner)
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element && !node.isConnected) continue
        if (node instanceof Element) void init(node, options)
      }
    }
  })
  observer.observe(root, { childList: true, subtree: true })
  return () => observer.disconnect()
}
