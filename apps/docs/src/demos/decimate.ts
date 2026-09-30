import { Chart, line } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const COUNT = 50_000
const MINUTE = 60_000

/** Noisy sensor readings with a few sharp spikes, one per minute. */
function readings(): { labels: number[]; values: number[] } {
  const end = Math.floor(Date.now() / MINUTE) * MINUTE
  const labels = Array.from({ length: COUNT }, (_, i) => end - (COUNT - 1 - i) * MINUTE)
  const values = labels.map((_, i) => {
    const trend = 55 + Math.sin(i / 3000) * 20 + Math.sin(i / 700) * 8
    const value = trend + (Math.random() - 0.5) * 12
    return i % 6000 === 3000 ? 140 : Math.round(value * 10) / 10
  })
  return { labels, values }
}

export const decimateDemo: Demo = {
  id: 'decimate',
  title: 'Large series',
  description:
    '50,000 points, one per minute for 35 days. decimate: 500 draws the line from 500 points chosen by LTTB downsampling — spikes survive — while hovering still reads every value.',
  mount(el, controls) {
    const { labels, values } = readings()
    const readout = controls.output('Render')
    const chart = new Chart(el, {
      type: line,
      data: { labels, series: [{ name: 'Sensor', values }] },
      x: { type: 'time' },
      decimate: 500,
      locale: 'en-US',
      aspectRatio: 3,
      title: 'Sensor readings',
    })
    const measure = (label: string) => {
      const start = performance.now()
      // A fresh config forces a full rebuild (a plain render() would reuse the cache).
      chart.update({}).render()
      const ms = performance.now() - start
      const segments = (el.querySelector('.tc-line')?.getAttribute('d')?.match(/[LC]/g) ?? [])
        .length
      readout(`${label}: ${ms.toFixed(1)} ms, ${segments.toLocaleString('en-US')} segments`)
    }
    measure('decimate: 500')

    controls.select('Decimate', ['500', '2000', 'off'] as const, '500', (value) => {
      chart.update({ decimate: value === 'off' ? undefined : Number(value) })
      measure(value === 'off' ? 'all 50,000 points' : `decimate: ${value}`)
    })
  },
}
