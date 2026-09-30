/**
 * Minify src/style.css into dist/style.css. Only whitespace, comments and
 * redundant syntax go: no targets are set, so nothing is down-levelled or
 * prefixed and the stylesheet behaves exactly like the source. The /*! banner
 * is kept.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { transform } from 'lightningcss'

const src = new URL('../src/style.css', import.meta.url)
const out = new URL('../dist/style.css', import.meta.url)

const { code, warnings } = transform({
  filename: 'style.css',
  code: readFileSync(src),
  minify: true,
})
for (const warning of warnings) console.warn(`style.css: ${warning.message}`)
mkdirSync(new URL('.', out), { recursive: true })
writeFileSync(out, code)
