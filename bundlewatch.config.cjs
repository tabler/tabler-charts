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
    { path: '.size/core-line.js', maxSize: '11.75KB' },
    { path: '.size/core-bar.js', maxSize: '11.5KB' },
    { path: '.size/core-pie.js', maxSize: '8.25KB' },
    { path: '.size/core-gauge.js', maxSize: '8.5KB' },
    { path: '.size/core-radar.js', maxSize: '8.75KB' },
    { path: '.size/core-sankey.js', maxSize: '8KB' },
    { path: '.size/core-parliament.js', maxSize: '7.75KB' },
    { path: '.size/core-heatmap.js', maxSize: '8.75KB' },
    { path: '.size/core-candlestick.js', maxSize: '10.25KB' },
    { path: '.size/core-line-tooltip-legend.js', maxSize: '13.75KB' },
    { path: '.size/export-svg-image-download.js', maxSize: '2.5KB' },
    { path: '.size/default-chart-line.js', maxSize: '22.25KB' },
    { path: '.size/ssr-charttostring-line.js', maxSize: '9.25KB' },
    { path: '.size/elements-core-line.js', maxSize: '13KB' },
    { path: '.size/elements-every-type.js', maxSize: '38KB' },
    { path: '.size/react-linechart.js', maxSize: '23.25KB' },
    { path: '.size/vue-linechart.js', maxSize: '23.25KB' },
    { path: '.size/bootstrap-data-api.js', maxSize: '37.75KB' },
    { path: '.size/everything.js', maxSize: '40KB' },
    // Shipped as they are.
    { path: 'packages/core/dist/style.css', maxSize: '3.75KB' },
    { path: 'packages/elements/dist/tabler-charts.min.js', maxSize: '45.5KB' },
    { path: 'packages/bootstrap/dist/tabler-charts-bootstrap.min.js', maxSize: '45.5KB' },
    { path: 'packages/bootstrap/dist/bootstrap.css', maxSize: '600B' },
    { path: 'packages/bootstrap/dist/tabler.css', maxSize: '600B' },
  ],
  defaultCompression: 'gzip',
  ci: { trackBranches: ['main'] },
}
