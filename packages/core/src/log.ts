/**
 * Registers logarithmic value axes (`scale: 'log'`):
 * `import '@tabler/charts/log'`. Also exports the scale itself.
 */
import { register } from './features.ts'
import { log } from './scales/log.ts'

register({ log })

export type { LogScaleOptions } from './scales/log.ts'
export { log }
