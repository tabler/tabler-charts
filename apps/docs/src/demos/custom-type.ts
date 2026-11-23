import {
  axis,
  axisSize,
  bandTicks,
  Chart,
  type ChartType,
  type Curve,
  extent,
  formatNumber,
  grid,
  type Hit,
  h,
  highlight,
  type Interaction,
  innerRect,
  linear,
  linearTicks,
  linePath,
  point,
  thinTicks,
  tooltip,
} from '@tabler/charts/core'
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
    const fmt = formatNumber(format, locale)

    // Pointer (and keyboard) interaction: the nearest month with every series' value.
    const hitIndex = (index: number): Hit => ({
      index,
      label: labels[index] ?? '',
      title: labels[index] ?? '',
      x: x.at(index),
      area,
      items: series.map((s, seriesIndex) => {
        const value = s.values[index] ?? 0
        return { name: s.name, seriesIndex, value, text: fmt(value), x: x.at(index), y: y(value) }
      }),
    })
    const interaction: Interaction = {
      count: labels.length,
      hitIndex,
      hitTest: (px, py) =>
        py >= area.y && py <= area.y + area.height ? hitIndex(x.indexAt(px)) : null,
    }

    const content = [
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
    // With its interaction, the chart gets tooltips, hover and keyboard navigation.
    return { content, interaction }
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
    'A multi-series line chart built from scales, ticks, axis/grid components and path generators through the chart type API, on the bare core Chart with only the highlight and tooltip plugins (no legend, table or keyboard).',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: multiLine,
      labels: LABELS,
      series: randomSeries(),
      curve: 'monotone',
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'Revenue by channel',
      // The bare Chart from @tabler/charts/core runs only the plugins listed here.
      plugins: [highlight(), tooltip()],
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
