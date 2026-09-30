import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base.ts'
import { pageStyles, shadowStyles } from './scripts/styles.mjs'

const define = {
  __TC_SHADOW_STYLES__: JSON.stringify(shadowStyles()),
  __TC_PAGE_STYLES__: JSON.stringify(pageStyles()),
}

export default defineConfig([
  {
    ...baseConfig,
    entry: ['src/index.ts', 'src/core.ts', 'src/shadow.ts'],
    define,
  },
  {
    // One classic script for a CDN: the library, the styles and <tabler-chart>.
    entry: { 'tabler-charts.min': 'src/cdn.ts' },
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
    define,
  },
])
