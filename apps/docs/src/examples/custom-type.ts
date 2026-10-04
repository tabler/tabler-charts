import { Chart, type ChartType, h, linear } from '@tabler/charts/core'
import '@tabler/charts/style.css'

// A chart type is a function from options and size to SVG nodes: the Chart
// measures, renders, patches the DOM and animates whatever it returns.
interface DotsOptions {
  data: number[]
}

const dots: ChartType<DotsOptions> = {
  name: 'dots',
  render({ data }, { width, height }) {
    const y = linear([0, Math.max(1, ...data)], [height - 8, 8])
    const step = width / Math.max(1, data.length)
    return h(
      'g',
      { class: 'tc-series tc-series-1' },
      data.map((value, i) =>
        h('circle', { key: i, class: 'tc-point', cx: step * (i + 0.5), cy: y(value), r: 5 }),
      ),
    )
  },
}

new Chart('#chart', { type: dots, data: [3, 7, 4, 9], height: 120 })
