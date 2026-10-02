# @tabler/charts

Zero-dependency SVG charts styled with CSS: the engine, every chart type, the plugins and the stylesheet.

> 🚧 **Pre-release.** Not on npm yet; the API may still change.

```bash
npm install @tabler/charts
```

## Quick start

```js
import { Chart, line } from '@tabler/charts'
import '@tabler/charts/style.css'

const chart = new Chart('#sales', {
  type: line,
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    series: [
      { name: 'Revenue', values: [42, 51, 47, 63] },
      { name: 'Costs', values: [31, 35, null, 40] }, // null leaves a gap
    ],
  },
  y: { format: { style: 'currency', currency: 'USD' } },
  locale: 'en-US',
})

chart.setData({ labels, series }) // new data animates from the old
```

The chart fills its container's width (height = width / `aspectRatio`, 2 by default) and follows it when it resizes.

## Two entries: everything, or only what you use

| Import | You get |
| --- | --- |
| `@tabler/charts` | `Chart` with every built-in plugin (highlight, tooltip, legend, data table, keyboard) and every optional feature registered |
| `@tabler/charts/core` | A bare `Chart` with no plugins and no features: add what you need |

```js
import { Chart, highlight, tooltip } from '@tabler/charts/core'
import { line } from '@tabler/charts/line'
import '@tabler/charts/time' // only if you use x: { type: 'time' }

new Chart('#el', { type: line, data, plugins: [highlight(), tooltip()] })
```

Chart types have their own entries (`@tabler/charts/line`, `/bar`, `/pie` …). Optional features register themselves when imported:

| Entry | Enables |
| --- | --- |
| `@tabler/charts/time` | `x: { type: 'time' }`: points at their real distance in time, calendar ticks, date labels |
| `@tabler/charts/log` | `y: { scale: 'log' }` |
| `@tabler/charts/decimate` | `decimate: 500` on line and area charts (LTTB downsampling) |
| `@tabler/charts/annotations` | `annotations` on line, area, bar and candlestick charts |
| `@tabler/charts/hydrate` | Taking over server-rendered markup node by node (otherwise it is replaced) |
| `@tabler/charts/export` | `exportSVG()`, `exportImage()`, `downloadChart()` |

A feature you use but did not import throws an error that names the import.

## Chart types

| Type | Data | Notable options |
| --- | --- | --- |
| `line` | `{ labels, series }` | `curve` (`'monotone'`, `'linear'`, `'step'` …), `points` (`'none'`, `'last'`, `'all'`), `area`, `stacked`, `connectNulls`, `decimate` |
| `area` | `{ labels, series }` | as `line`, filled; `fill: 'gradient' \| 'solid'` |
| `bar` | `{ labels, series }` | `stacked` (`true` or `'percent'`), `orientation: 'horizontal'`, `radius`, `gap`, `maxBarWidth`; `series[].type: 'line' \| 'area'` mixes in lines |
| `pie`, `donut` | `[{ name, value }]` | `innerRadius`, `gap`, `cornerRadius`, `center` (text in the middle) |
| `gauge` | a number, a ring or rings | `max`, `startAngle`, `angle` (`270` for a dial), `thickness`, `center` |
| `radar` | `{ labels, series }` | `grid: 'polygon' \| 'circle'`, `fill`, `points`, `r` (radial axis) |
| `scatter` | `{ series: [{ name, points: [{ x, y, size? }] }] }` | `radius`, `size` (bubble radii); points with `size` are bubbles |
| `heatmap` | `{ labels, series }` (rows) | `min`, `max`, `ranges`, `colors` + `mid` (scales), `colorBy: 'series'` |
| `candlestick` | `[{ x, open, high, low, close }]` | time axes, `maxCandleWidth` |
| `sparkline` | `number[]` | `variant` (`'line'`, `'area'`, `'bar'`, `'tristate'`), `point`, `markers: 'minmax'` |

Series take `name`, `values`, and optionally `id` (stable identity), `color`, `dash`, `width`, `class` and `hidden`.

Cartesian charts share two axes:
- `x`: `format`, `type: 'time'`, `utc`, `grid`, `line`, `show`.
- `y`: `min`, `max`, `zero`, `nice`, `ticks`, `format`, `scale: 'log'`, `grid`, `show`.

They also share `annotations`:

