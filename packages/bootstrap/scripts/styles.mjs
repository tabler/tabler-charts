/**
 * Stylesheets for the builds: `mapping` is scss/_charts.scss compiled (the
 * Bootstrap mapping), `tabler` the Tabler preset, and `page` the core chart
 * stylesheet followed by the Bootstrap mapping (what the CDN script
 * injects). All minified with lightningcss, without targets.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { transform } from 'lightningcss'
import { compile } from 'sass'

const minify = (code) =>
  transform({ filename: 'style.css', code: Buffer.from(code), minify: true }).code.toString()

const build = (file, banner) => {
  const { css } = compile(fileURLToPath(new URL(`../scss/${file}`, import.meta.url)), {
    style: 'expanded',
  })
  return minify(`/*! ${banner} | MIT */\n${css}`)
}

export function mappingStyles() {
  return build('_charts.scss', '@tabler/charts-bootstrap')
}

export function tablerStyles() {
  return build('_tabler.scss', '@tabler/charts-bootstrap, Tabler preset')
}

export function pageStyles() {
  const core = readFileSync(new URL('../../core/src/style.css', import.meta.url), 'utf8')
  return minify(`${core}\n${mappingStyles()}`)
}
