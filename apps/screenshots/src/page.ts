/**
 * The shape of a screenshot page: one file in `pages/` per picture. The file
 * name is the name of the pictures.
 */
import type { ChartConfig, ChartType } from '@tabler/charts'

/** A config for any chart type; cast to `ChartConfig` where it is used. */
export type AnyConfig = { type: ChartType<never> } & Record<string, unknown>

export interface ScreenshotPage {
  /** The card's heading. */
  title: string
  /** A muted line under the heading. */
  subtitle?: string
  /** Where the numbers come from, with the year: a muted line under the chart. */
  source?: string
  /** Card width in pixels, up to the frame's 896. Defaults to 640. */
  width?: number
  /** The chart of the card. */
  config?: AnyConfig
  /** Inline CSS variables on the chart container, e.g. `--tc-color-1`. */
  style?: Record<string, string>
  /** Build the card's body by hand instead of `config`: several charts, a stat row. */
  render?: (body: HTMLElement) => void
  /**
   * Hover the chart for the picture, to show its tooltip: a point of the chart
   * as fractions of its width and height (`{ x: 0.5, y: 0.5 }` is the middle).
   * The capture moves the mouse there and the frame draws a pointer on it.
   */
  hover?: { x: number; y: number }
  /** The Tabler Charts logo under the card. Defaults to `true`. */
  logo?: boolean
}

export const definePage = (page: ScreenshotPage): ScreenshotPage => page

/**
 * The pictures' palette, defined in frame.css for both color modes. A series
 * that has a conventional color (solar is amber, the sea is blue) names it here.
 */
export const C = {
  blue: 'var(--c-blue)',
  coral: 'var(--c-coral)',
  teal: 'var(--c-teal)',
  amber: 'var(--c-amber)',
  violet: 'var(--c-violet)',
  green: 'var(--c-green)',
  rose: 'var(--c-rose)',
  slate: 'var(--c-slate)',
  ink: 'var(--c-ink)',
  grid: 'var(--tc-grid-color)',
} as const

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** The first of January of each year, as a UTC timestamp for a time axis. */
export const years = (list: readonly number[]): number[] => list.map((y) => Date.UTC(y, 0, 1))

export type { ChartConfig }
