import type { Locale } from '../format.ts'
import { formatDate } from '../format.ts'
import { type Label, toMs } from './cartesian.ts'

/**
 * Formatter for date labels on a time axis (tooltips, tables, band axes):
 * the date, with the time of day when the labels span less than a few days.
 */
export function dateLabels(
  labels: readonly Label[],
  utc: boolean | undefined,
  locale: Locale,
): (label: Label) => string {
  const first = labels[0]
  const last = labels[labels.length - 1]
  const span = first !== undefined && last !== undefined ? Math.abs(toMs(last) - toMs(first)) : 0
  const withTime = span > 0 && span < 3 * 24 * 60 * 60 * 1000
  const fmt = formatDate(
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
      ...(utc ? { timeZone: 'UTC' } : {}),
    },
    locale,
  )
  return (label) => (Number.isFinite(toMs(label)) ? fmt(toMs(label)) : String(label))
}
