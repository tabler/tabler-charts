// A Server Component: the charts render to SVG on the server, and the
// browser takes them over when the page hydrates.
import { BarChart, LineChart } from '@tabler/charts-react'
import { channels, revenue } from './data.js'
import { Interactive } from './interactive.jsx'

export default function Page() {
  return (
    <main>
      <h1>Next.js SSR</h1>
      <section>
        <h2>Revenue</h2>
        <LineChart data={revenue} aspectRatio={3} locale="en-US" title="Revenue and costs, 2026" />
      </section>
      <section>
        <h2>Channels</h2>
        <BarChart
          data={channels}
          stacked
          aspectRatio={3}
          locale="en-US"
          title="Visits by channel"
        />
      </section>
      <Interactive />
    </main>
  )
}
