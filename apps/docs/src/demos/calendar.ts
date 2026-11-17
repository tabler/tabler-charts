import { type CalendarEntry, type CalendarSeries, Chart, calendar } from '@tabler/charts'
import type { Demo } from '../demo.ts'

const DAY = 86_400_000
/** A fixed last day, so the grid, the stats and the reading are the same on every load. */
const END = Date.UTC(2026, 9, 25) // Sunday, 25 October 2026
/** Ranges on offer, in days back from the last day. */
const RANGES = { 'A year': 53 * 7, '12 weeks': 12 * 7, 'Three years': 1090 } as const
const KINDS = ['Commits', 'Reviews', 'Deployments'] as const
const MAX = { Commits: 14, Reviews: 7, Deployments: 3 }
/** Weekdays busy, Tuesday to Thursday busiest, weekends quiet (Monday first). */
const WEIGHT: Record<number, number> = { 0: 0.85, 1: 1, 2: 1.05, 3: 1, 4: 0.75, 5: 0.18, 6: 0.1 }
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** A number in [0, 1) from a string, the same every time. */
function hash01(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

const weekday = (ms: number) => (new Date(ms).getUTCDay() + 6) % 7

/** Deterministic daily counts of one kind over the last `span` days. */
function days(kind: (typeof KINDS)[number], span: number): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  for (let ms = END - (span - 1) * DAY; ms <= END; ms += DAY) {
    const key = new Date(ms).toISOString().slice(0, 10)
    const wd = weekday(ms)
    const r = hash01(`${key}:${kind}`)
    // Seven percent of days are fully off, so streaks are finite.
    let v = hash01(`${key}:off`) < 0.07 ? 0 : Math.round(r ** 1.6 * (WEIGHT[wd] ?? 0) * MAX[kind])
    if (kind === 'Deployments' && (wd >= 5 || r < 0.45)) v = 0
    if (kind === 'Reviews' && r < 0.15) v = 0
    entries.push({ date: ms, value: v })
  }
  return entries
}

const seriesOf = (span: number): CalendarSeries[] =>
  KINDS.map((name) => ({ name, values: days(name, span) }))

/** Totals per day over the series shown, oldest first. */
function totals(shown: readonly CalendarSeries[]): number[] {
  const sum = new Array<number>(shown[0]?.values.length ?? 0).fill(0)
  for (const s of shown) {
    s.values.forEach((e, i) => {
      sum[i] = (sum[i] ?? 0) + (e.value ?? 0)
    })
  }
  return sum
}

export const calendarDemo: Demo = {
  id: 'calendar',
  title: 'Calendar',
  description:
    'A contribution calendar: one column per week, one row per weekday, each day shaded in steps of one hue by its value, with a low-to-high scale. A year is a low strip of small squares; more than a year is split into bands of twelve months, named by their years. Several series add up per day and the legend filters them. Hover a day, or walk the grid with the arrow keys: left and right by a week, up and down by a day.',
  mount(el, controls) {
    let series = seriesOf(RANGES['A year'])
    const chart = new Chart(el, {
      type: calendar,
      data: { series },
      utc: true,
      locale: 'en-US',
      title: 'Contribution rhythm',
      legend: { position: 'bottom' },
    })

    const streak = controls.output('Current streak')
    const active = controls.output('Active days')
    const strongest = controls.output('Strongest weekday')
    const reading = controls.output('Reading')

    /** Streak, active days, the busiest weekday and a short reading of the series shown. */
    const describe = () => {
      const shown = series.filter((s) => !chart.isHidden(s.name))
      const noun = shown.length === 1 ? (shown[0]?.name ?? '').toLowerCase() : 'contributions'
      const sum = totals(shown)
      let run = 0
      for (let i = sum.length - 1; i >= 0 && (sum[i] ?? 0) > 0; i--) run++
      const days = sum.filter((v) => v > 0).length
      const byWeekday = [0, 0, 0, 0, 0, 0, 0]
      sum.forEach((v, i) => {
        const wd = weekday(END - (sum.length - 1 - i) * DAY)
        byWeekday[wd] = (byWeekday[wd] ?? 0) + v
      })
      const best = byWeekday.indexOf(Math.max(...byWeekday))
      const all = byWeekday.reduce((a, b) => a + b, 0)
      const weekend = (byWeekday[5] ?? 0) + (byWeekday[6] ?? 0)
      const recent = sum.slice(-28).reduce((a, b) => a + b, 0)
      const prior = sum.slice(-56, -28).reduce((a, b) => a + b, 0)
      const change = prior ? Math.round(((recent - prior) / prior) * 100) : 0

      streak(`${run} ${run === 1 ? 'day' : 'days'}`)
      active(`${days} of ${sum.length}`)
      strongest(all ? `${WEEKDAYS[best]} (${byWeekday[best]} total)` : '')
      reading(
        all
          ? `${noun.charAt(0).toUpperCase()}${noun.slice(1)} cluster midweek: ${WEEKDAYS[best]} carries the most, and ${
              weekend
                ? `weekends take only ${Math.round((weekend / all) * 100)}% of the total`
                : 'none fall on a weekend'
            }. Activity landed on ${days} of ${sum.length} days; the last four weeks are ${
              Math.abs(change) < 8
                ? 'level with'
                : `${Math.abs(change)}% ${change > 0 ? 'busier' : 'quieter'} than`
            } the four before them.`
          : `No ${noun} in this range.`,
      )
    }

    controls.select('Range', Object.keys(RANGES) as (keyof typeof RANGES)[], 'A year', (range) => {
      series = seriesOf(RANGES[range])
      chart.setData({ series })
      describe()
    })
    controls.select('Show', ['All', ...KINDS] as const, 'All', (kind) => {
      for (const name of KINDS) chart.toggleSeries(name, kind !== 'All' && name !== kind)
      describe()
    })
    chart.on('legend-toggle', describe)
    controls.range('Levels', { min: 1, max: 8, step: 1, value: 4 }, (levels) =>
      chart.update({ levels }),
    )
    controls.select('Week starts', ['Monday', 'Sunday'] as const, 'Monday', (day) =>
      chart.update({ weekStart: day === 'Monday' ? 1 : 0 }),
    )
    controls.color('Color', '#066fd1', (color) => el.style.setProperty('--tc-heat-color', color))
    describe()
  },
}
