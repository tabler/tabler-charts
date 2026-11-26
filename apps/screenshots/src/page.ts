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
  /** Card width in pixels, up to the frame's 896. Defaults to 640. */
  width?: number
  /** The chart of the card. */
  config?: AnyConfig
  /** Inline CSS variables on the chart container, e.g. `--tc-color-1`. */
  style?: Record<string, string>
  /** Build the card's body by hand instead of `config`: several charts, a stat row. */
  render?: (body: HTMLElement) => void
  /** The Tabler Charts logo under the card. Defaults to `true`. */
  logo?: boolean
}

export const definePage = (page: ScreenshotPage): ScreenshotPage => page

export type { ChartConfig }
