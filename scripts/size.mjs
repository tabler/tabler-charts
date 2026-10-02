/**
 * Size budget: bundle typical imports of the built package with rolldown,
 * minify, gzip and compare against the budgets below. Run after `pnpm build`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { build } from 'rolldown'

const DIST = new URL('../packages/core/dist/', import.meta.url).pathname
const ELEMENTS = new URL('../packages/elements/dist/', import.meta.url).pathname
const REACT = new URL('../packages/react/dist/', import.meta.url).pathname
const VUE = new URL('../packages/vue/dist/', import.meta.url).pathname
const BOOTSTRAP = new URL('../packages/bootstrap/dist/', import.meta.url).pathname
/** React itself is the app's, not ours. */
const react = [/^react($|\/)/, /^react-dom($|\/)/]
const vue = [/^vue($|\/)/, /^@vue\//]

/** [name, entry source, budget in kB gzipped, externals] */
const CASES = [
  [
    'core + line',
    `export { Chart } from '${DIST}core.js'; export { line } from '${DIST}line.js'`,
    10.75,
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
    7.25,
  ],
  [
    'core + radar',
    `export { Chart } from '${DIST}core.js'; export { radar } from '${DIST}radar.js'`,
    7.75,
  ],
  [
    'core + heatmap',
    `export { Chart } from '${DIST}core.js'; export { heatmap } from '${DIST}heatmap.js'`,
    7.75,
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
  [
    'export (svg, image, download)',
    `export { exportSVG, exportImage, downloadChart } from '${DIST}export.js'`,
    2.5,
  ],
  ['default Chart + line', `export { Chart, line } from '${DIST}index.js'`, 17.25],
  [
    'SSR: chartToString + line',
    `export { chartToString } from '${DIST}core.js'; export { line } from '${DIST}line.js'`,
    8.5,
  ],
  [
    'elements/core + line',
    `export { defineChartElement } from '${ELEMENTS}core.js'; export { line } from '${DIST}line.js'`,
    12.0,
  ],
  ['elements (every type)', `export { defineChartElement } from '${ELEMENTS}index.js'`, 29.5],
  ['react: LineChart', `export { LineChart } from '${REACT}index.js'`, 18.5, react],
  ['vue: LineChart', `export { LineChart } from '${VUE}index.js'`, 18.5, vue],
  ['bootstrap data API', `export { init } from '${BOOTSTRAP}index.js'`, 29.25],
  ['everything', `export * from '${DIST}index.js'`, 31.5],
]

let failed = false
const entry = new URL('./.size-entry.mjs', import.meta.url).pathname
for (const [name, source, budget, external] of CASES) {
  writeFileSync(entry, source)
  const result = await build({
    input: entry,
    write: false,
    external,
    output: { minify: true },
    // "use client" is for the app's bundler; measuring does not need the notice.
    onLog: (level, log, handler) => {
      if (log.code !== 'MODULE_LEVEL_DIRECTIVE') handler(level, log)
    },
  })
  const code = result.output.map((o) => o.code ?? '').join('')
  const kb = gzipSync(code).length / 1000
  const ok = kb <= budget
  failed ||= !ok
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(32)} ${kb.toFixed(2).padStart(6)} kB gzip  (budget ${budget})`,
  )
}
const css = gzipSync(readFileSync(`${DIST}style.css`)).length / 1000
const cssOk = css <= 2.8
failed ||= !cssOk
console.log(
  `${cssOk ? 'ok  ' : 'FAIL'} ${'style.css'.padEnd(32)} ${css.toFixed(2).padStart(6)} kB gzip  (budget 2.8)`,
)
// The CDN scripts as shipped: library, styles and adapter, already minified.
for (const [name, file, budget] of [
  ['CDN tabler-charts.min.js', `${ELEMENTS}tabler-charts.min.js`, 35.5],
  ['CDN tabler-charts-bootstrap.min.js', `${BOOTSTRAP}tabler-charts-bootstrap.min.js`, 35.5],
  ['bootstrap.css', `${BOOTSTRAP}bootstrap.css`, 0.6],
  ['tabler.css', `${BOOTSTRAP}tabler.css`, 0.6],
]) {
  const kb = gzipSync(readFileSync(file)).length / 1000
  const ok = kb <= budget
  failed ||= !ok
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(32)} ${kb.toFixed(2).padStart(6)} kB gzip  (budget ${budget})`,
  )
}
writeFileSync(entry, '')
if (failed) {
  console.error('\nSize budget exceeded. Raise the budget in scripts/size.mjs only on purpose.')
  process.exit(1)
}
