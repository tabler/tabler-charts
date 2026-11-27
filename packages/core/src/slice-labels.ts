/**
 * Standalone entry: `import '@tabler/charts/slice-labels'` enables `labels`
 * (every slice named beside a pie or donut, joined to it by a line) on the core.
 */
import { sliceLabels } from './charts/slice-labels.ts'
import { register } from './features.ts'

register({ 'slice-labels': sliceLabels })

export type { SliceLabelOptions } from './charts/slice-labels.ts'
export { sliceLabels }
