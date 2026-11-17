import { area, bar, candlestick, type Label, line } from '@tabler/charts'
import { C, common, type Group, MONTHS, span, years } from './types.ts'

const usd = { style: 'currency', currency: 'USD' } as const
const pct =
  (digits = 1) =>
  (v: number) =>
    `${v.toFixed(digits)}%`

const SP500 = [
  3.0, 13.6, 3.5, -38.5, 23.5, 12.8, 0.0, 13.4, 29.6, 11.4, -0.7, 9.5, 19.4, -6.2, 28.9, 16.3, 26.9,
  -19.4, 24.2, 23.3,
]
const GOLD = [
  279, 271, 310, 363, 410, 445, 603, 695, 872, 972, 1225, 1572, 1669, 1411, 1266, 1160, 1251, 1257,
  1269, 1393, 1770, 1799, 1801, 1941, 2386,
]
const BRENT = [
  28.5, 24.4, 25.0, 28.8, 38.3, 54.5, 65.1, 72.4, 97.3, 61.7, 79.5, 111.3, 111.6, 108.6, 99.0, 52.4,
  43.7, 54.2, 71.3, 64.3, 41.8, 70.9, 100.9, 82.5, 80.5,
]
const BITCOIN = [754, 320, 430, 963, 14156, 3742, 7193, 29001, 46306, 16547, 42265, 93429]
const EURUSD: [number, number, number, number][] = [
  [1.104, 1.105, 1.079, 1.085],
  [1.085, 1.089, 1.069, 1.08],
  [1.08, 1.098, 1.078, 1.079],
  [1.079, 1.088, 1.06, 1.067],
  [1.067, 1.09, 1.065, 1.085],
  [1.085, 1.091, 1.067, 1.071],
  [1.071, 1.094, 1.07, 1.083],
  [1.083, 1.12, 1.079, 1.105],
  [1.105, 1.12, 1.101, 1.113],
  [1.113, 1.117, 1.076, 1.088],
  [1.088, 1.098, 1.033, 1.058],
  [1.058, 1.063, 1.035, 1.035],
]

