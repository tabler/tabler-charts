/**
 * The CDN build (`dist/tabler-charts-bootstrap.min.js`): the library, the
 * chart stylesheet with the Bootstrap mapping, and the data API in one
 * classic script. On load it injects the styles and initializes every
 * `[data-tc-chart]`; everything is also on the `TablerCharts` global.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/@tabler/charts-bootstrap/dist/tabler-charts-bootstrap.min.js"></script>
 * ```
 *
 * On the script tag, `data-no-styles` skips the styles (load them yourself)
 * and `data-observe` also initializes charts added later and destroys
 * removed ones.
 */
// A script tag cannot import an entry: the download menu's saver comes along.
import '@tabler/charts/export'
import { init, observe } from './index.ts'

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
  const observing = script?.hasAttribute('data-observe') ?? false
  const start = () => (observing ? observe(document.body) : void init(document))
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
}

export * from '@tabler/charts'
export { dispose, getChart, init, observe, types } from './index.ts'
