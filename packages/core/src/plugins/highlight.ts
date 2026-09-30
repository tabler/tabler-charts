import { hoverOverlay, hoverUnderlay } from '../components/hover.ts'
import type { ChartPlugin } from '../plugin.ts'

/**
 * Draws the highlighted category: a crosshair (or a band behind bars) under
 * the series and active dots above them. `crosshair: false` keeps the dots.
 */
export function highlight(): ChartPlugin {
  return {
    name: 'highlight',
    install: () => ({
      layers: (hit, config) => ({
        under: hoverUnderlay(hit, config.crosshair !== false),
        over: hoverOverlay(hit),
      }),
    }),
  }
}
