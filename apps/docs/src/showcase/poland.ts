/**
 * Data of the charts about Poland's economy in the economy group. The figures
 * are approximate: anchors read off published charts, with straight lines
 * between them where a series has a value for every year or quarter.
 */
import { span } from './types.ts'

/** A value for every step `from…to`: the `[step, value]` anchors, and straight lines between them. */
export const between = (
  anchors: readonly (readonly [number, number])[],
  from: number,
  to: number,
  digits = 1,
) =>
  span(from, to).map((step) => {
    const next = Math.max(
      0,
      anchors.findIndex(([s]) => s >= step),
    )
    const [s1, v1] = anchors[next] as [number, number]
    const [s0, v0] = anchors[Math.max(0, next - 1)] as [number, number]
    const scale = 10 ** digits
    return s1 === s0 ? v1 : Math.round((v0 + ((v1 - v0) * (step - s0)) / (s1 - s0)) * scale) / scale
  })

/** `Q1 2005`, `Q2 2005` … for `count` quarters from the given one. */
export const quarters = (year: number, quarter: number, count: number) =>
  Array.from({ length: count }, (_, i) => {
    const q = quarter - 1 + i
    return `Q${(q % 4) + 1} ${year + Math.floor(q / 4)}`
  })

/** Contributions to annual GDP growth, percentage points, Q2 2021 – Q2 2026. */
export const GROWTH = {
  investment: [
    0, 0.6, 0.8, 0.7, -0.2, -0.2, 0.9, 0.2, 2.1, 1.7, 3.9, 0.6, 1.1, -0.3, -0.9, 0.7, -0.4, 0.8,
    1.1, 0.4, 1.2,
  ],
  privateConsumption: [
    7.2, 2.8, 4.1, 5.0, 4.6, 1.5, 0.3, -0.7, -1.3, 0.9, 0.3, 2.2, 2.3, 0, 1.8, 1.6, 2.6, 2.0, 2.0,
    2.0, 1.6,
  ],
  publicConsumption: [
    1.6, 0.7, 1.1, 0.5, 1.0, 0.5, -1.1, 0, 0.4, 0.4, 2.0, 1.7, 2.1, 1.1, 1.7, 0.2, 0.5, 1.9, 2.1,
    1.1, 0.3,
  ],
  netExports: [
    0, -2.5, -2.8, -1.4, 0, 1.4, 1.6, 4.4, 2.0, 4.2, 2.3, 0.6, -1.5, -1.7, -2.3, -0.8, -0.8, 0.1,
    -0.4, 0, 0.4,
  ],
  inventories: [
    3.2, 4.8, 5.4, 3.8, 0.6, 0.6, 0.7, -4.4, -3.9, -6.8, -7.5, -2.7, -0.5, 3.7, 3.3, 1.3, 1.3, -1.0,
    -0.9, 0, 0.2,
  ],
  gdp: [
    12.2, 6.7, 8.6, 8.8, 6.2, 4.0, 2.4, -0.5, -0.5, 0.6, 1.3, 2.6, 3.5, 3.0, 3.7, 3.1, 3.3, 3.8,
    4.1, 3.5, 3.9,
  ],
}

/** GDP per capita, international dollars at purchasing power parity, 1500–2008. */
export const LONG_RUN: Record<string, [number, number][]> = {
  'United Kingdom': [
    [1500, 3200],
    [1600, 3300],
    [1650, 3000],
    [1700, 4500],
    [1750, 5200],
    [1800, 6200],
    [1850, 8500],
    [1870, 11000],
    [1900, 14500],
    [1913, 16500],
    [1919, 13000],
    [1929, 16500],
    [1938, 19000],
    [1943, 23000],
    [1947, 20000],
    [1960, 26000],
    [1973, 36000],
    [1979, 39500],
    [1982, 37500],
    [1990, 42000],
    [1992, 41000],
    [2000, 51000],
    [2008, 58338],
  ],
  Spain: [
    [1500, 2600],
    [1600, 2500],
    [1700, 2300],
    [1800, 2600],
    [1850, 3200],
    [1900, 5000],
    [1929, 7600],
    [1938, 4800],
    [1950, 6500],
    [1960, 9500],
    [1974, 25000],
    [1985, 28000],
    [1990, 37000],
    [1993, 36800],
    [2000, 46000],
    [2008, 52333],
  ],
  Poland: [
    [1500, 1800],
    [1580, 2300],
    [1650, 1700],
    [1700, 1900],
    [1815, 1200],
    [1850, 1800],
    [1900, 5000],
    [1929, 6400],
    [1933, 4700],
    [1938, 6500],
    [1950, 6600],
    [1960, 9000],
    [1978, 18200],
    [1982, 15800],
    [1989, 17000],
    [1991, 14000],
    [2000, 22000],
    [2008, 29455],
  ],
}

