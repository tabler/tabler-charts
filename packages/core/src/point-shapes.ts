/**
 * Standalone entry: `import '@tabler/charts/point-shapes'` enables `shapes`
 * (a point shape per series) on the core.
 */
import { markerClip, markerPath, shapesStep } from './charts/point-shapes.ts'
import { addPost, register } from './features.ts'

register({ 'point-shapes': markerPath, swatch: markerClip })
addPost(shapesStep)

export { markerClip, markerPath, shapesStep }
