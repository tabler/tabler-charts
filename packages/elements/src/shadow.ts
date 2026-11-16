/**
 * `@tabler/charts-elements/shadow`: render `<tabler-chart>` into a shadow
 * root. Kept apart from the element so light-DOM users do not ship it.
 *
 * ```ts
 * import { defineChartElement } from '@tabler/charts-elements'
 * import { shadow } from '@tabler/charts-elements/shadow'
 *
 * defineChartElement({ shadow })
 * ```
 *
 * Page CSS does not reach inside: style the pieces with
 * `tabler-chart::part(root | chart | legend | tooltip | table | download)` and theme
 * with tokens on the element itself (`tabler-chart { --tc-color-1: … }`,
 * `data-theme="dark"`). Tokens set on ancestors stop at the element, which
 * defines its own defaults; a `data-theme` on an ancestor is followed (the
 * element mirrors it as `data-tc-theme`).
 */
import type { ShadowMode } from './element.ts'

/** The chart stylesheet with its tokens on :host, inlined at build time from the core CSS. */
export const shadowStyles: string = __TC_SHADOW_STYLES__

/** Pieces named for `::part()`. */
const PARTS: readonly (readonly [string, string])[] = [
  [':scope > svg.tc-chart', 'chart'],
  [':scope > .tc-legend', 'legend'],
  [':scope > .tc-tooltip', 'tooltip'],
  [':scope > .tc-table-wrap', 'table'],
  [':scope > .tc-download', 'download'],
]

/** Shadow hosts whose ancestors' data-theme they follow. */
const hosts = /* @__PURE__ */ new Set<Element>()
let watching = false

/** The data-theme of the nearest themed ancestor, across shadow roots. */
function inheritedTheme(host: Element): string | null {
  let node: Node | null = host.parentNode
  while (node) {
    if (node instanceof Element) {
      const themed = node.closest('[data-theme]')
      if (themed) return themed.getAttribute('data-theme')
      node = node.getRootNode()
    }
    node = node instanceof ShadowRoot ? node.host : null
  }
  return null
}

/**
 * Mirror the ancestors' theme onto every host as data-tc-theme, unless it
 * sets its own data-theme (which wins in the styles anyway).
 */
function syncThemes(): void {
  for (const host of hosts) {
    if (!host.isConnected) {
      hosts.delete(host)
      continue
    }
    const theme = host.hasAttribute('data-theme') ? null : inheritedTheme(host)
    if (theme) host.setAttribute('data-tc-theme', theme)
    else host.removeAttribute('data-tc-theme')
  }
}

function followTheme(host: Element): void {
  hosts.add(host)
  syncThemes()
  if (watching || typeof MutationObserver !== 'function') return
  watching = true
  new MutationObserver(syncThemes).observe(host.ownerDocument.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
    subtree: true,
  })
}

/** One constructable stylesheet shared by every shadow root. */
let sheet: CSSStyleSheet | undefined

function adopt(root: ShadowRoot): void {
  if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in root) {
    if (!sheet) {
      sheet = new CSSStyleSheet()
      sheet.replaceSync(shadowStyles)
    }
    if (!root.adoptedStyleSheets.includes(sheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
    }
  } else if (!root.querySelector('style')) {
    const style = root.ownerDocument.createElement('style')
    style.textContent = shadowStyles
    root.prepend(style)
  }
}

/**
 * Render into an open shadow root, reusing a declarative one (and a chart
 * server-rendered in it) when the element already has it.
 */
export const shadow: ShadowMode = {
  mount(host) {
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
    adopt(root)
    followTheme(host)
    // (:scope matches nothing in a shadow root's querySelector, so look at its children.)
    let container = [...root.children].find((child) => child.classList.contains('tc-root'))
    if (!container) {
      container = root.ownerDocument.createElement('div')
      container.className = 'tc-root'
      container.setAttribute('part', 'root')
      root.append(container)
      // The tooltip and legend come and go, so name the parts on every change.
      const box = container
      const name = () => {
        for (const [selector, part] of PARTS)
          box.querySelector(selector)?.setAttribute('part', part)
      }
      if (typeof MutationObserver === 'function') {
        new MutationObserver(name).observe(box, { childList: true })
      }
    }
    return container
  },
}
