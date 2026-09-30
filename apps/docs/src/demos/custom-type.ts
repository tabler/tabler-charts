import {
  axis,
  axisSize,
  bandTicks,
  Chart,
  type ChartType,
  type Curve,
  extent,
  grid,
  h,
  innerRect,
  linear,
  linearTicks,
  linePath,
  point,
  thinTicks,
} from '@tabler/charts'
import type { Demo } from '../demo.ts'

interface Options {
  labels: string[]
  series: { name: string; values: number[] }[]
  curve: Curve
}

/**
 * A chart type assembled from the core building blocks. The built-in `line`
 * type will do the same with more options; this shows the plugin API.
 */
const multiLine: ChartType<Options> = {
  name: 'multi-line',
  render({ labels, series, curve }, { width, height, fontSize, locale }) {
    const all = series.flatMap((s) => s.values)
    const [, max] = extent(all) ?? [0, 1]
    const domain = linear([0, max], [0, 1]).nice().domain
    const format = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const

    // Measure the y labels first to size the left margin.
    const probe = linearTicks(linear(domain, [height, 0]), { locale, format })
    const area = innerRect(width, height, {
      top: 12,
      right: 16,
      bottom: 8 + axisSize('bottom', probe.slice(0, 1), fontSize),
      left: 4 + axisSize('left', probe, fontSize),
    })

    const x = point(labels, [area.x, area.x + area.width])
    const y = linear(domain, [area.y + area.height, area.y])
    const yTicks = linearTicks(y, { locale, format })

    return [
      grid({ direction: 'y', ticks: yTicks, area }),
      axis({ position: 'left', ticks: yTicks, area }),
      axis({ position: 'bottom', ticks: thinTicks(bandTicks(x), 'bottom', fontSize), area }),
      series.map((s, i) => {
        const points = s.values.map((v, j) => [x.at(j), y(v)] as const)
        const last = points.at(-1)
        return h(
          'g',
          { key: s.name, class: ['tc-series', `tc-series-${i + 1}`] },
          h('path', { class: 'tc-line', d: linePath(points, { curve }) }),
          last && h('circle', { class: 'tc-point', cx: last[0], cy: last[1], r: 4 }),
        )
      }),
    ]
  },
}

const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function randomSeries(): Options['series'] {
  return ['Online', 'Retail', 'Partners'].map((name, i) => {
    let value = 1500 + Math.random() * 1500 - i * 700
    return {
      name,
      values: LABELS.map(() => {
        value = Math.max(100, value + (Math.random() - 0.35) * 900)
        return Math.round(value)
      }),
    }
  })
}

export const customType: Demo = {
  id: 'custom-type',
  title: 'Custom chart type',
  description:
    'A multi-series line chart built from scales, ticks, axis/grid components and path generators through the chart type plugin API.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: multiLine,
      labels: LABELS,
      series: randomSeries(),
      curve: 'monotone',
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'Revenue by channel',
    })

    controls.button('Shuffle data', () => chart.update({ series: randomSeries() }))
    controls.select('Curve', ['linear', 'monotone', 'step'] as const, 'monotone', (curve) =>
      chart.update({ curve }),
    )
    controls.color('Series 1', '#2a78d6', (color) => el.style.setProperty('--tc-color-1', color))
    controls.range('Stroke', { min: 1, max: 5, step: 0.5, value: 2 }, (value) =>
      el.style.setProperty('--tc-stroke-width', `${value}px`),
    )
  },
}