```js
annotations: [
  { y: 99.9, label: 'SLA' },             // a line at a value
  { y: [40, 60], label: 'Normal' },      // a band between values
  { x: 'Jun', label: 'Launch' },         // a line at a category (or a date)
]
```

## Options every chart takes

| Option | Default | |
| --- | --- | --- |
| `width`, `height` | container width, width / `aspectRatio` | `height: 'container'` follows the container's height |
| `aspectRatio` | `2` | |
| `title`, `description` | | Accessible name and description; without a title the name lists the series ("line chart: Revenue, Costs") |
| `locale` | runtime default | For `Intl` number and date formatting; set it for SSR |
| `fontSize` | `--tc-font-size` | Used to lay out labels; set it for SSR |
| `id` | generated | Prefix of ids inside the SVG; set it for SSR |
| `legend` | for 2+ entries | `false`, `true` or `{ position: 'bottom' }` |
| `tooltip` | `true` | `false` or `{ format, footer }` for custom content |
| `crosshair` | `true` | |
| `table` | `true` | Hidden data table for screen readers; `'visible'` shows it |
| `keyboard` | `true` | Arrow keys walk the data; sparklines opt out |
| `animate` | `true` | Charts with more than 1000 elements skip transitions unless `true` |
| `class` | | Extra classes on the `<svg>` |
| `plugins` | | Extra plugins |

## The `Chart` instance

```js
chart.update({ stacked: true })       // merge options, re-render in the next frame
chart.setData(data)
chart.toggleSeries('Costs')           // by key, name or index
chart.highlightIndex(2)               // as keyboard navigation does
chart.clearHighlight()
chart.resize()
chart.destroy()

const off = chart.on('hover', ({ hit }) => {}) // also: click, legend-toggle, render
```

Updates are batched into one animation frame for every chart on the page. `flush()` runs them right away (useful in tests).

## Theming

Everything visual is CSS. The stylesheet defines tokens on `:root` (light and dark), and every element has semantic classes:

```css
.revenue-chart {
  --tc-color-1: oklch(60% 0.2 250);  /* palette slots --tc-color-1 … 8 */
  --tc-stroke-width: 3px;
  --tc-font-size: 13px;
}
.revenue-chart .tc-series-2 .tc-line { stroke-dasharray: 4 4; }
```

Tokens include `--tc-color-1` … `--tc-color-8`, `--tc-surface`, `--tc-text-color`, `--tc-text-muted`, `--tc-grid-color`, `--tc-baseline-color`, `--tc-font-family`, `--tc-font-size`, `--tc-stroke-width`, `--tc-area-opacity`, `--tc-duration`, `--tc-easing` and the `--tc-tooltip-*` set.

Dark mode follows `prefers-color-scheme`, and `data-theme="dark"` / `"light"` on any ancestor overrides it. `prefers-reduced-motion` turns animations off, and forced colors (Windows High Contrast) are supported.

## Server-side rendering

```js
import { chartToString, line } from '@tabler/charts'

const svg = chartToString(
  { type: line, data, id: 'sales', locale: 'en-US', fontSize: 12 },
  { width: 600, height: 300 },
)
```

Put the SVG in the chart's container. A `Chart` created on the same element later takes the markup over node by node (with `@tabler/charts`, or `@tabler/charts/hydrate` on the core). Set `id`, `locale` and `fontSize` explicitly so the server and browser layouts match. The React and Vue adapters do all of this for you.

## Export

```js
import { downloadChart, exportImage, exportSVG } from '@tabler/charts'

const svg = exportSVG(chart)                          // standalone SVG string
const png = await exportImage(chart, { scale: 3 })    // Blob; also image/jpeg, image/webp
await downloadChart(chart, { format: 'svg' })         // saves "<title>.svg"
```

The export copies the computed styles into the SVG, so CSS theming comes along. It also draws the legend in, leaves hover marks out and paints the surface color behind the chart (`background: false` for none).

## Accessibility

- **Name and description:** every chart is a `role="img"` with an accessible name and, with `description`, a description.
- **Data table:** a data table is there for screen readers; it is visually hidden unless `table: 'visible'`.
- **Keyboard:** Left and Right walk the categories, Up and Down the series, Home and End jump to the ends, and Escape clears the highlight. The tooltip follows.
- **Palette:** the default palette is checked for colorblind separation, and the legend gives every series a name, never color alone.

## License

MIT
