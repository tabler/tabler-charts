/**
 * Stylesheets for the builds: `mapping` is scss/_charts.scss compiled, and
 * `page` the core chart stylesheet followed by the mapping (what the CDN
 * script injects). Both minified with lightningcss, without targets.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { transform } from 'lightningcss'
import { compile } from 'sass'

const minify = (code) =>
  transform({ filename: 'style.css', code: Buffer.from(code), minify: true }).code.toString()

export function mappingStyles() {
  const { css } = compile(fileURLToPath(new URL('../scss/_charts.scss', import.meta.url)), {
    style: 'expanded',
  })
  return minify(`/*! @tabler/charts-bootstrap | MIT */\n${css}`)
}

export function pageStyles() {
  const core = readFileSync(new URL('../../core/src/style.css', import.meta.url), 'utf8')
  return minify(`${core}\n${mappingStyles()}`)
}