/** Financial assets of Polish households, PLN trillion: `[quarter since Q1 2005, value]`. */
export const HOUSEHOLD_ASSETS: [number, number][] = [
  [0, 0.69],
  [4, 0.78],
  [9, 1.02],
  [12, 1.03],
  [13, 0.95],
  [16, 0.95],
  [20, 1.1],
  [24, 1.24],
  [25, 1.21],
  [28, 1.33],
  [32, 1.45],
  [36, 1.58],
  [40, 1.72],
  [44, 1.8],
  [48, 1.97],
  [49, 1.93],
  [50, 2.01],
  [56, 2.2],
  [60, 2.25],
  [61, 2.38],
  [64, 2.63],
  [67, 2.78],
  [69, 2.71],
  [72, 2.89],
  [76, 3.25],
  [80, 3.65],
  [84, 4.1],
]

/** GDP per hour worked, USD at purchasing power parity. */
export const PRODUCTIVITY: [string, number][] = [
  ['Ireland', 136],
  ['Luxembourg', 108],
  ['Norway', 100],
  ['Denmark', 92],
  ['Belgium', 91],
  ['Switzerland', 89],
  ['United States', 84],
  ['Austria', 83.5],
  ['Germany', 83],
  ['Netherlands', 82],
  ['Sweden', 81.8],
  ['France', 81.5],
  ['Iceland', 77.5],
  ['Finland', 73.5],
  ['United Kingdom', 73],
  ['Australia', 68],
  ['Italy', 67.5],
  ['OECD', 65],
  ['EU-27', 63],
  ['Spain', 62.5],
  ['Canada', 58.5],
  ['Slovenia', 57.5],
  ['Slovakia', 54],
  ['Czechia', 53],
  ['Lithuania', 52.5],
  ['Poland', 52.1],
  ['Israel', 51.8],
  ['Korea', 51],
  ['Japan', 50.8],
  ['Estonia', 50.5],
  ['New Zealand', 50],
  ['Portugal', 48.5],
  ['Hungary', 48],
  ['Latvia', 47],
  ['Greece', 39],
  ['Mexico', 33],
  ['Costa Rica', 29],
  ['Colombia', 19],
]

/** Net balance with the EU budget, 2004–2025, EUR billion at current prices. */
export const EU_BALANCE: [string, number][] = [
  ['Poland', 197.5],
  ['Spain', 132.7],
  ['Greece', 112],
  ['Romania', 76.5],
  ['Hungary', 74],
  ['Portugal', 71.5],
  ['Czechia', 58.5],
  ['Slovakia', 34],
  ['Bulgaria', 30.5],
  ['Lithuania', 29],
  ['Croatia', 19],
  ['Latvia', 17.5],
  ['Estonia', 12.5],
  ['Slovenia', 9.5],
  ['Ireland', 4.5],
  ['Cyprus', 2],
  ['Malta', 2],
  ['Luxembourg', 0.8],
  ['Italy', -3.5],
  ['Finland', -8],
  ['Belgium', -11.5],
  ['Austria', -14.5],
  ['Denmark', -15.5],
  ['Sweden', -28.5],
  ['Netherlands', -50.5],
  ['France', -91],
  ['Germany', -232.1],
]
