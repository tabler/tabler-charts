import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base.ts'
import { pageStyles } from './scripts/styles.mjs'

export default defineConfig([
  {
    ...baseConfig,
    entry: ['src/index.ts'],
    // The stylesheets are built by scripts/build-css.mjs; the SCSS ships as source.
    exports: {
      customExports: {
        './bootstrap.css': './dist/bootstrap.css',
        './tabler.css': './dist/tabler.css',
        './scss/charts': { sass: './scss/_charts.scss', default: './scss/_charts.scss' },
        './scss/tabler': { sass: './scss/_tabler.scss', default: './scss/_tabler.scss' },
      },
    },
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
