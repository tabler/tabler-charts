import { heatmap } from '@tabler/charts'
import { definePage } from '../page.ts'

const HOURS = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// A working-week rhythm: busy around noon, quiet at night and on the weekend.
const activity = (day: number, hour: number) => {
  const daytime = Math.max(0, 1 - Math.abs(hour - 6.5) / 5)
  const weekend = day > 4 ? 0.35 : 1
  return Math.round(daytime * weekend * (18 + ((day * 7 + hour * 3) % 6)))
}

export default definePage({
  title: 'Activity by hour',
  subtitle: 'Commits per two-hour slot',
  config: {
    type: heatmap,
    data: {
      labels: HOURS,
      series: DAYS.map((name, day) => ({
        name,
        values: HOURS.map((_, hour) => activity(day, hour)),
      })),
    },
    gap: 3,
    aspectRatio: 2,
  },
})
