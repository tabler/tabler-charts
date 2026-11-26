import { candlestick } from '@tabler/charts'
import { C, definePage } from '../page.ts'

// Open, high, low and close of each month.
const EURUSD = [
  [1.104, 1.105, 1.079, 1.085],
  [1.085, 1.089, 1.069, 1.08],
  [1.08, 1.098, 1.078, 1.079],
  [1.079, 1.088, 1.06, 1.067],
  [1.067, 1.09, 1.065, 1.085],
  [1.085, 1.091, 1.067, 1.071],
  [1.071, 1.094, 1.07, 1.083],
  [1.083, 1.12, 1.079, 1.105],
  [1.105, 1.12, 1.101, 1.113],
  [1.113, 1.117, 1.076, 1.088],
  [1.088, 1.098, 1.033, 1.058],
  [1.058, 1.063, 1.035, 1.035],
] as const

export default definePage({
  title: 'EUR/USD',
  subtitle: 'Monthly candles, 2024',
  source: 'ECB euro reference rates, 2024',
  config: {
    type: candlestick,
    data: EURUSD.map(([open, high, low, close], month) => ({
      x: Date.UTC(2024, month, 1),
      open,
      high,
      low,
      close,
    })),
    x: { type: 'time', utc: true },
    y: { format: { minimumFractionDigits: 2, maximumFractionDigits: 2 } },
    maxCandleWidth: 20,
    aspectRatio: 2,
  },
  style: { '--tc-up-color': C.teal, '--tc-negative-color': C.coral },
})
