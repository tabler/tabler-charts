import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base.ts'

export default defineConfig({
  ...baseConfig,
  entry: [
    'src/index.ts',
    'src/core.ts',
    'src/line.ts',
    'src/area.ts',
    'src/bar.ts',
    'src/pie.ts',
    'src/gauge.ts',
    'src/heatmap.ts',
    'src/candlestick.ts',
    'src/scatter.ts',
    'src/sparkline.ts',
    'src/decimate.ts',
    'src/time.ts',
    'src/log.ts',
  ],
  copy: [{ from: 'src/style.css', to: 'dist' }],
})
