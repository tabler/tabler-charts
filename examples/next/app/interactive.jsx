'use client'

// Event props need a Client Component; the chart still renders on the server.
import { LineChart } from '@tabler/charts-react'
import { useState } from 'react'
import { revenue } from './data.js'

export function Interactive() {
  const [hovered, setHovered] = useState(null)
  return (
    <section>
      <h2>Hover: {hovered ?? '–'}</h2>
      <LineChart
        data={revenue}
        aspectRatio={3}
        locale="en-US"
        points="last"
        onHover={({ hit }) => setHovered(hit ? hit.title : null)}
      />
    </section>
  )
}
