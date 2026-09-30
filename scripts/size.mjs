/**
 * Size budget: bundle typical imports of the built package with rolldown,
 * minify, gzip and compare against the budgets below. Run after `pnpm build`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { build } from 'rolldown'

const DIST = new URL('../packages/core/dist/', import.meta.url).pathname
const ELEMENTS = new URL('../packages/elements/dist/', import.meta.url).pathname

/** [name, entry source, budget in kB gzipped] */
const CASES = [
  [
    'core + line',
    `export { Chart } from '${DIST}core.js'; export { line } from '${DIST}line.js'`,
    11,
  ],
  [
    'core + bar',
    `export { Chart } from '${DIST}core.js'; export { bar } from '${DIST}bar.js'`,
    10.75,
  ],
  [
    'core + pie',
    `export { Chart } from '${DIST}core.js'; export { pie } from '${DIST}pie.js'`,
    7.25,
  ],
  [
    'core + gauge',
    `export { Chart } from '${DIST}core.js'; export { gauge } from '${DIST}gauge.js'`,
    7.5,
  ],
  [
    'core + heatmap',
    `export { Chart } from '${DIST}core.js'; export { heatmap } from '${DIST}heatmap.js'`,
    7.25,
  ],
  [
    'core + candlestick',
    `export { Chart } from '${DIST}core.js'; export { candlestick } from '${DIST}candlestick.js'`,
    9.5,
  ],
  [
    'core + line + tooltip + legend',
    `export { Chart, tooltip, highlight, legend } from '${DIST}core.js'; export { line } from '${DIST}line.js'`,
    12.5,
  ],
  ['default Chart + line', `export { Chart, line } from '${DIST}index.js'`, 15.5],
  [
    'SSR: chartToString + line',
    `export { chartToString } from '${DIST}core.js'; export { line } from '${DIST}line.js'`,
    8.5,
  ],
  [
    'elements/core + line',
    `export { defineChartElement } from '${ELEMENTS}core.js'; export { line } from '${DIST}line.js'`,
    12.25,
  ],
  ['elements (every type)', `export { defineChartElement } from '${ELEMENTS}index.js'`, 25.5],
  ['everything', `export * from '${DIST}index.js'`, 25.25],
]

let failed = false
const entry = new URL('./.size-entry.mjs', import.meta.url).pathname
for (const [name, source, budget] of CASES) {
  writeFileSync(entry, source)
  const result = await build({ input: entry, write: false, output: { minify: true } })
  const code = result.output.map((o) => o.code ?? '').join('')
  const kb = gzipSync(code).length / 1000
  const ok = kb <= budget
  failed ||= !ok
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(32)} ${kb.toFixed(2).padStart(6)} kB gzip  (budget ${budget})`,
  )
}
const css = gzipSync(readFileSync(`${DIST}style.css`)).length / 1000
const cssOk = css <= 2.75
failed ||= !cssOk
console.log(
  `${cssOk ? 'ok  ' : 'FAIL'} ${'style.css'.padEnd(32)} ${css.toFixed(2).padStart(6)} kB gzip  (budget 2.75)`,
)
writeFileSync(entry, '')
if (failed) {
  console.error('\nSize budget exceeded. Raise the budget in scripts/size.mjs only on purpose.')
  process.exit(1)
}
