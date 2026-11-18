/**
 * Edge cases: real-world data and awkward inputs, one card each, grouped.
 * Every card says what should happen, so a glance (or tools-tmp checks)
 * tells what works. The data is generated from a seed per card, so it is
 * the same on every load.
 */
import '@tabler/charts/style.css'
import '@tabler/charts/export'
import './site.css'
import {
  area,
  bar,
  Chart,
  type ChartConfig,
  type ChartType,
  calendar,
  candlestick,
  donut,
  gauge,
  heatmap,
  line,
  percentageBar,
  pie,
  radar,
  sankey,
  scatter,
  sparkline,
} from '@tabler/charts'
import { setupThemeSwitch } from './theme.ts'

type AnyConfig = { type: ChartType<never> } & Record<string, unknown>

interface Case {
  title: string
  /** What the chart should do with this input. */
  expect: string
  config: AnyConfig
  /** Container size, when the card should not be its default width. */
  box?: { width?: string; height?: string }
}

// -- Deterministic data -------------------------------------------------------

let seed = 1
const reseed = (name: string) => {
  seed = 2166136261
  for (let i = 0; i < name.length; i++) seed = Math.imul(seed ^ name.charCodeAt(i), 16777619) >>> 0
}
const rnd = () => {
  seed = (seed + 0x6d2b79f5) >>> 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const range = (n: number) => Array.from({ length: n }, (_, i) => i)
/** A random walk, never below `min`. */
const walk = (n: number, start: number, step: number, min = Number.NEGATIVE_INFINITY) => {
  let v = start
  return range(n).map(() => {
    v = Math.max(min, v + (rnd() - 0.48) * step)
    return Math.round(v * 100) / 100
  })
}
const DAY = 86_400_000
const days = (n: number, from = Date.UTC(2026, 0, 1)) => range(n).map((i) => from + i * DAY)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const base = { locale: 'en-US' }

// -- The cases ----------------------------------------------------------------

const groups: [string, () => Case[]][] = [
  [
    'Real-world data',
    () => [
      {
        title: 'Stock price, one trading year',
        expect: 'Weekdays only on a time axis: weekend gaps stay as real time, month ticks.',
        config: {
          type: line,
          ...base,
          x: { type: 'time', utc: true },
          y: { format: { style: 'currency', currency: 'USD' } },
          data: (() => {
            const labels = days(365).filter((t) => {
              const d = new Date(t).getUTCDay()
              return d !== 0 && d !== 6
            })
            return { labels, series: [{ name: 'ACME', values: walk(labels.length, 182, 6, 20) }] }
          })(),
        },
      },
      {
        title: 'Traffic with a viral spike',
        expect: 'One day 40× the others: the axis fits it, the rest stays readable.',
        config: {
          type: area,
          ...base,
          x: { type: 'time', utc: true },
          y: { format: { notation: 'compact' } },
          data: (() => {
            const values = walk(90, 1200, 300, 200)
            values[61] = 52_000
            values[62] = 18_000
            return { labels: days(90), series: [{ name: 'Visitors', values }] }
          })(),
        },
      },
      {
        title: 'Temperatures below zero',
        expect: 'Min and max lines crossing zero; the zero line and °C labels.',
        config: {
          type: line,
          ...base,
          y: { format: { style: 'unit', unit: 'celsius' } },
          data: {
            labels: MONTHS,
            series: [
              { name: 'Max', values: [-2, 0, 6, 13, 19, 23, 25, 24, 19, 12, 5, 0] },
              { name: 'Min', values: [-9, -8, -4, 2, 7, 11, 13, 12, 8, 3, -2, -7] },
            ],
          },
        },
      },
      {
        title: 'Revenue in billions',
        expect: 'Compact currency ticks ($1B, $2B …), no overlapping labels.',
        config: {
          type: bar,
          ...base,
          y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
          data: {
            labels: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
            series: [
              { name: 'Revenue', values: [1.2e9, 0.9e9, 1.6e9, 2.4e9, 2.1e9, 3.3e9, 4.05e9] },
            ],
          },
        },
      },
      {
        title: 'Profit and loss',
        expect: 'Bars grow down for losses; the zero line separates them.',
        config: {
          type: bar,
          ...base,
          y: { format: { style: 'currency', currency: 'EUR', notation: 'compact' } },
          data: {
            labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2', 'Q3', 'Q4'],
            series: [
              {
                name: 'Net',
                values: [120e3, -45e3, 80e3, -210e3, 30e3, 160e3, -12e3, 240e3],
              },
            ],
          },
        },
      },
      {
        title: 'Budget vs actual',
        expect: 'Bars for actual, a dashed line for the budget over them.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: MONTHS.slice(0, 6),
            series: [
              { name: 'Actual', values: [42, 47, 51, 38, 60, 58] },
              { name: 'Budget', type: 'line', dash: 4, values: [45, 45, 50, 50, 55, 55] },
            ],
          },
        },
      },
      {
        title: 'Market share with tiny slices',
        expect: 'Slices under 1% still visible and in the legend.',
        config: {
          type: pie,
          ...base,
          data: [
            { name: 'Chrome', value: 64.7 },
            { name: 'Safari', value: 18.6 },
            { name: 'Edge', value: 5.2 },
            { name: 'Firefox', value: 2.7 },
            { name: 'Opera', value: 0.4 },
            { name: 'Other', value: 0.08 },
          ],
        },
      },
      {
        title: 'CPU load, 0–100%',
        expect: 'A fixed 0–100% axis; the line touches 100% without clipping.',
        config: {
          type: area,
          ...base,
          y: { min: 0, max: 1, format: { style: 'percent' } },
          data: {
            labels: range(60).map((i) => `${i}s`),
            series: [{ name: 'CPU', values: walk(60, 0.4, 0.2, 0).map((v) => Math.min(1, v)) }],
          },
        },
      },
      {
        title: 'Error rate in tiny fractions',
        expect: 'Ticks like 0.10%, 0.15%: the precision follows the step.',
        config: {
          type: line,
          ...base,
          y: { format: { style: 'percent' } },
          data: {
            labels: days(30).map((t) => new Date(t).toISOString().slice(5, 10)),
            // (walk() rounds to cents, which would turn these into zeros.)
            series: [{ name: 'Errors', values: range(30).map(() => 0.0008 + rnd() * 0.0009) }],
          },
        },
      },
      {
        title: 'Population on a log scale',
        expect: 'Powers of ten from a village to China; bars all visible.',
        config: {
          type: bar,
          ...base,
          y: { scale: 'log', format: { notation: 'compact' } },
          data: {
            labels: ['Village', 'Town', 'City', 'Region', 'Country', 'China'],
            series: [{ name: 'People', values: [800, 24_000, 1_900_000, 12e6, 38e6, 1.41e9] }],
          },
        },
      },
      {
        title: 'Crypto, a year of daily candles',
        expect: '365 thin candles, date ticks spaced out, nothing past the edges.',
        config: {
          type: candlestick,
          ...base,
          x: { type: 'time', utc: true },
          y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
          data: (() => {
            let close = 42_000
            return days(365).map((x) => {
              const open = close
              close = Math.max(1000, open * (1 + (rnd() - 0.49) * 0.06))
              return {
                x,
                open,
                close,
                high: Math.max(open, close) * (1 + rnd() * 0.02),
                low: Math.min(open, close) * (1 - rnd() * 0.02),
              }
            })
          })(),
        },
      },
      {
        title: 'Contributions heatmap, 52 weeks',
        expect: '7 × 52 cells, many empty; labels thinned.',
        config: {
          type: heatmap,
          ...base,
          gap: 2,
          data: {
            labels: range(52).map((w) => `W${w + 1}`),
            series: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => ({
              name,
              values: range(52).map(() => (rnd() < 0.35 ? null : Math.round(rnd() ** 2 * 12))),
            })),
          },
        },
      },
      {
        title: 'Calendar, a full year',
        expect: '53 columns of small cells; month names thinned, weekdays every other.',
        config: {
          type: calendar,
          ...base,
          utc: true,
          data: range(365).map((i) => ({
            date: Date.UTC(2026, 0, 1 + i),
            value: rnd() < 0.3 ? null : Math.round(rnd() ** 2 * 12),
          })),
        },
      },
      {
        title: 'Calendar, one day',
        expect: 'One cell in its weekday row, a month name, the scale.',
        config: { type: calendar, ...base, data: [{ date: '2026-10-26', value: 3 }] },
      },
      {
        title: 'Survey, 100% stacked',
        expect: 'Five answers per question, every bar exactly 100%.',
        config: {
          type: bar,
          ...base,
          stacked: 'percent',
          orientation: 'horizontal',
          data: {
            labels: ['Ease of use', 'Speed', 'Docs', 'Support', 'Price'],
            series: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'].map(
              (name) => ({ name, values: range(5).map(() => Math.round(rnd() * 40)) }),
            ),
          },
        },
      },
      {
        title: 'Height vs weight, 300 people',
        expect: 'A dense cloud; hovering finds the nearest point.',
        config: {
          type: scatter,
          ...base,
          x: { format: { style: 'unit', unit: 'centimeter' } },
          y: { format: { style: 'unit', unit: 'kilogram' } },
          data: {
            series: ['Women', 'Men'].map((name, s) => ({
              name,
              points: range(150).map(() => {
                const h = 162 + s * 14 + (rnd() - 0.5) * 24
                return { x: Math.round(h), y: Math.round((h - 100) * (0.9 + rnd() * 0.3)) }
              }),
            })),
          },
        },
      },
      {
        title: 'GDP bubbles, sizes 1 to 10000',
        expect: 'Area-proportional bubbles; the big ones cut at the plot edge.',
        config: {
          type: scatter,
          ...base,
          y: { format: { style: 'percent' } },
          data: {
            series: [
              {
                name: 'Countries',
                points: range(24).map((i) => ({
                  x: Math.round(rnd() * 60_000),
                  y: Math.round(rnd() * 80) / 1000,
                  size: i === 0 ? 10_000 : Math.round(1 + rnd() * 900),
                  label: `Country ${i + 1}`,
                })),
              },
            ],
          },
        },
      },
      {
        title: 'Skills radar',
        expect: 'Two overlapping polygons, labels around without clipping.',
        config: {
          type: radar,
          ...base,
          r: { max: 10 },
          data: {
            labels: ['JavaScript', 'CSS', 'Accessibility', 'Testing', 'Design', 'DevOps', 'SQL'],
            series: [
              { name: 'Ann', values: [9, 8, 7, 6, 5, 3, 4] },
              { name: 'Bob', values: [6, 5, 3, 9, 2, 8, 9] },
            ],
          },
        },
      },
      {
        title: 'Disk almost full',
        expect: 'A dial at 97% with its value in the middle.',
        config: {
          type: gauge,
          ...base,
          data: { name: 'used', value: 485, max: 500 },
          startAngle: -135,
          angle: 270,
        },
      },
    ],
  ],
  [
    'Empty and degenerate data',
    () => [
      {
        title: 'No series',
        expect: 'An empty plot, no errors.',
        config: { type: line, ...base, data: { labels: ['a', 'b'], series: [] } },
      },
      {
        title: 'Series without values',
        expect: 'An empty plot, the legend still lists it.',
        config: { type: line, ...base, data: { series: [{ name: 'Empty', values: [] }] } },
      },
      {
        title: 'Only nulls',
        expect: 'Labels, a default 0–1 axis, no line.',
        config: {
          type: line,
          ...base,
          data: { labels: ['a', 'b', 'c'], series: [{ name: 'A', values: [null, null, null] }] },
        },
      },
      {
        title: 'Only zeros, line',
        expect: 'A flat line on the zero baseline.',
        config: {
          type: line,
          ...base,
          data: { labels: ['a', 'b', 'c', 'd'], series: [{ name: 'A', values: [0, 0, 0, 0] }] },
        },
      },
      {
        title: 'Only zeros, bars',
        expect: 'No bars (zero height), an axis from 0.',
        config: {
          type: bar,
          ...base,
          data: { labels: ['a', 'b', 'c'], series: [{ name: 'A', values: [0, 0, 0] }] },
        },
      },
      {
        title: 'A single point',
        expect: 'One dot in the middle (a line needs two).',
        config: {
          type: line,
          ...base,
          points: 'all',
          data: { labels: ['Only'], series: [{ name: 'A', values: [42] }] },
        },
      },
      {
        title: 'A single bar',
        expect: 'One bar, capped width, centered.',
        config: {
          type: bar,
          ...base,
          data: { labels: ['Only'], series: [{ name: 'A', values: [42] }] },
        },
      },
      {
        title: 'Flat non-zero series',
        expect: 'A flat line with some room above and below.',
        config: {
          type: line,
          ...base,
          data: { labels: ['a', 'b', 'c'], series: [{ name: 'A', values: [7, 7, 7] }] },
        },
      },
      {
        title: 'Pie of zeros',
        expect: 'An empty ring (track), no NaN.',
        config: {
          type: pie,
          ...base,
          data: [
            { name: 'A', value: 0 },
            { name: 'B', value: 0 },
          ],
        },
      },
      {
        title: 'Pie with one slice',
        expect: 'A full circle.',
        config: { type: donut, ...base, data: [{ name: 'All', value: 1 }] },
      },
      {
        title: 'Pie with a negative value',
        expect: 'The negative slice is ignored (or zero), the others fill the circle.',
        config: {
          type: pie,
          ...base,
          data: [
            { name: 'A', value: 5 },
            { name: 'B', value: -3 },
            { name: 'C', value: 2 },
          ],
        },
      },
      {
        title: 'Gauge over its max',
        expect: 'A full ring, the value shown as it is (or capped at 100%).',
        config: { type: gauge, ...base, data: { name: 'over', value: 140, max: 100 } },
      },
      {
        title: 'Gauge below zero',
        expect: 'An empty track, 0%.',
        config: { type: gauge, ...base, data: { name: 'under', value: -20 } },
      },
      {
        title: 'Gauge with max 0',
        expect: 'No division by zero: an empty track.',
        config: { type: gauge, ...base, data: { name: 'none', value: 5, max: 0 } },
      },
      {
        title: 'Heatmap of equal values',
        expect: 'All cells the same color.',
        config: {
          type: heatmap,
          ...base,
          data: {
            labels: ['a', 'b', 'c'],
            series: [
              { name: 'X', values: [5, 5, 5] },
              { name: 'Y', values: [5, 5, 5] },
            ],
          },
        },
      },
      {
        title: 'Heatmap of nulls',
        expect: 'Only empty cells.',
        config: {
          type: heatmap,
          ...base,
          data: { labels: ['a', 'b'], series: [{ name: 'X', values: [null, null] }] },
        },
      },
      {
        title: 'Flat candles (doji)',
        expect: 'Open = high = low = close: thin marks, no NaN.',
        config: {
          type: candlestick,
          ...base,
          data: ['a', 'b', 'c'].map((x) => ({ x, open: 10, high: 10, low: 10, close: 10 })),
        },
      },
      {
        title: 'Identical scatter points',
        expect: 'All 50 points on one spot; the axis still has a range.',
        config: {
          type: scatter,
          ...base,
          data: { series: [{ name: 'A', points: range(50).map(() => ({ x: 3, y: 3 })) }] },
        },
      },
      {
        title: 'Radar with two spokes',
        expect: 'Degenerate but drawn: a line through the center.',
        config: {
          type: radar,
          ...base,
          data: { labels: ['A', 'B'], series: [{ name: 'S', values: [3, 5] }] },
        },
      },
      {
        title: 'Radar of zeros',
        expect: 'Rings, spokes, the polygon collapsed in the center.',
        config: {
          type: radar,
          ...base,
          data: {
            labels: ['A', 'B', 'C', 'D', 'E'],
            series: [{ name: 'S', values: [0, 0, 0, 0, 0] }],
          },
        },
      },
      {
        title: 'Sparkline of one value',
        expect: 'A dot, no NaN.',
        config: { type: sparkline, ...base, height: 40, data: [5] },
      },
      {
        title: 'Empty sparkline',
        expect: 'Nothing drawn, no errors.',
        config: { type: sparkline, ...base, height: 40, data: [] },
      },
    ],
  ],
  [
    'Extreme numbers',
    () => [
      {
        title: 'Trillions',
        expect: 'Compact ticks (1T, 2T …), no overflow.',
        config: {
          type: line,
          ...base,
          y: { format: { notation: 'compact' } },
          data: {
            labels: ['a', 'b', 'c', 'd'],
            series: [{ name: 'A', values: [1e12, 3.5e12, 2e12, 8e12] }],
          },
        },
      },
      {
        title: 'Full numbers in the quadrillions',
        expect: 'Long tick labels push the plot right instead of overlapping it.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: ['a', 'b', 'c'],
            series: [{ name: 'A', values: [1.2e15, 4.4e15, 2.9e15] }],
          },
        },
      },
      {
        title: 'Nanoseconds',
        expect: 'Ticks like 0.000000002: readable, not 0 0 0.',
        config: {
          type: line,
          ...base,
          data: {
            labels: ['a', 'b', 'c', 'd'],
            series: [{ name: 'A', values: [2e-9, 5e-9, 3e-9, 8e-9] }],
          },
        },
      },
      {
        title: 'Tiny differences on a huge base',
        expect: '1,000,000.01 vs 1,000,000.05: the axis zooms in, labels differ.',
        config: {
          type: line,
          ...base,
          data: {
            labels: ['a', 'b', 'c', 'd'],
            series: [
              { name: 'A', values: [1_000_000.01, 1_000_000.05, 1_000_000.02, 1_000_000.04] },
            ],
          },
        },
      },
      {
        title: 'Only negative values',
        expect: 'An axis below zero, area filled from zero down.',
        config: {
          type: area,
          ...base,
          data: {
            labels: ['a', 'b', 'c', 'd'],
            series: [{ name: 'A', values: [-5, -12, -3, -8] }],
          },
        },
      },
      {
        title: 'NaN and Infinity in the data',
        expect: 'Treated as gaps, no NaN in the SVG.',
        config: {
          type: line,
          ...base,
          points: 'all',
          data: {
            labels: ['a', 'b', 'c', 'd', 'e'],
            series: [{ name: 'A', values: [1, Number.NaN, 3, Number.POSITIVE_INFINITY, 5] }],
          },
        },
      },
      {
        title: 'Log scale with zeros and negatives',
        expect: 'Zero and negative values become gaps; the rest on powers of ten.',
        config: {
          type: line,
          ...base,
          y: { scale: 'log' },
          points: 'all',
          data: {
            labels: ['a', 'b', 'c', 'd', 'e'],
            series: [{ name: 'A', values: [10, 0, 1000, -5, 100000] }],
          },
        },
      },
      {
        title: 'Stacked with negatives',
        expect: 'Positive parts stack up, negative parts down from zero.',
        config: {
          type: bar,
          ...base,
          stacked: true,
          data: {
            labels: ['a', 'b', 'c', 'd'],
            series: [
              { name: 'A', values: [5, -3, 4, -6] },
              { name: 'B', values: [-2, 6, 3, -1] },
              { name: 'C', values: [4, 2, -5, 3] },
            ],
          },
        },
      },
      {
        title: '100% stack with an empty category',
        expect: 'The all-zero category is empty, the others are exactly 100%.',
        config: {
          type: area,
          ...base,
          stacked: 'percent',
          data: {
            labels: ['a', 'b', 'c', 'd'],
            series: [
              { name: 'A', values: [3, 0, 2, 5] },
              { name: 'B', values: [1, 0, 6, 5] },
            ],
          },
        },
      },
      {
        title: 'Fixed range narrower than the data',
        expect: 'y 0–50 while values reach 90: the lines are clipped at the plot.',
        config: {
          type: line,
          ...base,
          y: { min: 0, max: 50 },
          data: { labels: ['a', 'b', 'c', 'd'], series: [{ name: 'A', values: [20, 90, 40, 70] }] },
        },
      },
    ],
  ],
  [
    'Labels and text',
    () => [
      {
        title: 'Long category labels',
        expect: 'Labels thinned or kept apart, none cut at the edges.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: [
              'North America (excluding Mexico)',
              'Western and Central Europe',
              'Asia-Pacific and Oceania',
              'Latin America and the Caribbean',
              'Middle East and Africa',
            ],
            series: [{ name: 'Sales', values: [420, 380, 510, 160, 90] }],
          },
        },
      },
      {
        title: '200 categories',
        expect: 'Thinned labels, thin bars (or none), no overlap.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: range(200).map((i) => `Item ${i + 1}`),
            series: [{ name: 'A', values: walk(200, 50, 10, 0) }],
          },
        },
      },
      {
        title: '2000 categories on a line',
        expect: 'Fast, thinned ticks, a line that follows the data.',
        config: {
          type: line,
          ...base,
          data: {
            labels: range(2000).map((i) => `#${i}`),
            series: [{ name: 'A', values: walk(2000, 100, 6) }],
          },
        },
      },
      {
        title: 'Very long series names',
        expect: 'The legend wraps, the tooltip stays inside the chart.',
        config: {
          type: line,
          ...base,
          data: {
            labels: ['a', 'b', 'c', 'd'],
            series: [
              {
                name: 'Monthly recurring revenue from enterprise customers in the EMEA region',
                values: [3, 5, 4, 6],
              },
              {
                name: 'Monthly recurring revenue from self-serve customers worldwide',
                values: [2, 3, 5, 4],
              },
            ],
          },
        },
      },
      {
        title: '14 series (beyond the 8-color palette)',
        expect:
          'Colors repeat after 8 or use the "other" color; still distinguishable in the legend.',
        config: {
          type: line,
          ...base,
          data: {
            labels: MONTHS,
            series: range(14).map((i) => ({
              name: `Team ${i + 1}`,
              values: walk(12, 40 + i * 4, 6),
            })),
          },
        },
      },
      {
        title: 'Emoji and accents',
        expect: 'Labels render; width estimates may be off but nothing overlaps badly.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: ['🍎 Apples', '🍌 Bananas', '🥝 Kiwis', 'Crème brûlée', 'Żółć'],
            series: [{ name: '🛒 Sold', values: [40, 25, 12, 8, 30] }],
          },
        },
      },
      {
        title: 'Arabic labels and numbers',
        expect: 'ar-EG digits on the axis and in the tooltip; RTL labels readable.',
        config: {
          type: bar,
          locale: 'ar-EG',
          data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
            series: [{ name: 'المبيعات', values: [1200, 1850, 990, 2400] }],
          },
        },
      },
      {
        title: 'Right to left: grouped bars',
        expect:
          'rtl: true. Value axis on the right, months from the right, the first series on the right of each group.',
        config: {
          type: bar,
          locale: 'ar-EG',
          rtl: true,
          data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل'],
            series: [
              { name: 'المبيعات', values: [1200, 1850, 990, 2400] },
              { name: 'التكاليف', values: [800, 1100, 700, 1500] },
            ],
          },
        },
      },
      {
        title: 'Right to left: a line over time',
        expect:
          'rtl: true. Time runs from the right; the tooltip names the date under the pointer.',
        config: {
          type: line,
          locale: 'he-IL',
          rtl: true,
          x: { type: 'time', utc: true },
          data: {
            labels: range(60).map((i) => Date.UTC(2026, 0, 1 + i)),
            series: [{ name: 'מבקרים', values: walk(60, 400, 40) }],
          },
        },
      },
      {
        title: 'Right to left: horizontal bars',
        expect:
          'rtl: true. Names on the right, bars growing to the left (losses to the right), values beyond their ends.',
        config: {
          type: bar,
          locale: 'ar-EG',
          rtl: true,
          orientation: 'horizontal',
          valueLabels: true,
          data: {
            labels: ['القاهرة', 'الإسكندرية', 'الجيزة', 'أسوان'],
            series: [{ name: 'الربح', values: [420, 310, -120, 90] }],
          },
        },
      },
      {
        title: 'Right to left on a left-to-right page',
        expect:
          'rtl: true on this English page: the legend starts from the right, the download button sits in the left corner, the tooltip opens left of the pointer.',
        config: {
          type: line,
          locale: 'ar-EG',
          rtl: true,
          download: true,
          data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'],
            series: [
              { name: 'المبيعات', values: [1200, 1850, 990, 2400, 2100] },
              { name: 'التكاليف', values: [800, 1100, 700, 1500, 1350] },
            ],
          },
        },
      },
      {
        title: 'Right to left: scatter',
        expect: 'rtl: true. The value axis on the right, x growing to the left.',
        config: {
          type: scatter,
          locale: 'ar-EG',
          rtl: true,
          data: {
            series: [
              {
                name: 'المتاجر',
                points: range(24).map((i) => ({ x: 10 + i * 4, y: 20 + ((i * 37) % 60) })),
              },
            ],
          },
        },
      },
      {
        title: 'Right to left: heatmap',
        expect: 'rtl: true. Days named on the right, weeks from the right.',
        config: {
          type: heatmap,
          locale: 'ar-EG',
          rtl: true,
          data: {
            labels: range(8).map((i) => `${i + 1}`),
            series: ['الاثنين', 'الثلاثاء', 'الأربعاء'].map((name, row) => ({
              name,
              values: range(8).map((i) => (i * 7 + row * 11) % 23),
            })),
          },
        },
      },
      {
        title: 'Right to left: sankey',
        expect:
          'rtl: true. Sources on the right, flows running to the left, labels on the outer sides.',
        config: {
          type: sankey,
          locale: 'ar-EG',
          rtl: true,
          data: {
            links: [
              { from: 'الرواتب', to: 'الدخل', value: 60 },
              { from: 'الأرباح', to: 'الدخل', value: 20 },
              { from: 'الدخل', to: 'الإيجار', value: 30 },
              { from: 'الدخل', to: 'المدخرات', value: 50 },
            ],
          },
        },
      },
      {
        title: 'Right to left: sparkline',
        expect: 'rtl: true. The latest value (the highest) on the left.',
        config: {
          type: sparkline,
          rtl: true,
          aspectRatio: 6,
          data: [3, 4, 3, 5, 6, 5, 8, 9, 12],
        },
      },
      {
        title: 'Right to left: percentage bar',
        expect:
          'rtl: true. The bar starts from the right: the first (largest) segment is on the right.',
        config: {
          type: percentageBar,
          locale: 'ar-EG',
          rtl: true,
          data: [
            { name: 'مدفوعة', value: 50 },
            { name: 'مفتوحة', value: 30 },
            { name: 'مسودة', value: 15 },
            { name: 'متأخرة', value: 5 },
          ],
        },
      },
      {
        title: 'Chinese labels',
        expect: 'Wide glyphs: labels thinned so they do not overlap.',
        config: {
          type: line,
          locale: 'zh-CN',
          data: {
            labels: [
              '一月',
              '二月',
              '三月',
              '四月',
              '五月',
              '六月',
              '七月',
              '八月',
              '九月',
              '十月',
              '十一月',
              '十二月',
            ],
            series: [{ name: '收入', values: walk(12, 100, 20, 0) }],
          },
        },
      },
      {
        title: 'Markup in names',
        expect: 'Shown as text, never as HTML: <b>, &amp; and "quotes" literally.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: ['<b>bold</b>', 'Tom & Jerry', '"quoted"', "it's"],
            series: [{ name: '<script>alert(1)</script>', values: [3, 5, 2, 4] }],
          },
        },
      },
      {
        title: 'Duplicate category labels',
        expect: 'Each bar its own; keys may collide, but the chart renders all four.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: ['Mon', 'Tue', 'Mon', 'Tue'],
            series: [{ name: 'A', values: [1, 2, 3, 4] }],
          },
        },
      },
      {
        title: 'Numeric labels',
        expect: 'Years as categories, not summed or formatted as 2,020.',
        config: {
          type: line,
          ...base,
          data: {
            labels: [2020, 2021, 2022, 2023, 2024],
            series: [{ name: 'A', values: [3, 4, 2, 5, 6] }],
          },
        },
      },
      {
        title: 'Series with empty names',
        expect: 'Still drawn and keyed apart; the legend shows empty entries.',
        config: {
          type: line,
          ...base,
          data: {
            labels: ['a', 'b', 'c'],
            series: [
              { name: '', values: [1, 2, 3] },
              { name: '', id: 'second', values: [3, 2, 1] },
            ],
          },
        },
      },
    ],
  ],
  [
    'Time axes',
    () => [
      {
        title: 'Irregular intervals',
        expect: 'Points at their real distance in time, not evenly spaced.',
        config: {
          type: line,
          ...base,
          points: 'all',
          x: { type: 'time', utc: true },
          data: {
            labels: [0, 1, 2, 10, 11, 30, 31, 32, 90].map((d) => Date.UTC(2026, 0, 1) + d * DAY),
            series: [{ name: 'A', values: [3, 4, 3, 8, 7, 2, 3, 2, 9] }],
          },
        },
      },
      {
        title: 'Minutes across midnight',
        expect: 'Time ticks (23:00, 00:00 …) with the date where the day changes.',
        config: {
          type: area,
          ...base,
          x: { type: 'time', utc: true },
          data: {
            labels: range(240).map((i) => Date.UTC(2026, 4, 1, 22) + i * 60_000),
            series: [{ name: 'Requests', values: walk(240, 50, 8, 0) }],
          },
        },
      },
      {
        title: 'Ten years of months',
        expect: 'Year ticks, not 120 month labels.',
        config: {
          type: line,
          ...base,
          x: { type: 'time', utc: true },
          data: {
            labels: range(120).map((i) => Date.UTC(2016, i, 1)),
            series: [{ name: 'Price index', values: walk(120, 100, 3) }],
          },
        },
      },
      {
        title: 'A single date',
        expect: 'One point and one tick, no NaN.',
        config: {
          type: line,
          ...base,
          points: 'all',
          x: { type: 'time', utc: true },
          data: { labels: [Date.UTC(2026, 5, 15)], series: [{ name: 'A', values: [4] }] },
        },
      },
      {
        title: 'ISO date strings',
        expect: 'Parsed like timestamps.',
        config: {
          type: line,
          ...base,
          x: { type: 'time', utc: true },
          data: {
            labels: ['2026-03-01', '2026-03-08', '2026-03-15', '2026-03-22', '2026-03-29'],
            series: [{ name: 'A', values: [5, 7, 6, 9, 8] }],
          },
        },
      },
      {
        title: 'Unparseable dates on a time axis',
        expect: 'Falls back to categories instead of NaN positions.',
        config: {
          type: line,
          ...base,
          x: { type: 'time' },
          data: { labels: ['soon', 'later', 'never'], series: [{ name: 'A', values: [1, 2, 3] }] },
        },
      },
      {
        title: 'Daylight saving change, local time',
        expect: 'Hourly ticks around the March change in Europe/Warsaw-like local time.',
        config: {
          type: line,
          ...base,
          x: { type: 'time' },
          data: {
            labels: range(48).map((i) => new Date(2026, 2, 28, 12 + i).getTime()),
            series: [{ name: 'Load', values: walk(48, 20, 4, 0) }],
          },
        },
      },
    ],
  ],
  [
    'Sizes',
    () => [
      {
        title: 'Tiny, 140 × 70',
        expect: 'Fewer ticks, no labels on top of each other, nothing outside.',
        box: { width: '140px' },
        config: {
          type: line,
          ...base,
          aspectRatio: 2,
          data: { labels: MONTHS, series: [{ name: 'A', values: walk(12, 50, 10) }] },
        },
      },
      {
        title: 'Narrow bars, 180 px',
        expect: 'Bars still separated by a gap.',
        box: { width: '180px' },
        config: {
          type: bar,
          ...base,
          data: {
            labels: MONTHS,
            series: [
              { name: 'A', values: walk(12, 50, 10, 0) },
              { name: 'B', values: walk(12, 40, 10, 0) },
            ],
          },
        },
      },
      {
        title: 'Very wide, aspect ratio 8',
        expect: 'A strip chart: few y ticks, all x labels.',
        config: {
          type: area,
          ...base,
          aspectRatio: 8,
          data: { labels: MONTHS, series: [{ name: 'A', values: walk(12, 50, 10, 0) }] },
        },
      },
      {
        title: 'Tall, aspect ratio 0.6',
        expect: 'Many y ticks, readable.',
        box: { width: '220px' },
        config: {
          type: bar,
          ...base,
          aspectRatio: 0.6,
          data: { labels: ['a', 'b', 'c'], series: [{ name: 'A', values: [3, 8, 5] }] },
        },
      },
      {
        title: 'Tiny pie, 80 px',
        expect: 'A small pie with its legend wrapping.',
        box: { width: '80px' },
        config: {
          type: donut,
          ...base,
          aspectRatio: 1,
          data: [
            { name: 'A', value: 3 },
            { name: 'B', value: 2 },
            { name: 'C', value: 1 },
          ],
        },
      },
      {
        title: 'Container height',
        expect: 'height: "container" fills the 220 px box, legend included.',
        box: { height: '220px' },
        config: {
          type: line,
          ...base,
          height: 'container',
          data: {
            labels: MONTHS,
            series: [
              { name: 'A', values: walk(12, 50, 10) },
              { name: 'B', values: walk(12, 40, 10) },
            ],
          },
        },
      },
    ],
  ],
  [
    'Options together',
    () => [
      {
        title: 'Annotations outside the data',
        expect: 'A target above every value widens the axis; overlapping labels step aside.',
        config: {
          type: line,
          ...base,
          annotations: [
            { y: 120, label: 'Target' },
            { y: 118, label: 'Stretch target' },
            { y: [20, 30], label: 'Normal range' },
            { x: 'Mar', label: 'Launch' },
            { x: 'Mar', label: 'Also launch' },
          ],
          data: { labels: MONTHS, series: [{ name: 'A', values: walk(12, 60, 15, 0) }] },
        },
      },
      {
        title: 'Ten grouped series',
        expect: 'Thin bars per group, still a gap between groups.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            series: range(10).map((i) => ({
              name: `S${i + 1}`,
              values: range(4).map(() => Math.round(rnd() * 50)),
            })),
          },
        },
      },
      {
        title: 'Legend at the bottom with many entries',
        expect: 'The legend wraps below the chart.',
        config: {
          type: area,
          ...base,
          stacked: true,
          legend: { position: 'bottom' },
          data: {
            labels: MONTHS,
            series: range(9).map((i) => ({ name: `Channel ${i + 1}`, values: walk(12, 10, 3, 0) })),
          },
        },
      },
      {
        title: 'Visible table, 100 rows',
        expect: 'A scrollable table below the chart.',
        config: {
          type: line,
          ...base,
          table: 'visible',
          data: {
            labels: range(100).map((i) => `Row ${i + 1}`),
            series: [{ name: 'A', values: walk(100, 10, 3) }],
          },
        },
      },
      {
        title: 'German currency',
        expect: '1.234,50 € style ticks and tooltip.',
        config: {
          type: bar,
          locale: 'de-DE',
          y: { format: { style: 'currency', currency: 'EUR' } },
          data: {
            labels: ['Jan', 'Feb', 'Mär'],
            series: [{ name: 'Umsatz', values: [1234.5, 2045.1, 1780] }],
          },
        },
      },
      {
        title: 'Everything off',
        expect: 'No axes, grid, legend, tooltip or table: only the marks.',
        config: {
          type: line,
          ...base,
          legend: false,
          tooltip: false,
          table: false,
          keyboard: false,
          x: { show: false },
          y: { show: false, grid: false },
          data: {
            labels: MONTHS,
            series: [
              { name: 'A', values: walk(12, 50, 10) },
              { name: 'B', values: walk(12, 40, 10) },
            ],
          },
        },
      },
      {
        title: 'Colors from user data',
        expect:
          'A color that tries to inject CSS is ignored: the palette color, nothing over the page.',
        config: {
          type: bar,
          ...base,
          data: {
            labels: ['a', 'b', 'c'],
            series: [
              {
                name: 'Hostile',
                color: 'red;position:fixed;inset:0;z-index:9999;background:url(/injected.png)',
                values: [3, 5, 4],
              },
              { name: 'Fine', color: 'var(--tc-color-6)', values: [2, 3, 5] },
            ],
          },
        },
      },
      {
        title: 'Hidden series only',
        expect:
          'Every series hidden from the start: an empty plot and a legend to bring them back.',
        config: {
          type: line,
          ...base,
          data: {
            labels: ['a', 'b', 'c'],
            series: [
              { name: 'A', hidden: true, values: [1, 2, 3] },
              { name: 'B', hidden: true, values: [3, 2, 1] },
            ],
          },
        },
      },
    ],
  ],
]

