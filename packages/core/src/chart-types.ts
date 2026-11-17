import type { ChartType } from './chart.ts'
import { area } from './charts/area.ts'
import { bar } from './charts/bar.ts'
import { candlestick } from './charts/candlestick.ts'
import { gauge } from './charts/gauge.ts'
import { heatmap } from './charts/heatmap.ts'
import { line } from './charts/line.ts'
import { parliament } from './charts/parliament.ts'
import { percentageBar } from './charts/percentage-bar.ts'
import { donut, pie } from './charts/pie.ts'
import { radar } from './charts/radar.ts'
import { sankey } from './charts/sankey.ts'
import { scatter } from './charts/scatter.ts'
import { sparkline } from './charts/sparkline.ts'
import { treemap } from './charts/treemap.ts'

/**
 * Every built-in chart type by its name, for charts declared in markup
 * (`<tabler-chart type="line">`, `data-tc-chart="line"`). Importing it
 * brings every type along: code that knows its types imports them directly.
 */
export const types: Readonly<Record<string, ChartType<never>>> = {
  line,
  area,
  bar,
  pie,
  donut,
  scatter,
  sparkline,
  gauge,
  heatmap,
  candlestick,
  radar,
  sankey,
  parliament,
  treemap,
  'percentage-bar': percentageBar,
} as Record<string, ChartType<never>>
