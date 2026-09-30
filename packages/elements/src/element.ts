import type { Chart, ChartConfig, ChartEvents, ChartPlugin, ChartType } from '@tabler/charts/core'

/** How the element builds its charts: the `Chart` class, the known types and extra plugins. */
export interface ChartElementSetup {
  /** `Chart` class to instantiate (the bare one from `@tabler/charts/core`, or the default one). */
  Chart: new (
    target: Element,
    config: ChartConfig<object>,
    plugins?: readonly ChartPlugin[],
  ) => Chart<object>
  /** Chart types by the name used in the `type` attribute. */
  types: Readonly<Record<string, ChartType<never>>>
  /** Plugins installed in every chart (the core `Chart` has none of its own). */
  plugins?: () => ChartPlugin[]
}

/** Public surface of a `<tabler-chart>` element. */
export interface ChartElement extends HTMLElement {
  /** The chart, while the element is connected and has a known type. */
  readonly chart: Chart<object> | undefined
  /** Chart data; overrides the inline `<script type="application/json">`. */
  data: unknown
  /** Extra options merged under the attributes (e.g. type-specific ones such as `stacked`). */
  options: Record<string, unknown>
}

const EVENTS: readonly (keyof ChartEvents)[] = ['hover', 'click', 'legend-toggle', 'render']

/** Attributes read into the config; everything else goes through `options`. */
const ATTRIBUTES = [
  'type',
  'width',
  'height',
  'aspect-ratio',
  'label',
  'description',
  'locale',
  'legend',
  'tooltip',
  'animate',
  'keyboard',
  'table',
  'options',
] as const

const flag = (value: string | null): boolean | undefined =>
  value === null ? undefined : value !== 'false'

const number = (value: string | null): number | undefined => {
  const n = value === null ? Number.NaN : Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** Parse a JSON attribute or script, naming the element in the error. */
function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new SyntaxError(`<tabler-chart>: invalid JSON in ${what}: ${(error as Error).message}`)
  }
}

/**
 * Create the `<tabler-chart>` element class for a setup. The class is built
 * on demand, so importing this module never touches `HTMLElement` (safe in
 * Node and during SSR).
 */
