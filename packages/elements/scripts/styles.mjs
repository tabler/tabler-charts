/**
 * The core stylesheet as strings for the element builds: `page` for the
 * document (the CDN build injects it) and `shadow` for a shadow root, where
 * the token blocks move from :root to :host (and [data-theme] on the element
 * itself switches themes). Minified with lightningcss, without targets.
 */
import { readFileSync } from 'node:fs'
import { transform } from 'lightningcss'

const source = () => readFileSync(new URL('../../core/src/style.css', import.meta.url), 'utf8')

const minify = (code) =>
  transform({ filename: 'style.css', code: Buffer.from(code), minify: true }).code.toString()

/** Replace `from` with `to`, failing loudly when the core stylesheet changed shape. */
function swap(css, from, to) {
  if (!css.includes(from)) throw new Error(`shadow styles: selector not found: ${from}`)
  return css.replaceAll(from, to)
}

export function pageStyles() {
  return minify(source())
}

export function shadowStyles() {
  let css = source()
  css = swap(
    css,
    ':where(:root),\n:where([data-theme="light"])',
    ':host,\n:host([data-theme="light"])',
  )
  css = swap(css, ':where(:root:not([data-theme="light"]))', ':host(:not([data-theme="light"]))')
  css = swap(css, ':where([data-theme="dark"]) {', ':host([data-theme="dark"]) {')
  // Where :host-context() works (Chromium), a dark theme set on an ancestor applies
  // too. It gets its own rule: in a selector list, browsers without it would drop
  // the whole rule. The element's own data-theme still comes after and wins.
  const start = css.indexOf(':host([data-theme="dark"]) {')
  const end = css.indexOf('}', start) + 1
  const dark = css.slice(start, end)
  css = `${css.slice(0, start)}${dark.replace(':host([data-theme="dark"])', ':host-context([data-theme="dark"])')}\n\n${css.slice(start)}`
  // Custom elements are inline by default.
  return minify(`:host{display:block}${css}`)
}
