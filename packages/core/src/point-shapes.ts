/**
 * Standalone entry: `import '@tabler/charts/point-shapes'` enables `shapes`
 * (a point shape per series) on the core.
 */
import { markerPath, shapesStep } from './charts/point-shapes.ts'
import { addPost, register } from './features.ts'

register({ 'point-shapes': markerPath })
addPost(shapesStep)

export { markerPath, shapesStep }
