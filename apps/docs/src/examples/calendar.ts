import { Chart, calendar } from '@tabler/charts'
import '@tabler/charts/style.css'

// One value per day; series add up per day and the legend filters them.
new Chart('#chart', {
  type: calendar,
  data: {
    series: [
      {
        name: 'Commits',
        values: [
          { date: '2026-10-05', value: 4 },
          { date: '2026-10-06', value: 9 },
          { date: '2026-10-08', value: 2 },
        ],
      },
      {
        name: 'Reviews',
        values: [
          { date: '2026-10-06', value: 3 },
          { date: '2026-10-07', value: 1 },
        ],
      },
    ],
  },
  // The last 53 weeks, like a contribution graph; Monday first. Leave it out
  // to draw the days of the data, or set `from` and `to`: more than a year is
  // split into bands of twelve months.
  weeks: 53,
  // Shades between empty and the full color (--tc-heat-color).
  levels: 4,
  locale: 'en-US',
})
