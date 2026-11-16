import { bar, Chart, downloadChart, exportImage } from '@tabler/charts'
// Enables the download menu (download: true).
import '@tabler/charts/export'
import type { Demo } from '../demo.ts'

export const exportDemo: Demo = {
  id: 'export',
  title: 'Export',
  description:
    'Save a chart as SVG, PNG, JPEG or WebP: with the download menu in the chart’s corner (download: true), or from code. The export copies the computed styles into a standalone SVG (so CSS theming and custom properties come along), draws the legend in, leaves hover marks out, and renders images at 2× by default.',
  mount(el, controls) {
    const chart = new Chart(el, {
      type: bar,
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        series: [
          { name: 'Revenue', values: [42, 51, 47, 63, 58, 71] },
          { name: 'Costs', values: [31, 35, 33, 40, 44, 46] },
        ],
      },
      y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
      locale: 'en-US',
      aspectRatio: 2.5,
      title: 'Revenue and costs',
      download: ['png', 'svg', 'jpeg', 'webp'],
    })

    let format: 'png' | 'svg' | 'jpeg' | 'webp' = 'png'
    let background: string | false = 'auto'
    let legend = true
    const options = () => ({ format, background, legend })

    controls.select('Format', ['png', 'svg', 'jpeg', 'webp'] as const, 'png', (value) => {
      format = value
    })
    controls.select(
      'Background',
      ['surface', 'transparent', 'white'] as const,
      'surface',
      (value) => {
        background = value === 'surface' ? 'auto' : value === 'white' ? '#ffffff' : false
      },
    )
    controls.select('Legend', ['on', 'off'] as const, 'on', (value) => {
      legend = value === 'on'
    })
    controls.button('Download', () => void downloadChart(chart, options()))

    // A preview of the exported image, below the chart.
    const preview = document.createElement('figure')
    preview.className = 'export-preview'
    preview.hidden = true
    const image = document.createElement('img')
    image.alt = 'Exported chart'
    const caption = document.createElement('figcaption')
    preview.append(image, caption)
    el.after(preview)
    controls.button('Preview', async () => {
      const blob = await exportImage(chart, {
        background,
        legend,
        type: format === 'svg' ? 'image/png' : `image/${format}`,
      })
      URL.revokeObjectURL(image.src)
      image.src = URL.createObjectURL(blob)
      await image.decode()
      caption.textContent = `${blob.type}, ${image.naturalWidth} × ${image.naturalHeight} px, ${Math.round(blob.size / 1000)} kB`
      preview.hidden = false
    })
  },
}
