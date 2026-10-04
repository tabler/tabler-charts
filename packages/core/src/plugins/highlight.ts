import { markerShape } from '../charts/cartesian.ts'
import { hoverOverlay, hoverUnderlay } from '../components/hover.ts'
import type { ChartPlugin } from '../plugin.ts'
import { listenPointer } from './pointer.ts'

/**
 * Draws the highlighted category: a crosshair (or a band behind bars) under
 * the series and active dots above them. `crosshair: false` keeps the dots.
 */
export function highlight(): ChartPlugin {
  return {
    name: 'highlight',
    install(chart) {
      const stop = listenPointer(chart)
      return {
        layers: (hit, config) => ({
          under: hoverUnderlay(hit, config.crosshair !== false),
          over: hoverOverlay(hit, 4, markerShape(config)),
        }),
        ...(stop ? { destroy: stop } : {}),
      }
    },
  }
}
