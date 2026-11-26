/**
 * Size budgets, gzipped, in Bundlewatch's format and units (1 KB = 1024
 * bytes). `pnpm size` builds the .size/ bundles (scripts/bundles.mjs) and
 * checks them offline (scripts/check-size.mjs). Bundlewatch itself is not
 * run: it always uploads the results (to a link shortener, and to its
 * service for comparisons), but this config still works with it. Raise a
 * budget only on purpose.
 */
module.exports = {
  files: [
    // Typical imports, bundled and minified by scripts/bundles.mjs.
    { path: '.size/core-line.js', maxSize: '12KB' },
    { path: '.size/core-bar.js', maxSize: '11.75KB' },
    { path: '.size/core-pie.js', maxSize: '8.5KB' },
    { path: '.size/core-gauge.js', maxSize: '8.5KB' },
    { path: '.size/core-radar.js', maxSize: '9KB' },
    { path: '.size/core-sankey.js', maxSize: '8KB' },
    { path: '.size/core-parliament.js', maxSize: '7.75KB' },
    { path: '.size/core-percentage-bar.js', maxSize: '6.5KB' },
    { path: '.size/core-treemap.js', maxSize: '7.75KB' },
    { path: '.size/core-funnel.js', maxSize: '7KB' },
    { path: '.size/core-heatmap.js', maxSize: '8.75KB' },
    { path: '.size/core-calendar.js', maxSize: '9.5KB' },
    { path: '.size/core-candlestick.js', maxSize: '10.5KB' },
    { path: '.size/core-line-tooltip-legend.js', maxSize: '14KB' },
    { path: '.size/export-svg-image-download.js', maxSize: '2.5KB' },
    { path: '.size/default-chart-line.js', maxSize: '22.75KB' },
    { path: '.size/ssr-charttostring-line.js', maxSize: '9.5KB' },
    { path: '.size/elements-core-line.js', maxSize: '13.25KB' },
    { path: '.size/elements-every-type.js', maxSize: '44.5KB' },
    { path: '.size/react-linechart.js', maxSize: '23.75KB' },
    { path: '.size/vue-linechart.js', maxSize: '23.75KB' },
    { path: '.size/bootstrap-data-api.js', maxSize: '44.25KB' },
    { path: '.size/everything.js', maxSize: '46.75KB' },
    // Shipped as they are.
    { path: 'packages/core/dist/style.css', maxSize: '4KB' },
    { path: 'packages/elements/dist/tabler-charts.min.js', maxSize: '52KB' },
    { path: 'packages/bootstrap/dist/tabler-charts-bootstrap.min.js', maxSize: '52KB' },
    { path: 'packages/bootstrap/dist/bootstrap.css', maxSize: '600B' },
    { path: 'packages/bootstrap/dist/tabler.css', maxSize: '600B' },
  ],
  defaultCompression: 'gzip',
  ci: { trackBranches: ['main'] },
}
