/**
 * Size budgets, gzipped, in Bundlewatch's units (1 KB = 1024 bytes). `pnpm
 * size` builds the .size/ bundles (scripts/bundles.mjs) and runs Bundlewatch
 * on them; with BUNDLEWATCH_GITHUB_TOKEN set (CI), pull requests get a status
 * comparing every size with main. Raise a budget only on purpose.
 */
module.exports = {
  files: [
    // Typical imports, bundled and minified by scripts/bundles.mjs.
    { path: '.size/core-line.js', maxSize: '10.5KB' },
    { path: '.size/core-bar.js', maxSize: '10.5KB' },
    { path: '.size/core-pie.js', maxSize: '7KB' },
    { path: '.size/core-gauge.js', maxSize: '7.25KB' },
    { path: '.size/core-radar.js', maxSize: '7.5KB' },
    { path: '.size/core-heatmap.js', maxSize: '7.5KB' },
    { path: '.size/core-candlestick.js', maxSize: '9.25KB' },
    { path: '.size/core-line-tooltip-legend.js', maxSize: '12.25KB' },
    { path: '.size/export-svg-image-download.js', maxSize: '2.5KB' },
    { path: '.size/default-chart-line.js', maxSize: '17KB' },
    { path: '.size/ssr-charttostring-line.js', maxSize: '8.25KB' },
    { path: '.size/elements-core-line.js', maxSize: '11.75KB' },
    { path: '.size/elements-every-type.js', maxSize: '29KB' },
    { path: '.size/react-linechart.js', maxSize: '18KB' },
    { path: '.size/vue-linechart.js', maxSize: '18KB' },
    { path: '.size/bootstrap-data-api.js', maxSize: '28.75KB' },
    { path: '.size/everything.js', maxSize: '31KB' },
    // Shipped as they are.
    { path: 'packages/core/dist/style.css', maxSize: '2.75KB' },
    { path: 'packages/elements/dist/tabler-charts.min.js', maxSize: '35KB' },
    { path: 'packages/bootstrap/dist/tabler-charts-bootstrap.min.js', maxSize: '35KB' },
    { path: 'packages/bootstrap/dist/bootstrap.css', maxSize: '600B' },
    { path: 'packages/bootstrap/dist/tabler.css', maxSize: '600B' },
  ],
  defaultCompression: 'gzip',
  ci: { trackBranches: ['main'] },
}