export function createChartElement(setup: ChartElementSetup): new () => ChartElement {
  return class TablerChartElement extends HTMLElement implements ChartElement {
    static readonly observedAttributes: readonly string[] = ATTRIBUTES

    #chart: Chart<object> | undefined
    #data: unknown
    #options: Record<string, unknown> = {}
    #script = ''
    #observer: MutationObserver | undefined
    #watched: Element | undefined
    #waiting = false

    get chart(): Chart<object> | undefined {
      return this.#chart
    }

    get data(): unknown {
      return this.#data ?? this.#scriptData()
    }

    set data(value: unknown) {
      this.#data = value
      this.#sync()
    }

    get options(): Record<string, unknown> {
      return this.#options
    }

    set options(value: Record<string, unknown>) {
      this.#options = value ?? {}
      this.#sync()
    }

    connectedCallback(): void {
      // Parsed from HTML, the element connects before its inline data: wait for it.
      if (this.ownerDocument.readyState === 'loading' && !this.#hasData()) {
        if (!this.#waiting) {
          this.#waiting = true
          this.ownerDocument.addEventListener(
            'DOMContentLoaded',
            () => {
              this.#waiting = false
              if (this.isConnected) this.connectedCallback()
            },
            { once: true },
          )
        }
        return
      }
      this.#observe()
      this.#sync()
    }

    disconnectedCallback(): void {
      this.#observer?.disconnect()
      this.#observer = undefined
      this.#watched = undefined
      this.#chart?.destroy()
      this.#chart = undefined
    }

    attributeChangedCallback(): void {
      if (this.isConnected && !this.#waiting) this.#sync()
    }

    /** Create the chart, or update it with the current attributes and data. */
    #sync(): void {
      if (!this.isConnected || this.#waiting) return
      const config = this.#config()
      if (!config) {
        this.#chart?.destroy()
        this.#chart = undefined
        return
      }
      if (this.#chart && this.#chart.config.type === config.type) {
        this.#chart.update(config)
        return
      }
      this.#chart?.destroy()
      const chart = new setup.Chart(this, config, setup.plugins?.() ?? [])
      const emit = (name: string, detail: unknown) =>
        this.dispatchEvent(new CustomEvent(`tc-${name}`, { detail, bubbles: true, composed: true }))
      for (const name of EVENTS) chart.on(name, (detail) => emit(name, detail))
      this.#chart = chart
      // The first render ran in the constructor, before anyone could listen.
      emit('render', { size: chart.size })
    }

    /** The config from options, attributes and data; `undefined` without a type. */
    #config(): ChartConfig<object> | undefined {
      const name = this.getAttribute('type')
      if (!name) return undefined
      const type = setup.types[name] as ChartType<object> | undefined
      if (!type) {
        const known = Object.keys(setup.types).join(', ')
        throw new Error(`<tabler-chart>: unknown type "${name}". Known types: ${known}.`)
      }
      const attr = (key: string) => this.getAttribute(key)
      const fromAttr = attr('options')
      const config: Record<string, unknown> = {
        ...(fromAttr ? (parseJson(fromAttr, 'the options attribute') as object) : {}),
        ...this.#options,
      }
      const set = (key: string, value: unknown) => {
        if (value !== undefined) config[key] = value
      }
      set('width', number(attr('width')))
      set('height', attr('height') === 'container' ? 'container' : number(attr('height')))
      set('aspectRatio', number(attr('aspect-ratio')))
      set('title', attr('label') ?? undefined)
      set('description', attr('description') ?? undefined)
      set('locale', attr('locale') ?? undefined)
      set('tooltip', flag(attr('tooltip')))
      set('animate', flag(attr('animate')))
      set('keyboard', flag(attr('keyboard')))
      const legend = attr('legend')
      set(
        'legend',
        legend === null ? undefined : legend === 'bottom' ? { position: 'bottom' } : flag(legend),
      )
      const table = attr('table')
      set('table', table === null ? undefined : table === 'visible' ? 'visible' : flag(table))
      set('data', this.#data ?? this.#scriptData())
      // Nothing to draw yet: the chart is created once data arrives.
      if (config.data === undefined) return undefined
      config.type = type
      return config as ChartConfig<object>
    }

    #hasData(): boolean {
      return this.#data !== undefined || this.#dataScript() !== null
    }

    #dataScript(): HTMLScriptElement | null {
      return this.querySelector(':scope > script[type="application/json"]')
    }

    #scriptData(): unknown {
      const script = this.#dataScript()
      const text = script?.textContent?.trim() ?? ''
      this.#script = text
      return text ? parseJson(text, 'the inline <script type="application/json">') : undefined
    }

    /**
     * Pick up inline data that frameworks add or change after the element
     * connected. Only direct children and the data script are observed, not
     * the chart's own SVG, which changes on every hover.
     */
    #observe(): void {
      if (this.#observer || typeof MutationObserver !== 'function') return
      const observer = new MutationObserver(() => {
        this.#watchScript(observer)
        const text = this.#dataScript()?.textContent?.trim() ?? ''
        if (text !== this.#script && this.#data === undefined) this.#sync()
      })
      this.#observer = observer
      observer.observe(this, { childList: true })
      this.#watchScript(observer)
    }

    #watchScript(observer: MutationObserver): void {
      const script = this.#dataScript()
      if (!script || script === this.#watched) return
      this.#watched = script
      observer.observe(script, { childList: true, characterData: true, subtree: true })
    }
  }
}

/** Give custom elements, which are inline by default, a block box (zero specificity). */
function addBaseStyle(doc: Document, tag: string): void {
  const id = `tc-element-${tag}`
  if (doc.getElementById(id)) return
  const style = doc.createElement('style')
  style.id = id
  style.textContent = `:where(${tag}){display:block}`
  doc.head.append(style)
}

export interface DefineOptions {
  /** Tag name to register. Defaults to `tabler-chart`. */
  tag?: string
}

/** Register the element class under `tag` once; later calls are no-ops. */
export function define(setup: ChartElementSetup, tag = 'tabler-chart'): void {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return
  customElements.define(tag, createChartElement(setup))
  if (typeof document !== 'undefined') addBaseStyle(document, tag)
}
