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

/** `Intl.NumberFormat` options, plus suffixes of our own for compact notation. */
export interface NumberFormatOptions extends Intl.NumberFormatOptions {
  /**
   * Compact notation with these suffixes for thousands, millions, billions…
   * instead of the locale's words: `['k', 'M', 'G']` writes 1500 as "1.5k",
   * or "1,5k" in Polish, where the locale itself writes "1,5 tys.". `true`
   * stands for `['K', 'M', 'B', 'T']`. Larger numbers keep the last suffix.
   */
  compactSymbols?: boolean | readonly string[]
}

/** Number format options or a custom formatter. */
export type NumberFormat = NumberFormatOptions | ((value: number) => string)

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
  const { compactSymbols, ...options } = format ?? {}
  if (compactSymbols) {
    return formatCompact(compactSymbols === true ? SYMBOLS : compactSymbols, options, locale)
  }
  const nf = getNumberFormat(locale, options)
  return (value) => nf.format(unsignedZero(value))
}

const SYMBOLS = ['K', 'M', 'B', 'T']

/**
 * Compact notation with the given suffixes: the value divided by its power
 * of a thousand, formatted by `Intl` (separators, currency, sign) with the
 * suffix after the digits. Without digits of its own it rounds like `Intl`'s
 * compact notation: two significant digits below 10, whole numbers above.
 */
function formatCompact(
  symbols: readonly string[],
  // `notation` and `compactDisplay` are taken out: the suffixes replace them.
  { notation, compactDisplay, ...options }: Intl.NumberFormatOptions,
  locale: Locale,
): (value: number) => string {
  const own = digitsOf(options)
  const small = getNumberFormat(locale, own ? options : { ...options, maximumSignificantDigits: 2 })
  const large = own ? small : getNumberFormat(locale, { ...options, maximumFractionDigits: 0 })
  return (value) => {
    for (let exp = 0; ; exp++) {
      const scaled = unsignedZero(value / 1000 ** exp)
      const parts = (Math.abs(scaled) < 10 ? small : large).formatToParts(scaled)
      let digits = ''
      let last: Intl.NumberFormatPart | undefined
      for (const part of parts) {
        if (part.type === 'integer') digits += part.value
        if (part.type === 'integer' || part.type === 'fraction') last = part
      }
      // Four digits or more: a thousand times smaller, with the next suffix
      // (so 999 950 rounds up to "1M", not "1000K").
      if (digits.length < 4 || exp >= symbols.length) {
        if (exp && last) last.value += symbols[exp - 1]
        return parts.map((part) => part.value).join('')
      }
    }
  }
}

/** Whether number options write compact numbers ("25K"). */
const compactOf = (o: NumberFormatOptions): boolean =>
  o.notation === 'compact' || !!o.compactSymbols

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
    typeof format === 'object' && compactOf(format) && !digitsOf(format)
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

function hasPrecision(options: NumberFormatOptions): boolean {
  return (
    digitsOf(options) || !!options.compactSymbols || (options.notation ?? 'standard') !== 'standard'
  )
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
