import { line } from '@tabler/charts'
import { climate } from '../../../docs/src/showcase/climate.ts'
import { C, definePage } from '../page.ts'

type Series = { values: number[] }
type Data = { labels: string[]; series: Series[] }

/** The data of a chart example of the climate group. */
function data(example: string): Data {
  const item = climate.items.find((entry) => entry.title === example)
  if (!item || item.kind === 'tiles') throw new Error(`No climate example titled "${example}"`)
  return (item.config as unknown as { data: Data }).data
}

const co2 = data('Atmospheric CO₂')
const anomaly = data('Global temperature anomaly')

export default definePage({
  title: 'CO₂ and global temperature',
  subtitle: 'Annual mean at Mauna Loa, and the difference from the 1951–1980 mean',
  source: 'NOAA Global Monitoring Laboratory; NASA GISS, 1960–2024',
  width: 720,
  config: {
    type: line,
    aspectRatio: 2,
    curve: 'linear',
    data: {
      labels: co2.labels,
      series: [
        { name: 'CO₂', color: C.slate, values: co2.series[0]?.values },
        {
          name: 'Temperature anomaly',
          axis: 'y2',
          color: C.coral,
          values: anomaly.series[0]?.values,
        },
      ],
    },
    y: { min: 300, max: 450, ticks: 4, title: 'CO₂, ppm' },
    y2: {
      min: -0.5,
      max: 1.5,
      ticks: 5,
      title: 'Anomaly, °C',
      format: { signDisplay: 'exceptZero', maximumFractionDigits: 1 },
    },
  },
})
