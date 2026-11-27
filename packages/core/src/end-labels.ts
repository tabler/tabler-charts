/**
 * Standalone entry: `import '@tabler/charts/end-labels'` enables `endLabels`
 * (the name and last value at the end of each line) on the core.
 */
import { endLabels } from './charts/end-labels.ts'
import { register } from './features.ts'

register({ 'end-labels': endLabels })

export type { EndLabelOptions } from './charts/end-labels.ts'
export { endLabels }
