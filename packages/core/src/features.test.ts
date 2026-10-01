import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig } from './chart.ts'
import { bar } from './charts/bar.ts'
import { line } from './charts/line.ts'
import { feature, features, register } from './features.ts'

describe('optional features', () => {
  test('explain what to import when missing', () => {
    const saved = { ...features }
    delete features.time
    delete features.dates
    delete features.log
    delete features.decimate
    try {
      const size = { width: 300, height: 200 }
      const data = { labels: [1, 2, 3], series: [{ name: 'A', values: [1, 2, 3] }] }
      expect(() =>
        buildChart({ type: line, data, x: { type: 'time' } } as ChartConfig<object>, size),
      ).toThrow(/Import "@tabler\/charts\/time"/)
      // Dated categories (bars, candles) need the date labels from the same module.
      expect(() =>
        buildChart({ type: bar, data, x: { type: 'time' } } as ChartConfig<object>, size),
      ).toThrow(/Import "@tabler\/charts\/time"/)
      expect(() =>
        buildChart({ type: line, data, y: { scale: 'log' } } as ChartConfig<object>, size),
      ).toThrow(/@tabler\/charts\/log/)
      expect(() =>
        buildChart({ type: line, data, decimate: 2 } as ChartConfig<object>, size),
      ).toThrow(/@tabler\/charts\/decimate/)
      // Charts that do not use them render without the features.
      expect(() => buildChart({ type: line, data } as ChartConfig<object>, size)).not.toThrow()
    } finally {
      register(saved)
    }
  })

  test('register() makes a feature available', async () => {
    await import('./time.ts')
    expect(feature('time').scale).toBeTypeOf('function')
    expect(feature('time').points).toBeTypeOf('function')
  })
})
