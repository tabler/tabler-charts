import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base.ts'
import { pageStyles } from './scripts/styles.mjs'

export default defineConfig([
  {
    ...baseConfig,
    entry: ['src/index.ts'],
  },
  {
    // One classic script for a CDN: the library, the styles and the data API.
    entry: { 'tabler-charts-bootstrap.min': 'src/cdn.ts' },
    format: 'iife',
    globalName: 'TablerCharts',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    sourcemap: true,
    dts: false,
    clean: false,
    deps: { alwaysBundle: [/.*/] },
    outputOptions: { entryFileNames: '[name].js' },
    define: { __TC_PAGE_STYLES__: JSON.stringify(pageStyles()) },
  },
])
