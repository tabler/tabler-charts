/** Small helpers for pages that build their card by hand (`render`). */
import { Chart, type ChartConfig } from '@tabler/charts'

/** An element with a class and, optionally, text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

/** A chart in a new container appended to `parent`: finished, not animating. */
export function chart(
  parent: HTMLElement,
  config: Record<string, unknown>,
  style: Record<string, string> = {},
): HTMLElement {
  const host = el('div')
  for (const [prop, value] of Object.entries(style)) host.style.setProperty(prop, value)
  parent.append(host)
  new Chart(host, { locale: 'en-US', animate: false, ...config } as ChartConfig<object>)
  return host
}
