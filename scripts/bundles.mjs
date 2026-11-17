/**
 * Build typical imports of the built packages (after `pnpm build`) the way an
 * app would: bundled with rolldown, tree-shaken and minified, one file per
 * case in .size/, checked against bundlewatch.config.cjs by
 * scripts/check-size.mjs (`pnpm size` runs both).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { build } from 'rolldown'

const DIST = new URL('../packages/core/dist/', import.meta.url).pathname
const ELEMENTS = new URL('../packages/elements/dist/', import.meta.url).pathname
const REACT = new URL('../packages/react/dist/', import.meta.url).pathname
const VUE = new URL('../packages/vue/dist/', import.meta.url).pathname
const BOOTSTRAP = new URL('../packages/bootstrap/dist/', import.meta.url).pathname
/** React itself is the app's, not ours. */
const react = [/^react($|\/)/, /^react-dom($|\/)/]
const vue = [/^vue($|\/)/, /^@vue\//]

/** [name (the file is its slug), entry source, externals]. */
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
    'core + sankey',
    `export { Chart } from '${DIST}core.js'; export { sankey } from '${DIST}sankey.js'`,
  ],
  [
    'core + parliament',
    `export { Chart } from '${DIST}core.js'; export { parliament } from '${DIST}parliament.js'`,
  ],
  [
    'core + treemap',
    `export { Chart } from '${DIST}core.js'; export { treemap } from '${DIST}treemap.js'`,
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

const OUT = new URL('../.size/', import.meta.url).pathname
const entry = new URL('./.bundles-entry.mjs', import.meta.url).pathname
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

mkdirSync(OUT, { recursive: true })
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
  writeFileSync(`${OUT}${slug(name)}.js`, result.output.map((o) => o.code ?? '').join(''))
}
rmSync(entry)
console.log(`Built ${CASES.length} bundles into .size/`)
