/**
 * Shared shape of the examples page: a chart card with its data source, or a
 * row of stat tiles with sparklines, grouped by domain.
 */
import type { ChartType } from '@tabler/charts'

/** A config for any chart type; cast to `ChartConfig` where it is used. */
export type AnyConfig = { type: ChartType<never> } & Record<string, unknown>

export interface ChartExample {
  kind?: 'chart'
  title: string
  /** What the chart shows and which options make it. */
  note: string
  /** Where the numbers come from, with the year. */
  source: string
  config: AnyConfig
  /** Card width: 1 (default) or 2 columns. */
  span?: 1 | 2
  /** Inline CSS variables on the chart container. */
  style?: Record<string, string>
}

export interface Tile {
  name: string
  value: string
  config: Record<string, unknown>
}

export interface TilesExample {
  kind: 'tiles'
  title: string
  note: string
  source: string
  tiles: Tile[]
}

export type Example = ChartExample | TilesExample

export interface Group {
  id: string
  name: string
  description: string
  items: Example[]
}

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
export const years = (list: readonly number[]) => list.map((y) => Date.UTC(y, 0, 1))

/** `from…to` inclusive. */
export const span = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** Every chart of the page: explicit locale and a shared aspect ratio. */
export const common = { locale: 'en-US', aspectRatio: 1.9 } as const

/** Tabler's named colors, for series that have a conventional color. */
export const C = {
  blue: '#206bc4',
  azure: '#4299e1',
  indigo: '#4263eb',
  purple: '#ae3ec9',
  pink: '#d6336c',
  red: '#d63939',
  orange: '#f76707',
  yellow: '#f59f00',
  lime: '#74b816',
  green: '#2fb344',
  teal: '#0ca678',
  cyan: '#17a2b8',
  gray: '#667382',
  muted: 'var(--tc-grid-color)',
} as const
