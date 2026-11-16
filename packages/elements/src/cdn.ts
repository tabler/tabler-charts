/**
 * The CDN build (`dist/tabler-charts.min.js`): the whole library, the
 * stylesheet and `<tabler-chart>` in one classic script that registers the
 * element and injects the styles on load. Everything is also available on
 * the `TablerCharts` global.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/@tabler/charts-elements/dist/tabler-charts.min.js"></script>
 * ```
 *
 * Add `data-no-styles` to the script tag to load the stylesheet yourself.
 */
// A script tag cannot import an entry: the download menu's saver comes along.
import '@tabler/charts/export'
import { defineChartElement } from './index.ts'

if (typeof document !== 'undefined') {
  const script = document.currentScript
  if (!script?.hasAttribute('data-no-styles') && !document.getElementById('tc-styles')) {
    const style = document.createElement('style')
    style.id = 'tc-styles'
    style.textContent = __TC_PAGE_STYLES__
    // Under a strict CSP, the nonce of this script lets its styles in too.
    style.nonce = (script as HTMLScriptElement | null)?.nonce ?? ''
    // First in <head>, so the page's own CSS overrides it.
    document.head.prepend(style)
  }
}
defineChartElement()

export * from '@tabler/charts'
export { createChartElement, defineChartElement, types } from './index.ts'
