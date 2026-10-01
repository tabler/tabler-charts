/**
 * Standalone entry: `import '@tabler/charts/hydrate'` lets a chart take over
 * server-rendered markup node by node instead of replacing it.
 */
import { register } from './features.ts'
import { hydrate } from './render/hydrate.ts'

register({ hydrate })

export { hydrate }
