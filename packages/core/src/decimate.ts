/**
 * Registers LTTB downsampling (`decimate: N` on line and area charts):
 * `import '@tabler/charts/decimate'`. Also exports the algorithm itself.
 */
import { register } from './features.ts'
import { lttb, lttbIndices } from './shapes/decimate.ts'

register({ decimate: lttbIndices })

export { lttb, lttbIndices }
