/**
 * Number and date formatting built on `Intl` — locale aware, zero bytes of
 * locale data shipped.
 *
 * Formats are plain data (`Intl` options) or functions, so chart configs stay
 * serializable (JSON attributes, SSR). Pass an explicit `locale` when
 * rendering on the server, otherwise server and browser may disagree.
 */

/** Locale(s) passed to `Intl`; `undefined` uses the runtime default. */
export type Locale = string | readonly string[] | undefined

/** `Intl.NumberFormat` options or a custom formatter. */
export type NumberFormat = Intl.NumberFormatOptions | ((value: number) => string)

/** `Intl.DateTimeFormat` options or a custom formatter. */
export type DateFormat = Intl.DateTimeFormatOptions | ((value: Date) => string)

const MAX_CACHE = 64
const numberCache = /* @__PURE__ */ new Map<string, Intl.NumberFormat>()
const dateCache = /* @__PURE__ */ new Map<string, Intl.DateTimeFormat>()

function cached<T>(cache: Map<string, T>, key: string, create: () => T): T {
  let value = cache.get(key)
  if (value === undefined) {
    if (cache.size >= MAX_CACHE) cache.clear()
    value = create()
    cache.set(key, value)
  }
  return value
}

function cacheKey(locale: Locale, options: object): string {
  return `${JSON.stringify(locale ?? null)}|${JSON.stringify(options)}`
}

/** Shared, cached `Intl.NumberFormat` instance. */
export function getNumberFormat(
  locale?: Locale,
  options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat {
  return cached(
    numberCache,
    cacheKey(locale, options),
    () => new Intl.NumberFormat(locale as string | string[] | undefined, options),
  )
}

/** Shared, cached `Intl.DateTimeFormat` instance. */
export function getDateFormat(
  locale?: Locale,
  options: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormat {
  return cached(
    dateCache,
    cacheKey(locale, options),
    () => new Intl.DateTimeFormat(locale as string | string[] | undefined, options),
  )
}

/** Avoid `-0` rendering as "-0". */
const unsignedZero = (value: number): number => (value === 0 ? 0 : value)

/**
 * Create a number formatter.
 *
 * ```ts
 * formatNumber({ style: 'currency', currency: 'PLN' }, 'pl-PL')(1234.5) // "1234,50 zł"
 * ```
 */
export function formatNumber(format?: NumberFormat, locale?: Locale): (value: number) => string {
  if (typeof format === 'function') return format
  const nf = getNumberFormat(locale, format)
  return (value) => nf.format(unsignedZero(value))
}

/** Whether number options set their digits (fraction or significant). */
const digitsOf = (o: Intl.NumberFormatOptions): boolean =>
  (o.minimumFractionDigits ??
    o.maximumFractionDigits ??
    o.minimumSignificantDigits ??
    o.maximumSignificantDigits) !== undefined

/**
 * A formatter for values read one at a time (tooltips, data tables) in an
 * axis format. Compact notation suits ticks ("$25K") but hides the
 * difference between values: unless the format sets its own precision, it
 * keeps three significant digits ("$24.8K").
 */
export function formatDetail(format?: NumberFormat, locale?: Locale): (value: number) => string {
  return formatNumber(
    typeof format === 'object' && format.notation === 'compact' && !digitsOf(format)
      ? { ...format, maximumSignificantDigits: 3 }
      : format,
    locale,
  )
}
/**
 * Number of fraction digits needed to tell apart ticks `step` apart,
 * e.g. `1 → 0`, `0.2 → 1`, `0.05 → 2`.
 */
export function stepPrecision(step: number): number {
  const abs = Math.abs(step)
  if (!Number.isFinite(abs) || abs === 0) return 0
  return Math.max(0, -Math.floor(Math.log10(abs) + 1e-9))
}

function hasPrecision(options: Intl.NumberFormatOptions): boolean {
  return digitsOf(options) || (options.notation ?? 'standard') !== 'standard'
}
/**
 * Create a formatter for axis ticks `step` apart. Unless `format` sets its
 * own precision, every tick gets the same number of fraction digits, derived
 * from the step (`0, 0.5, 1` → `0.0, 0.5, 1.0`).
 */
export function formatTicks(
  step: number,
  format?: NumberFormat,
  locale?: Locale,
): (value: number) => string {
  if (typeof format === 'function') return format
  const options = format ?? {}
  if (hasPrecision(options)) return formatNumber(options, locale)

  let digits = stepPrecision(step)
  if (options.style === 'percent') digits = Math.max(0, digits - 2)
  const fmt = formatNumber(
    { ...options, minimumFractionDigits: digits, maximumFractionDigits: digits },
    locale,
  )
  // Values within floating point noise of zero (e.g. 1e-17) print as zero.
  const epsilon = Math.abs(step) * 1e-9
  return (value) => fmt(Math.abs(value) < epsilon ? 0 : value)
}

/**
 * Create a date formatter accepting `Date` objects or timestamps.
 *
 * ```ts
 * formatDate({ month: 'short', day: 'numeric' }, 'en-US')(new Date(2026, 0, 5)) // "Jan 5"
 * ```
 */
export function formatDate(format?: DateFormat, locale?: Locale): (value: Date | number) => string {
  if (typeof format === 'function') {
    return (value) => format(typeof value === 'number' ? new Date(value) : value)
  }
  const df = getDateFormat(locale, format)
  return (value) => df.format(value)
}
