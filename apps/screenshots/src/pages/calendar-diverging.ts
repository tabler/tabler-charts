import { calendar } from '@tabler/charts'
import { C, definePage } from '../page.ts'
import { seeded } from '../random.ts'

// A made-up shop's daily cash flow: sales come in every day, rent and
// salaries leave at the start of the month, suppliers are paid on Fridays.
const DAY = 86_400_000
const FROM = Date.UTC(2025, 0, 1)
const random = seeded(13)
const values = Array.from({ length: 365 }, (_, i) => {
  const date = new Date(FROM + i * DAY)
  const weekday = date.getUTCDay()
  const season = 1 + 0.5 * Math.exp(-((date.getUTCMonth() - 11) ** 2) / 1.5)
  let flow = (weekday === 0 ? 0.4 : weekday === 6 ? 1.7 : 1) * season * (1.4 + random() * 1.6)
  if (date.getUTCDate() === 1) flow -= 9 + random() * 2
  if (date.getUTCDate() === 10) flow -= 6 + random() * 2
  if (weekday === 5) flow -= 3.5 + random() * 2.5
  return { date: date.toISOString().slice(0, 10), value: Math.round(flow * 100) / 100 }
})

export default definePage({
  title: 'Cash in, cash out',
  subtitle: 'Net cash flow of every day in 2025, thousands of dollars',
  width: 800,
  config: {
    type: calendar,
    data: values,
    from: '2025-01-01',
    to: '2025-12-31',
    utc: true,
    colors: [C.coral, 'var(--tc-grid-color)', C.teal],
    mid: 0,
    min: -6,
    max: 6,
    levels: 7,
    gap: 3,
    radius: 3,
    format: (value: number) => `${value < 0 ? '−' : '+'}$${Math.abs(value).toFixed(1)}K`,
    scale: { low: 'Out', high: 'In' },
  },
})
