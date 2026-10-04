/**
 * Standalone entry: `import '@tabler/charts/patterns'` enables pattern fills
 * (`patterns: true`, and in forced colors by default) on the core.
 */
import { patternDefs, patternFills, patternVars } from './charts/patterns.ts'
import { register } from './features.ts'

register({ patterns: patternFills })

export { patternDefs, patternFills, patternVars }
