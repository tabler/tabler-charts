<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../docs/images/logo-white.svg">
    <img src="../../docs/images/logo.svg" alt="Tabler Charts" width="280">
  </picture>
</p>

# @tabler/charts-react

React components and a hook for [`@tabler/charts`](../core). Charts render to SVG on the server, and the browser takes the markup over without re-creating it.

> 🚧 **Pre-release.** Not on npm yet; the API may still change.

```bash
npm install @tabler/charts @tabler/charts-react
```

Works with React 18 and 19, including Server Components (Next.js App Router).

## Usage

```tsx
import { LineChart } from '@tabler/charts-react'
import '@tabler/charts/style.css'

export function Revenue({ data }) {
  return <LineChart data={data} aspectRatio={3} locale="en-US" title="Revenue" />
}
```

There is one component per chart type: `LineChart`, `AreaChart`, `BarChart`, `PieChart`, `DonutChart`, `GaugeChart`, `RadarChart`, `SankeyChart`, `ScatterChart`, `HeatmapChart`, `CandlestickChart` and `Sparkline`. `TablerChart` takes the type as a prop:

```tsx
import { bar } from '@tabler/charts'
import { TablerChart } from '@tabler/charts-react'

<TablerChart type={bar} data={data} stacked />
```

## Props

Every chart option is a prop: `data`, `title`, `locale`, `aspectRatio`, `legend`, the type's own options (`stacked`, `curve` …) and so on.

- `className` and `style` go to the container `<div>`, while `class` goes to the `<svg>`.
- Options are compared key by key, so keep `data` and nested options referentially stable (`useMemo`) to avoid needless updates.
- For SSR, pass `locale` so the server and browser format numbers the same. Ids come from `useId()`, so hydration lines up.
- The chart starts from server-rendered markup, also in the browser. Under a strict CSP (`style-src` without `'unsafe-inline'`) its style attributes are reported, then set again on mount; allow `style-src-attr 'unsafe-inline'` to keep the reports out (see the core README).

## Events

```tsx
<BarChart
  data={data}
  onHover={({ hit }) => setActive(hit?.label)}
  onClick={({ hit }) => select(hit)}
  onLegendToggle={({ name, hidden }) => {}}
  onRender={({ size }) => {}}
/>
```

The latest callbacks are always used; changing them does not re-render the chart.

## The `Chart` instance

The ref is the [`Chart`](../core#the-chart-instance):

```tsx
const ref = useRef<Chart<LineOptions>>(null)
<LineChart ref={ref} data={data} />
// ref.current?.toggleSeries('Costs')
```

## `useChart()`

To render into an element of your own:

```tsx
import { line } from '@tabler/charts'
import { useChart } from '@tabler/charts-react'

function Custom({ data }) {
  const { ref, chart } = useChart({ type: line, data }, { onClick: (e) => {} })
  return <div ref={ref} className="my-chart" />
}
```

`useChart()` creates the chart on mount, updates it when the config changes and destroys it on unmount. It does not render on the server; use the components for SSR.

## License

MIT
