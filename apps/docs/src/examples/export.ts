import { bar, Chart, downloadChart, exportImage, exportSVG } from '@tabler/charts'
import '@tabler/charts/export' // enables the download menu
import '@tabler/charts/style.css'

const chart = new Chart('#chart', {
  type: bar,
  data: { labels: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Revenue', values: [42, 51, 47] }] },
  // A menu button in the chart's corner: PNG and SVG (or list the formats).
  download: true,
})

// A standalone SVG with the computed styles, the legend drawn in.
const svg: string = exportSVG(chart)

// PNG, JPEG or WebP at 2× by default.
const png: Blob = await exportImage(chart, { type: 'image/png', background: 'auto' })

// Or save it as a file.
await downloadChart(chart, { format: 'svg', filename: 'revenue' })

console.log(svg.length, png.size)
