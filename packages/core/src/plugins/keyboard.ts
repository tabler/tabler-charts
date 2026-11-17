import { describeHit } from '../a11y.ts'
import type { ChartPlugin } from '../plugin.ts'

/**
 * Keyboard navigation: the SVG becomes focusable; arrow keys walk
 * categories, Up/Down walk series, Home/End jump, Escape (or leaving)
 * clears. Every step is announced through a polite live region.
 */
/** The config's `keyboard` option, else the chart type's default, else on. */
const enabled = (config: { keyboard?: boolean; type: { keyboard?: boolean } }): boolean =>
  config.keyboard ?? config.type.keyboard ?? true

export function keyboard(): ChartPlugin {
  return {
    name: 'keyboard',
    install(chart) {
      const host = chart.element
      let live: HTMLElement | undefined

      /**
       * The live region, added when the chart takes focus: screen readers only
       * announce changes of a region that was already there, so one created
       * with its first message would stay silent for that message.
       */
      const region = (): HTMLElement => {
        if (!live) {
          live = host.ownerDocument.createElement('div')
          live.className = 'tc-sr-only'
          live.setAttribute('aria-live', 'polite')
          live.setAttribute('aria-atomic', 'true')
          host.appendChild(live)
        }
        return live
      }
      const announce = (text: string) => {
        region().textContent = text
      }

      const go = (index: number, seriesIndex?: number) => {
        const hit = chart.highlightIndex(index, seriesIndex)
        if (hit) announce(describeHit(hit))
      }

      /** Returns whether the key was handled. */
      const handle = (key: string): boolean => {
        const interaction = chart.interaction
        if (!interaction || interaction.count === 0) return false
        // Arrows follow the screen: categories from the right swap them.
        if (interaction.reversed && /^Arrow(L|R)/.test(key))
          key = key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft'
        // In a grid a column is `rows` categories away, and Up/Down walk a column.
        let column = interaction.rows ?? 1
        if (interaction.rows && /^Arrow(U|D)/.test(key)) {
          key = key === 'ArrowUp' ? 'ArrowLeft' : 'ArrowRight'
          column = 1
        }
        const current = chart.highlightSource === 'index' ? chart.active : null
        const last = interaction.count - 1
        const index = current?.index
        const focused = current?.seriesIndex
        const series = current?.items.map((item) => item.seriesIndex) ?? []
        const at = focused === undefined ? -1 : series.indexOf(focused)

        switch (key) {
          case 'ArrowRight':
            go(index === undefined ? 0 : Math.min(last, index + column), focused)
            return true
          case 'ArrowLeft':
            go(index === undefined ? last : Math.max(0, index - column), focused)
            return true
          case 'Home':
            go(0, focused)
            return true
          case 'End':
            go(last, focused)
            return true
          case 'ArrowDown':
          case 'ArrowUp': {
            if (index === undefined || series.length === 0) {
              go(0)
              return true
            }
            const step = key === 'ArrowDown' ? 1 : -1
            const next = at === -1 ? (step > 0 ? 0 : series.length - 1) : at + step
            go(index, next < 0 || next >= series.length ? undefined : series[next])
            return true
          }
          case 'Escape':
            if (!current) return false
            chart.clearHighlight()
            return true
          default:
            return false
        }
      }

      const isChart = (target: EventTarget | null) =>
        (target as Element | null)?.matches?.('svg.tc-chart') === true
      const onKey = (event: Event) => {
        const { key } = event as KeyboardEvent
        if (!enabled(chart.config) || !isChart(event.target)) return
        if (handle(key)) event.preventDefault()
      }
      const onBlur = (event: Event) => {
        if (isChart(event.target) && chart.highlightSource === 'index') chart.clearHighlight()
      }
      const onFocus = (event: Event) => {
        if (enabled(chart.config) && isChart(event.target)) region()
      }
      host.addEventListener('keydown', onKey)
      host.addEventListener('focusin', onFocus)
      host.addEventListener('focusout', onBlur)

      return {
        svgAttrs: (config) => (enabled(config) ? { tabindex: 0 } : undefined),
        destroy() {
          host.removeEventListener('keydown', onKey)
          host.removeEventListener('focusin', onFocus)
          host.removeEventListener('focusout', onBlur)
          live?.remove()
        },
      }
    },
  }
}
