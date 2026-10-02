/**
 * Size budget: bundle typical imports of the built package with rolldown,
 * minify, gzip and compare against the budgets in bundlewatch.config.cjs.
 * Run after `pnpm build`; the bundles land in .size/ for Bundlewatch.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
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

/** [name, entry source, externals]; the budgets are in bundlewatch.config.cjs. */
const CASES = [
  ['core + line', `export { Chart } from '${DIST}core.js'; export { line } from '${DIST}line.js'`],
  ['core + bar', `export { Chart } from '${DIST}core.js'; export { bar } from '${DIST}bar.js'`],
  ['core + pie', `export { Chart } from '${DIST}core.js'; export { pie } from '${DIST}pie.js'`],
  [
    'core + gauge',
    `export { Chart } from '${DIST}core.js'; export { gauge } from '${DIST}gauge.js'`,
  ],
  [
    'core + radar',
    `export { Chart } from '${DIST}core.js'; export { radar } from '${DIST}radar.js'`,
  ],
  [
    'core + heatmap',
    `export { Chart } from '${DIST}core.js'; export { heatmap } from '${DIST}heatmap.js'`,
  ],
  [
    'core + candlestick',
    `export { Chart } from '${DIST}core.js'; export { candlestick } from '${DIST}candlestick.js'`,
  ],
  [
    'core + line + tooltip + legend',
    `export { Chart, tooltip, highlight, legend } from '${DIST}core.js'; export { line } from '${DIST}line.js'`,
  ],
  [
    'export (svg, image, download)',
    `export { exportSVG, exportImage, downloadChart } from '${DIST}export.js'`,
  ],
  ['default Chart + line', `export { Chart, line } from '${DIST}index.js'`],
  [
    'SSR: chartToString + line',
    `export { chartToString } from '${DIST}core.js'; export { line } from '${DIST}line.js'`,
  ],
  [
    'elements/core + line',
    `export { defineChartElement } from '${ELEMENTS}core.js'; export { line } from '${DIST}line.js'`,
  ],
  ['elements (every type)', `export { defineChartElement } from '${ELEMENTS}index.js'`],
  ['react: LineChart', `export { LineChart } from '${REACT}index.js'`, react],
  ['vue: LineChart', `export { LineChart } from '${VUE}index.js'`, vue],
  ['bootstrap data API', `export { init } from '${BOOTSTRAP}index.js'`],
  ['everything', `export * from '${DIST}index.js'`],
]

// The budgets live in bundlewatch.config.cjs: Bundlewatch checks them in CI
// (and reports them on pull requests); this script builds the bundles it
// watches into .size/ and checks the same budgets locally, without a network.
const ROOT = new URL('../', import.meta.url).pathname
const OUT = `${ROOT}.size/`
const config = createRequire(import.meta.url)('../bundlewatch.config.cjs')
const budgets = new Map(config.files.map((f) => [f.path, f.maxSize]))
/** Bundlewatch sizes: `B`, `KB` or `MB`, in powers of 1024 like its `bytes` parser. */
const bytes = (size) => {
  const [, n, unit = 'B'] = String(size).match(/^([\d.]+)\s*([kKmM]?B)?$/) ?? []
  return Number(n) * { B: 1, KB: 1024, kB: 1024, MB: 1024 ** 2, mB: 1024 ** 2 }[unit]
}
const kb = (n) => `${(n / 1024).toFixed(2)} KB`

mkdirSync(OUT, { recursive: true })
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

let failed = false
/** Compare a file's gzip size (level 9, as Bundlewatch's gzip-size) with its budget. */
const check = (name, path, data) => {
  const size = gzipSync(data, { level: 9 }).length
  const budget = budgets.get(path)
  if (budget === undefined) {
    failed = true
    console.log(`FAIL ${name.padEnd(36)} no budget for ${path} in bundlewatch.config.cjs`)
    return
  }
  const ok = size <= bytes(budget)
  failed ||= !ok
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(36)} ${kb(size).padStart(9)} gzip  (budget ${budget})`,
  )
}

const entry = new URL('./.size-entry.mjs', import.meta.url).pathname
for (const [name, source, external] of CASES) {
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
  const path = `.size/${slug(name)}.js`
  writeFileSync(`${ROOT}${path}`, code)
  check(name, path, code)
}
writeFileSync(entry, '')

// Files shipped as they are: the stylesheets and the CDN scripts.
for (const [name, file] of [
  ['style.css', `${DIST}style.css`],
  ['CDN tabler-charts.min.js', `${ELEMENTS}tabler-charts.min.js`],
  ['CDN tabler-charts-bootstrap.min.js', `${BOOTSTRAP}tabler-charts-bootstrap.min.js`],
  ['bootstrap.css', `${BOOTSTRAP}bootstrap.css`],
  ['tabler.css', `${BOOTSTRAP}tabler.css`],
]) {
  check(name, file.replace(ROOT, ''), readFileSync(file))
}

if (failed) {
  console.error('\nSize budget exceeded. Raise it in bundlewatch.config.cjs only on purpose.')
  process.exit(1)
}
