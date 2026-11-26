import { finite } from './clean.ts'

/** The part of a map in sight. */
export interface MapView {
  /** The top left corner, in the coordinates of the map file. */
  x: number
  y: number
  /** How many times the map is magnified; `1` shows all of it. */
  scale: number
}

/** Where the last render put the map, for the zoom to work from. */
export interface MapLayout {
  /** The room of the map in chart pixels. */
  x: number
  y: number
  width: number
  height: number
  /** Pixels per unit of the map when all of it is in sight. */
  k: number
  /** Size of the map file. */
  mapWidth: number
  mapHeight: number
  /** The most the map can be magnified. */
  max: number
}

/**
 * A view kept inside the zoom range and the map itself, so the map can never
 * be dragged out of sight; along a side where all of the map fits, it is centered.
 */
export function fitView(view: Partial<MapView> | undefined, layout: MapLayout): MapView {
  const scale = Math.min(layout.max, Math.max(1, finite(view?.scale) ?? 1))
  const unit = layout.k * scale
  const fit = (at: number | null, size: number, room: number): number => {
    const span = room / unit
    return span >= size ? (size - span) / 2 : Math.min(size - span, Math.max(0, at ?? 0))
  }
  return unit > 0
    ? {
        x: fit(finite(view?.x), layout.mapWidth, layout.width),
        y: fit(finite(view?.y), layout.mapHeight, layout.height),
        scale,
      }
    : { x: 0, y: 0, scale }
}
