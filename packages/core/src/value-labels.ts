/**
 * Standalone entry: `import '@tabler/charts/value-labels'` enables
 * `valueLabels` (values written on the marks) on the core.
 */
import { valueLabels } from './charts/value-labels.ts'
import { register } from './features.ts'

register({ 'value-labels': valueLabels })

export type { ValueLabelOptions } from './charts/value-labels.ts'
export { valueLabels }
