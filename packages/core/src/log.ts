/**
 * Registers logarithmic value axes (`scale: 'log'`):
 * `import '@tabler/charts/log'`. Also exports the scale itself.
 */
import { logDomain, logTicks } from './charts/log-axis.ts'
import { register } from './features.ts'
import { log } from './scales/log.ts'

register({ log: { scale: log, domain: logDomain, ticks: logTicks } })

export type { LogScaleOptions } from './scales/log.ts'
export { log }
