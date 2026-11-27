import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base.ts'

export default defineConfig({
  ...baseConfig,
  // The stylesheet is built by scripts/build-css.mjs, not from an entry.
  exports: { customExports: { './style.css': './dist/style.css' } },
  entry: [
    'src/index.ts',
    // Map files keep their folder: `@tabler/charts/maps/world`.
    { 'maps/world': 'src/maps/world.ts' },
    'src/core.ts',
    'src/line.ts',
    'src/area.ts',
    'src/bar.ts',
    'src/pie.ts',
    'src/gauge.ts',
    'src/radar.ts',
    'src/sankey.ts',
    'src/parliament.ts',
    'src/percentage-bar.ts',
    'src/treemap.ts',
    'src/funnel.ts',
    'src/heatmap.ts',
    'src/calendar.ts',
    'src/map.ts',
    'src/candlestick.ts',
    'src/annotations.ts',
    'src/patterns.ts',
    'src/value-labels.ts',
    'src/end-labels.ts',
    'src/slice-labels.ts',
    'src/point-shapes.ts',
    'src/hydrate.ts',
    'src/morph.ts',
    'src/export.ts',
    'src/scatter.ts',
    'src/sparkline.ts',
    'src/decimate.ts',
    'src/time.ts',
    'src/log.ts',
  ],
})
