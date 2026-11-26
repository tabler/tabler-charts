/**
 * Pages made from the playground's examples (apps/docs/src/showcase): the data
 * and its source stay in one place, and a page only says which example it
 * shows, under what heading, and what it changes for the picture.
 */
import type { Group } from '../../docs/src/showcase/types.ts'
import type { AnyConfig, ScreenshotPage } from './page.ts'

/** The playground's named colors, and the picture palette's take on each (frame.css). */
const COLORS: Record<string, string> = {
  '#206bc4': 'var(--c-blue)',
  '#4299e1': 'var(--c-azure)',
  '#4263eb': 'var(--c-indigo)',
  '#ae3ec9': 'var(--c-violet)',
  '#d6336c': 'var(--c-rose)',
  '#d63939': 'var(--c-red)',
  '#f76707': 'var(--c-orange)',
  '#f59f00': 'var(--c-yellow)',
  '#74b816': 'var(--c-lime)',
  '#2fb344': 'var(--c-green)',
  '#0ca678': 'var(--c-teal)',
  '#17a2b8': 'var(--c-cyan)',
  '#667382': 'var(--c-slate)',
  '#999': 'var(--c-slate)',
  '#4a4a4a': 'var(--c-ink)',
}

/** A copy of `value` with every playground color replaced by the palette's. */
function recolor<T>(value: T, colors: Record<string, string>): T {
  if (typeof value === 'string') return (colors[value.toLowerCase()] ?? value) as T
  if (Array.isArray(value)) return value.map((entry) => recolor(entry, colors)) as T
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, recolor(v, colors)])) as T
  }
  return value
}

export interface ShowcasePage {
  /** The card's heading; the example's own title by default. */
  title?: string
  subtitle?: string
  width?: number
  /** Options laid over the example's config. */
  config?: Record<string, unknown>
  /** CSS variables laid over the example's. */
  style?: Record<string, string>
  hover?: ScreenshotPage['hover']
  /** More colors of the example to replace, on top of the playground's named ones. */
  colors?: Record<string, string>
}

/** The chart example titled `example` in `group`, as a screenshot page. */
export function fromShowcase(
  group: Group,
  example: string,
  page: ShowcasePage = {},
): ScreenshotPage {
  const item = group.items.find((entry) => entry.title === example)
  if (!item || item.kind === 'tiles') {
    throw new Error(`No chart example titled "${example}" in the "${group.id}" group`)
  }
  const colors = { ...COLORS, ...page.colors }
  return {
    title: page.title ?? item.title,
    subtitle: page.subtitle,
    source: item.source,
    width: page.width,
    config: { ...recolor(item.config, colors), aspectRatio: 2, ...page.config } as AnyConfig,
    style: { ...recolor(item.style ?? {}, colors), ...page.style },
    hover: page.hover,
  }
}
