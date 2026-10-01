/** Standalone entry: `import '@tabler/charts/annotations'` enables `annotations` in cartesian charts. */
import { annotationLayers, annotationValues } from './charts/annotations.ts'
import { register } from './features.ts'

register({ annotations: { layers: annotationLayers, values: annotationValues } })

export type { Annotation } from './charts/annotations.ts'
export { annotationLayers, annotationValues }
