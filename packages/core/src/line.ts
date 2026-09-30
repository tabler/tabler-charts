/** Standalone entry: `import { line } from '@tabler/charts/line'`. */
import { register } from './features.ts'
import { areaPath, linePath } from './shapes/path.ts'

// Lets bar charts draw `series.type: 'line'` once this module is loaded.
register({ line: { linePath, areaPath } })

export type { LineOptions } from './charts/line.ts'
export { line } from './charts/line.ts'