// -- Rendering ----------------------------------------------------------------

setupThemeSwitch()
const root = document.getElementById('cases') as HTMLElement
let index = 0
for (const [name, build] of groups) {
  const heading = document.createElement('h2')
  heading.className = 'case-group'
  heading.textContent = name
  const grid = document.createElement('div')
  grid.className = 'gallery'
  root.append(heading, grid)
  reseed(name)
  for (const item of build()) {
    const card = document.createElement('figure')
    card.className = 'gallery-item'
    card.dataset.case = String(index++)
    card.dataset.title = item.title
    const caption = document.createElement('figcaption')
    const strong = document.createElement('strong')
    strong.textContent = item.title
    caption.append(strong, ` ${item.expect}`)
    const host = document.createElement('div')
    if (item.box?.width) host.style.width = item.box.width
    if (item.box?.height) host.style.height = item.box.height
    card.append(caption, host)
    grid.append(card)
    try {
      new Chart(host, { title: item.title, ...item.config } as ChartConfig<object>)
    } catch (error) {
      // A thrown error is a finding too: show it on the card.
      const box = document.createElement('pre')
      box.className = 'case-error'
      box.textContent = String((error as Error).stack ?? error)
      host.replaceChildren(box)
      card.dataset.error = String((error as Error).message ?? error)
    }
  }
}
for (const link of document.querySelectorAll('.site-nav a')) {
  if (link.getAttribute('href') === '/cases.html') link.setAttribute('aria-current', 'page')
}
