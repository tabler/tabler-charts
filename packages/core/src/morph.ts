/**
 * Standalone entry: `import '@tabler/charts/morph'` animates path changes
 * (new data) in browsers that cannot transition `d` in CSS, such as Safari.
 * Elsewhere it does nothing; `@tabler/charts` includes it.
 */
import { register } from './features.ts'
import { morph } from './render/morph.ts'

register({ morph })

export { morph }
