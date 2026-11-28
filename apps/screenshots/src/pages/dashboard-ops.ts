import { bar, gauge, sparkline } from '@tabler/charts'
import { chart, el } from '../dom.ts'
import { C, definePage } from '../page.ts'
import { seeded } from '../random.ts'

// A made-up service on one screen: four numbers with their last day, traffic
// against errors on two axes, and how full the machines are.
const random = seeded(3)
const HOURS = Array.from({ length: 24 }, (_, hour) => Date.UTC(2026, 10, 26, hour))
const requests = HOURS.map((_, hour) =>
  Math.round(820 + 2400 * Math.exp(-((hour - 14) ** 2) / 22) + random() * 260),
)
const errors = requests.map(
  (_, hour) =>
    Math.round((0.18 + (hour === 16 ? 1.9 : hour === 17 ? 0.9 : 0) + random() * 0.14) * 100) / 100,
)
const latency = requests.map((count, hour) =>
  Math.round(96 + count / 34 + (hour === 16 ? 210 : 0) + random() * 18),
)
const uptime = HOURS.map((_, hour) => (hour === 16 ? 96.2 : 100))

const TILES = [
  {
    name: 'Requests per minute',
    value: '2,914',
    note: 'peak 3,412 at 14:00',
    data: requests,
    variant: 'area',
    color: C.blue,
  },
  {
    name: 'Latency, 95th percentile',
    value: '184 ms',
    note: 'target under 250 ms',
    data: latency,
    variant: 'line',
    color: C.violet,
  },
  {
    name: 'Error rate',
    value: '0.24%',
    note: 'one spike at 16:00',
    data: errors,
    variant: 'bar',
    color: C.coral,
  },
  {
    name: 'Uptime, 30 days',
    value: '99.95%',
    note: '22 minutes down',
    data: uptime,
    variant: 'line',
    color: C.teal,
  },
]

export default definePage({
  title: 'Service health',
  subtitle: 'Thursday, 26 November 2026, UTC',
  width: 896,
  render(body) {
    const tiles = el('div', 'tiles')
    tiles.style.setProperty('--columns', '4')
    for (const tile of TILES) {
      const box = el('div', 'tile')
      box.append(
        el('div', 'tile-label', tile.name),
        el('div', 'tile-value', tile.value),
        el('div', 'tile-change', tile.note),
      )
      chart(
        box,
        {
          type: sparkline,
          variant: tile.variant,
          markers: tile.variant === 'bar' ? 'none' : 'minmax',
          height: 36,
          name: tile.name,
          data: tile.data,
        },
        { '--tc-color-1': tile.color },
      )
      tiles.append(box)
    }

    const panels = el('div', 'panels')
    const traffic = el('div', 'panel')
    traffic.append(el('div', 'panel-title', 'Traffic and errors'))
    chart(traffic, {
      type: bar,
      title: 'Traffic and errors',
      data: {
        labels: HOURS,
        series: [
          { name: 'Requests per minute', values: requests, color: C.blue },
          { name: 'Error rate', values: errors, type: 'line', axis: 'y2', color: C.coral },
        ],
      },
      x: {
        format: (label: string | number | Date) =>
          `${String(new Date(label).getUTCHours()).padStart(2, '0')}:00`,
      },
      y: { format: { notation: 'compact' } },
      y2: { min: 0, max: 3, ticks: 3, format: (value: number) => `${value}%` },
      annotations: [{ x: HOURS[16] as number, label: 'Deploy', color: C.amber }],
      curve: 'monotone',
      radius: 2,
      aspectRatio: 2.15,
    })

    const machines = el('div', 'panel')
    machines.append(el('div', 'panel-title', 'Cluster capacity'))
    chart(machines, {
      type: gauge,
      title: 'Cluster capacity',
      data: [
        { name: 'CPU', value: 62, max: 100, color: C.blue },
        { name: 'Memory', value: 78, max: 100, color: C.violet },
        { name: 'Disk', value: 41, max: 100, color: C.teal },
      ],
      thickness: 12,
      gap: 5,
      cornerRadius: 6,
      center: { value: '78%', label: 'memory' },
      aspectRatio: 1.05,
    })

    panels.append(traffic, machines)
    body.append(tiles, panels)
  },
})
