/**
 * Compile scss/_charts.scss (with its defaults) into dist/bootstrap.css,
 * minified with lightningcss (no targets: nothing is down-levelled).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { transform } from 'lightningcss'
import { compile } from 'sass'

const scss = new URL('../scss/_charts.scss', import.meta.url)
const out = new URL('../dist/bootstrap.css', import.meta.url)

const { css } = compile(fileURLToPath(scss), { style: 'expanded' })
const banner = '/*! @tabler/charts-bootstrap | MIT */\n'
const { code, warnings } = transform({
  filename: 'bootstrap.css',
  code: Buffer.from(banner + css),
  minify: true,
})
for (const warning of warnings) console.warn(`bootstrap.css: ${warning.message}`)
mkdirSync(new URL('.', out), { recursive: true })
writeFileSync(out, code)
