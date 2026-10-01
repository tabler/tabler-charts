/** Standalone entry: `import { candlestick } from '@tabler/charts/candlestick'`. */
import { dateLabels } from './charts/dates.ts'
import { register } from './features.ts'

// Candles are usually dated: label them without the full time axis module.
register({ dates: dateLabels })

export type { Candle, CandlestickOptions } from './charts/candlestick.ts'
export { candlestick } from './charts/candlestick.ts'
