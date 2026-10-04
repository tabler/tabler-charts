/**
 * Standalone entry: `import '@tabler/charts/value-labels'` enables
 * `valueLabels` (values written on the marks) on the core.
 */
import { labelsStep, valueLabels } from './charts/value-labels.ts'
import { addPost } from './features.ts'

addPost(labelsStep)

export type { ValueLabelOptions } from './charts/value-labels.ts'
export { labelsStep, valueLabels }
