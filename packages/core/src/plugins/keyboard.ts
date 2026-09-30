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

      const announce = (text: string) => {
        if (typeof document === 'undefined') return
        if (!live) {
          live = host.ownerDocument.createElement('div')
          live.className = 'tc-sr-only'
          live.setAttribute('aria-live', 'polite')
          live.setAttribute('aria-atomic', 'true')
          host.appendChild(live)
        }
        live.textContent = text
      }

      const go = (index: number, seriesIndex?: number) => {
        const hit = chart.highlightIndex(index, seriesIndex)
        if (hit) announce(describeHit(hit))
      }

      /** Returns whether the key was handled. */
      const handle = (key: string): boolean => {
        const interaction = chart.interaction
        if (!interaction || interaction.count === 0) return false
        const current = chart.highlightSource === 'index' ? chart.active : null
        const last = interaction.count - 1
        const index = current?.index
        const focused = current?.seriesIndex
        const series = current?.items.map((item) => item.seriesIndex) ?? []
        const at = focused === undefined ? -1 : series.indexOf(focused)

        switch (key) {
          case 'ArrowRight':
            go(index === undefined ? 0 : Math.min(last, index + 1), focused)
            return true
          case 'ArrowLeft':
            go(index === undefined ? last : Math.max(0, index - 1), focused)
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
      host.addEventListener('keydown', onKey)
      host.addEventListener('focusout', onBlur)

      return {
        svgAttrs: (config) => (enabled(config) ? { tabindex: 0 } : undefined),
        destroy() {
          host.removeEventListener('keydown', onKey)
          host.removeEventListener('focusout', onBlur)
          live?.remove()
        },
      }
    },
  }
}
