/**
 * Standalone entry: `import { exportSVG, exportImage, downloadChart } from '@tabler/charts/export'`
 * saves a rendered chart as a standalone SVG or an image. Importing it also
 * enables the `download` option (a menu on the chart that saves it): with the
 * `Chart` of `@tabler/charts`, which has the `download()` plugin, or with the
 * plugin installed on the core.
 */
import { downloadChart, exportImage, exportSVG } from './export-chart.ts'
import { register } from './features.ts'

// Registered here, in the entry itself, so no bundler can shake it away.
register({ export: downloadChart })

export type {
  DownloadOptions,
  ExportOptions,
  ExportTarget,
  ImageOptions,
} from './export-chart.ts'
export { downloadChart, exportImage, exportSVG }
