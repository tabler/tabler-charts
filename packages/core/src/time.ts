/**
 * Registers the time axis (`x: { type: 'time' }`):
 * `import '@tabler/charts/time'`. Also exports the scale itself.
 */
import { dateLabels } from './charts/dates.ts'
import { timeAxis } from './charts/time-axis.ts'
import { register } from './features.ts'
import { time, timePointScale } from './scales/time.ts'

register({ time: { scale: time, points: timePointScale, axis: timeAxis }, dates: dateLabels })

export type { TimeScale, TimeScaleOptions, TimeValue } from './scales/time.ts'
export { time, timePointScale }
