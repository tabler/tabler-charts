import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base.ts'

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts', 'src/line.ts', 'src/area.ts'],
  copy: [{ from: 'src/style.css', to: 'dist' }],
})
