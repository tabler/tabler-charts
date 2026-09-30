import type { Hit } from '@tabler/charts'
import { AreaChart, BarChart, LineChart } from '@tabler/charts-react'
import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Demo } from '../demo.ts'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const random = () => MONTHS.map(() => Math.round(1000 + Math.random() * 4000))

const CODE = `import { LineChart } from '@tabler/charts-react'
import '@tabler/charts/style.css'

function Revenue({ series }) {
  const data = useMemo(() => ({ labels: MONTHS, series }), [series])
  return <LineChart data={data} aspectRatio={3} locale="en-US" onHover={({ hit }) => …} />
}`

const COMPONENTS = { line: LineChart, area: AreaChart, bar: BarChart } as const

function App() {
  const [kind, setKind] = useState<keyof typeof COMPONENTS>('line')
  const [values, setValues] = useState(() => [random(), random()])
  const [hovered, setHovered] = useState<Hit | null>(null)
  // Stable data between renders, so the chart only updates when it really changed.
  const data = useMemo(
    () => ({
      labels: MONTHS,
      series: [
        { name: 'Revenue', values: values[0] ?? [] },
        { name: 'Costs', values: values[1] ?? [] },
      ],
    }),
    [values],
  )
  const Component = COMPONENTS[kind]
  return (
    <>
      <pre style={{ overflowX: 'auto' }}>
        <code>{CODE}</code>
      </pre>
      <Component
        data={data}
        aspectRatio={3}
        locale="en-US"
        y={{ format: { style: 'currency', currency: 'USD', notation: 'compact' } }}
        onHover={({ hit }) => setHovered(hit)}
      />
      <div className="demo-controls">
        <button type="button" onClick={() => setValues([random(), random()])}>
          Shuffle data
        </button>
        {(['line', 'area', 'bar'] as const).map((name) => (
          <button
            type="button"
            key={name}
            aria-pressed={kind === name}
            onClick={() => setKind(name)}
          >
            {name === 'line' ? '<LineChart>' : name === 'area' ? '<AreaChart>' : '<BarChart>'}
          </button>
        ))}
        <span>onHover: {hovered ? hovered.title : '–'}</span>
      </div>
    </>
  )
}

export const reactDemo: Demo = {
  id: 'react',
  title: 'React',
  description:
    '@tabler/charts-react: <LineChart>, <BarChart>, … (one per type, tree-shaken) and <TablerChart type={…}>, plus useChart() for your own element. Props are the chart config; they are compared key by key, so memoize data. The chart renders on the server and the browser takes the SVG over; the ref is the Chart instance.',
  mount(el) {
    createRoot(el).render(<App />)
  },
}