export const economy: Group = {
  id: 'economy',
  name: 'Economy & finance',
  description:
    'Markets, prices and public finances: currency and percent axes, log scales, candlesticks, target lines.',
  items: [
    {
      title: 'Largest economies',
      note: 'Nominal GDP, horizontal bars sorted by value, compact currency ticks.',
      source: 'IMF World Economic Outlook, 2023',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'United States',
            'China',
            'Germany',
            'Japan',
            'India',
            'United Kingdom',
            'France',
            'Italy',
            'Brazil',
            'Canada',
          ],
          series: [
            {
              name: 'GDP',
              values: [
                27.4e12, 17.8e12, 4.5e12, 4.2e12, 3.6e12, 3.4e12, 3.0e12, 2.3e12, 2.2e12, 2.1e12,
              ],
            },
          ],
        },
        y: { format: { ...usd, notation: 'compact' } },
        x: { grid: true },
      },
    },
    {
      title: 'US inflation',
      note: 'Annual CPI change with the 2% target as an annotation line; one year below zero.',
      source: 'US Bureau of Labor Statistics, 2000–2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: span(2000, 2024).map(String),
          series: [
            {
              name: 'CPI, year over year',
              values: [
                3.4, 2.8, 1.6, 2.3, 2.7, 3.4, 3.2, 2.9, 3.8, -0.4, 1.6, 3.2, 2.1, 1.5, 1.6, 0.1,
                1.3, 2.1, 2.4, 1.8, 1.2, 4.7, 8.0, 4.1, 2.9,
              ],
            },
          ],
        },
        curve: 'linear',
        points: 'all',
        pointRadius: 2.5,
        y: { format: pct(), zero: true },
        x: { format: (l: Label, i: number) => (i % 4 === 0 ? String(l) : '') },
        annotations: [{ y: 2, label: '2% target', color: C.green }],
      },
    },
    {
      title: 'Fed funds rate',
      note: 'Year-end upper bound of the target range; a step curve, because a policy rate changes in jumps.',
      source: 'Federal Reserve, 2000–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: years(span(2000, 2024)),
          series: [
            {
              name: 'Target rate',
              values: [
                6.5, 1.75, 1.25, 1.0, 2.25, 4.25, 5.25, 4.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25,
                0.25, 0.5, 0.75, 1.5, 2.5, 1.75, 0.25, 0.25, 4.5, 5.5, 4.5,
              ],
            },
          ],
        },
        x: { type: 'time', utc: true },
        curve: 'step-after',
        fill: 'solid',
        y: { format: pct(2) },
        annotations: [
          { x: [Date.UTC(2008, 8, 1), Date.UTC(2009, 5, 1)], label: 'Financial crisis' },
          { x: [Date.UTC(2020, 2, 1), Date.UTC(2021, 11, 1)], label: 'Pandemic' },
        ],
      },
    },
    {
      title: 'S&P 500 annual returns',
      note: 'Price return per calendar year: losses grow down from the zero line.',
      source: 'S&P Dow Jones Indices, 2005–2024',
      config: {
        type: bar,
        ...common,
        data: {
          labels: span(2005, 2024).map(String),
          series: [{ name: 'Return', values: SP500 }],
        },
        radius: 2,
        y: { format: pct(0) },
        x: { format: (l: Label, i: number) => (i % 2 === 0 ? String(l) : '') },
      },
    },
    {
      title: 'Gold price',
      note: 'Yearly average per troy ounce; a gradient area on a time axis.',
      source: 'World Gold Council / LBMA, 2000–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: years(span(2000, 2024)),
          series: [{ name: 'Gold, USD/oz', values: GOLD }],
        },
        x: { type: 'time', utc: true },
        y: { format: { ...usd, maximumFractionDigits: 0 } },
      },
      style: { '--tc-color-1': C.yellow },
    },
    {
      title: 'EUR/USD, monthly candles',
      note: 'Twelve monthly candlesticks with four-decimal ticks: an exchange rate moves in the third digit.',
      source: 'ECB reference rates, 2024',
      span: 2,
      config: {
        type: candlestick,
        ...common,
        aspectRatio: 2.6,
        data: EURUSD.map(([open, high, low, close], i) => ({
          x: Date.UTC(2024, i, 1),
          open,
          high,
          low,
          close,
        })),
        x: { type: 'time', utc: true },
        y: { format: { minimumFractionDigits: 3, maximumFractionDigits: 3 } },
        maxCandleWidth: 22,
      },
    },
    {
      title: 'Bitcoin, year-end price',
      note: 'A log scale keeps $300 and $90,000 on one readable axis.',
      source: 'CoinMarketCap, 31 December 2013–2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: span(2013, 2024).map(String),
          series: [{ name: 'BTC/USD', values: BITCOIN }],
        },
        points: 'all',
        y: { scale: 'log', format: { ...usd, notation: 'compact' } },
      },
      style: { '--tc-color-1': C.orange },
    },
    {
      title: 'Brent crude',
      note: 'Yearly average spot price; bands mark the 2008 spike and the 2020 collapse.',
      source: 'US EIA, 2000–2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: years(span(2000, 2024)),
          series: [{ name: 'Brent, USD/bbl', values: BRENT }],
        },
        x: { type: 'time', utc: true },
        area: true,
        y: { format: { ...usd, maximumFractionDigits: 0 }, zero: true },
        annotations: [
          { x: [Date.UTC(2011, 0, 1), Date.UTC(2014, 6, 1)], label: '$100+ plateau' },
          { y: 100, position: 'start' },
        ],
      },
    },
    {
      title: 'Public debt to GDP',
      note: 'General government gross debt as a share of GDP; a 100% line marks "owes a year of output".',
      source: 'IMF Fiscal Monitor, 2023',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Japan',
            'Greece',
            'Italy',
            'United States',
            'France',
            'Spain',
            'Canada',
            'United Kingdom',
            'Germany',
            'Poland',
          ],
          series: [
            { name: 'Debt / GDP', values: [252, 162, 137, 122, 110, 108, 107, 101, 64, 50] },
          ],
        },
        y: { format: pct(0) },
        annotations: [{ y: 100, label: '100%', color: C.red }],
      },
    },
    {
      title: 'Unemployment rate',
      note: 'Three economies on one percent axis; the pandemic spike in the US stands out.',
      source: 'OECD, annual averages 2010–2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: span(2010, 2024).map(String),
          series: [
            {
              name: 'Spain',
              values: [
                19.9, 21.4, 24.8, 26.1, 24.4, 22.1, 19.6, 17.2, 15.3, 14.1, 15.5, 14.8, 12.9, 12.1,
                11.4,
              ],
            },
            {
              name: 'United States',
              values: [9.6, 8.9, 8.1, 7.4, 6.2, 5.3, 4.9, 4.4, 3.9, 3.7, 8.1, 5.3, 3.6, 3.6, 4.0],
            },
            {
              name: 'Germany',
              values: [7.0, 5.8, 5.4, 5.2, 5.0, 4.6, 4.1, 3.8, 3.4, 3.1, 3.7, 3.6, 3.1, 3.0, 3.4],
            },
            {
              name: 'Poland',
              values: [9.7, 9.7, 10.1, 10.3, 9.0, 7.5, 6.2, 4.9, 3.9, 3.3, 3.2, 3.4, 2.9, 2.8, 2.9],
            },
          ],
        },
        curve: 'linear',
        y: { format: pct(0), zero: true },
      },
    },
    {
      title: 'Monthly inflation, euro area vs. Poland',
      note: 'Twelve months of HICP in two countries, one with much higher readings: grouped bars.',
      source: 'Eurostat, 2023',
      config: {
        type: bar,
        ...common,
        data: {
          labels: MONTHS,
          series: [
            {
              name: 'Euro area',
              values: [8.6, 8.5, 6.9, 7.0, 6.1, 5.5, 5.3, 5.2, 4.3, 2.9, 2.4, 2.9],
            },
            {
              name: 'Poland',
              values: [15.9, 17.2, 15.2, 14.0, 12.5, 11.0, 10.3, 9.5, 7.7, 6.3, 6.3, 6.2],
            },
          ],
        },
        y: { format: pct(0) },
      },
    },
    {
      kind: 'tiles',
      title: 'Markets at a glance',
      note: 'Stat tiles with sparklines: the same series as the charts above, 20 to 25 points each, in 36 pixels.',
      source: 'As the charts above, 2000–2024',
      tiles: [
        {
          name: 'S&P 500, yearly return',
          value: '+23.3%',
          config: { data: SP500, variant: 'bar', labels: span(2005, 2024) },
        },
        {
          name: 'Gold, USD/oz',
          value: '$2,386',
          config: { data: GOLD, variant: 'area', labels: span(2000, 2024), format: usd },
        },
        {
          name: 'Brent, USD/bbl',
          value: '$80.5',
          config: { data: BRENT, variant: 'line', markers: 'minmax', labels: span(2000, 2024) },
        },
        {
          name: 'Bitcoin, USD',
          value: '$93.4K',
          config: {
            data: BITCOIN,
            variant: 'line',
            curve: 'linear',
            labels: span(2013, 2024),
            format: usd,
          },
        },
        {
          name: 'EUR/USD, monthly close',
          value: '1.035',
          config: {
            data: EURUSD.map((c) => c[3]),
            variant: 'line',
            labels: MONTHS,
            format: { minimumFractionDigits: 3 },
          },
        },
      ],
    },
  ],
}
