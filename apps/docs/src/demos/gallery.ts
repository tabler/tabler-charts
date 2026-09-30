import {
  area,
  bar,
  Chart,
  type ChartConfig,
  type ChartType,
  candlestick,
  donut,
  gauge,
  type Hit,
  h,
  heatmap,
  type Label,
  line,
  pie,
  scatter,
  sparkline,
} from '@tabler/charts'

/** A config for any chart type; cast to `ChartConfig` where it is used. */
type AnyConfig = { type: ChartType<never> } & Record<string, unknown>

import type { Demo } from '../demo.ts'

/** A gallery entry: a config plus how to present it. */
interface Item {
  title: string
  note: string
  config: AnyConfig
  /** Extra classes on the card (e.g. a theme override). */
  class?: string
  /** Inline CSS variables on the chart container. */
  style?: Record<string, string>
  /** Card width: 1 (default) or 2 columns. */
  span?: 1 | 2
}

// Deterministic data, so the gallery looks the same on every load.
let seed = 7
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const walk = (n: number, start: number, drift: number, min = 0) => {
  let v = start
  return Array.from({ length: n }, () => {
    v = Math.max(min, v + (rnd() - 0.45) * drift)
    return Math.round(v * 100) / 100
  })
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const DAY = 86_400_000
const days = (n: number, from = Date.UTC(2026, 6, 1)) =>
  Array.from({ length: n }, (_, i) => from + i * DAY)

const common = { locale: 'en-US', aspectRatio: 1.9 } as const

const ITEMS: Item[] = [
  {
    title: 'Revenue vs. costs',
    note: 'Two series, currency axis, last-value dots.',
    config: {
      type: line,
      ...common,
      data: {
        labels: MONTHS,
        series: [
          { name: 'Revenue', values: walk(12, 42000, 9000) },
          { name: 'Costs', values: walk(12, 31000, 5000) },
        ],
      },
      points: 'last',
      y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
    },
  },
  {
    title: 'This week vs. last',
    note: 'The comparison series is dashed and thinner (series.dash / series.width), y.max fixed.',
    config: {
      type: line,
      ...common,
      data: {
        labels: WEEKDAYS,
        series: [
          { name: 'This week', values: walk(7, 2100, 700, 800), width: 2.5 },
          { name: 'Last week', values: walk(7, 1700, 700, 800), dash: 4, width: 1.5 },
        ],
      },
      curve: 'monotone',
      points: 'none',
      y: { max: 3000, format: { notation: 'compact' } },
    },
  },
  {
    title: 'Temperature',
    note: 'Negative values, linear curve, every point marked, °C format.',
    config: {
      type: line,
      ...common,
      data: {
        labels: MONTHS,
        series: [
          {
            name: 'Warsaw',
            values: [-3.2, -1.8, 2.4, 8.9, 14.2, 17.5, 19.6, 18.8, 13.7, 8.4, 3.1, -1.4],
          },
        ],
      },
      curve: 'linear',
      points: 'all',
      y: { format: (v: number) => `${v}°`, zero: true },
    },
  },
  {
    title: 'Missing data',
    note: 'Gaps where the sensor was offline; step curve.',
    config: {
      type: line,
      ...common,
      data: {
        labels: days(30),
        series: [
          {
            name: 'Uptime %',
            values: walk(30, 99, 1.5).map((v, i) => (i > 9 && i < 14 ? null : Math.min(100, v))),
          },
        ],
      },
      x: { type: 'time', utc: true },
      curve: 'step',
      y: { min: 90, max: 100, format: (v: number) => `${v}%` },
      tooltip: { format: (hit: Hit) => `${hit.title}: ${hit.items[0]?.text ?? '–'}` },
    },
  },
  {
    title: 'Exponential growth',
    note: 'Log scale keeps early values readable.',
    config: {
      type: line,
      ...common,
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `M${i + 1}`),
        series: [
          {
            name: 'Users',
            values: Array.from({ length: 24 }, (_, i) => Math.round(120 * 1.32 ** i)),
          },
        ],
      },
      y: { scale: 'log', format: { notation: 'compact' } },
      x: { format: (l: Label, i: number) => (i % 6 === 0 ? String(l) : '') },
    },
  },
  {
    title: 'Nine series',
    note: 'Eight palette slots, then the neutral "other" color; legend at the bottom.',
    config: {
      type: line,
      ...common,
      data: {
        labels: WEEKDAYS,
        series: Array.from({ length: 9 }, (_, i) => ({
          name: `Team ${i + 1}`,
          values: walk(7, 40 + i * 6, 12),
        })),
      },
      curve: 'linear',
      legend: { position: 'bottom' },
    },
    span: 2,
  },
  {
    title: 'Stacked areas',
    note: 'Traffic by channel, solid fills, percent axis format off.',
    config: {
      type: area,
      ...common,
      data: {
        labels: days(21),
        series: [
          { name: 'Organic', values: walk(21, 1200, 300) },
          { name: 'Paid', values: walk(21, 600, 200) },
          { name: 'Social', values: walk(21, 300, 120) },
          { name: 'Email', values: walk(21, 150, 60) },
        ],
      },
      x: { type: 'time', utc: true },
      stacked: true,
      y: { format: { notation: 'compact' } },
    },
  },
  {
    title: '100% stacked',
    note: 'Market share per quarter, percent axis.',
    config: {
      type: area,
      ...common,
      data: {
        labels: [
          '2023 Q1',
          'Q2',
          'Q3',
          'Q4',
          '2024 Q1',
          'Q2',
          'Q3',
          'Q4',
          '2025 Q1',
          'Q2',
          'Q3',
          'Q4',
        ],
        series: [
          { name: 'Chrome', values: walk(12, 64, 3) },
          { name: 'Safari', values: walk(12, 19, 2) },
          { name: 'Edge', values: walk(12, 5, 1) },
          { name: 'Firefox', values: walk(12, 3, 1) },
        ],
      },
      stacked: 'percent',
      curve: 'linear',
    },
  },
  {
    title: 'Single series area',
    note: 'No legend for one series; gradient fill; dots on every point.',
    config: {
      type: area,
      ...common,
      data: {
        labels: WEEKDAYS,
        series: [{ name: 'Sign-ups', values: [42, 61, 55, 78, 90, 34, 28] }],
      },
      points: 'all',
      y: { zero: true },
    },
  },
  {
    title: 'Grouped bars',
    note: 'Three years side by side, compact currency.',
    config: {
      type: bar,
      ...common,
      data: {
        labels: QUARTERS,
        series: [
          { name: '2024', values: [1.2e6, 1.4e6, 1.1e6, 1.9e6] },
          { name: '2025', values: [1.5e6, 1.7e6, 1.6e6, 2.3e6] },
          { name: '2026', values: [1.8e6, 2.1e6, null, null] },
        ],
      },
      y: { format: { style: 'currency', currency: 'EUR', notation: 'compact' } },
      locale: 'de-DE',
    },
  },
  {
    title: 'Spend and leads',
    note: 'Two bar series with two line series on the same axis (series.type).',
    config: {
      type: bar,
      ...common,
      data: {
        labels: MONTHS.slice(0, 6),
        series: [
          { name: 'Paid spend', values: walk(6, 40, 20, 10) },
          { name: 'Content spend', values: walk(6, 25, 15, 5) },
          { name: 'Leads', values: walk(6, 60, 30, 20), type: 'line' },
          { name: 'Trials', values: walk(6, 30, 20, 5), type: 'line', dash: 4 },
        ],
      },
    },
  },
  {
    title: 'Mentions',
    note: 'Stacked bars with a total line over them; the line is not part of the stack.',
    config: {
      type: bar,
      ...common,
      data: {
        labels: WEEKDAYS,
        series: [
          { name: 'Web', values: walk(7, 30, 20, 5) },
          { name: 'Social', values: walk(7, 20, 15, 5) },
          { name: 'Other', values: walk(7, 10, 8, 2) },
          { name: 'Target', values: walk(7, 70, 10, 50), type: 'line', dash: 4, width: 1.5 },
        ],
      },
      stacked: true,
    },
  },
  {
    title: 'Profit and loss',
    note: 'Negative bars grow down, square corners, thin bars.',
    config: {
      type: bar,
      ...common,
      data: {
        labels: MONTHS,
        series: [{ name: 'Net', values: [12, 18, -6, 9, -14, 22, 30, 27, -3, 15, 21, 34] }],
      },
      radius: 0,
      maxBarWidth: 14,
      y: { format: { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 } },
      locale: 'pl-PL',
    },
  },
  {
    title: 'Horizontal ranking',
    note: 'Long category labels on the left, sorted values.',
    config: {
      type: bar,
      ...common,
      aspectRatio: 1.4,
      data: {
        labels: [
          'United States',
          'Germany',
          'United Kingdom',
          'France',
          'Netherlands',
          'Poland',
          'Spain',
        ],
        series: [{ name: 'Sessions', values: [48200, 21900, 19400, 12800, 9300, 8700, 6100] }],
      },
      orientation: 'horizontal',
      y: { format: { notation: 'compact' } },
      x: { grid: true },
    },
  },
  {
    title: 'Stacked horizontal',
    note: 'Survey answers per question, 100% stacked, custom colors.',
    config: {
      type: bar,
      ...common,
      aspectRatio: 1.6,
      data: {
        labels: ['Ease of use', 'Performance', 'Design', 'Docs', 'Support'],
        series: [
          { name: 'Great', values: [62, 48, 71, 39, 55], color: '#2fb344' },
          { name: 'Okay', values: [28, 37, 21, 42, 30], color: '#f59f00' },
          { name: 'Poor', values: [10, 15, 8, 19, 15], color: '#d63939' },
        ],
      },
      orientation: 'horizontal',
      stacked: 'percent',
      maxBarWidth: 18,
    },
  },
  {
    title: 'Sales by region',
    note: 'Donut with a custom center label and a hidden slice.',
    config: {
      type: donut,
      ...common,
      aspectRatio: 1.6,
      data: [
        { name: 'EMEA', value: 4200 },
        { name: 'Americas', value: 3900 },
        { name: 'APAC', value: 2100 },
        { name: 'LATAM', value: 800 },
        { name: 'Internal', value: 300, hidden: true },
      ],
      center: { value: '11.0K', label: 'orders' },
      format: { notation: 'compact' },
    },
  },
  {
    title: 'Crypto price',
    note: 'Candlestick with a time axis and compact currency, like the crypto dashboard card.',
    config: {
      type: candlestick,
      ...common,
      data: (() => {
        let price = 95_000
        return Array.from({ length: 23 }, (_, i) => {
          const open = price
          const close = open + (rnd() - 0.47) * 6000
          price = close
          return {
            x: Date.UTC(2025, i, 1),
            open,
            high: Math.max(open, close) + rnd() * 3000,
            low: Math.min(open, close) - rnd() * 3000,
            close,
          }
        })
      })(),
      x: { type: 'time', utc: true },
      y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
    },
    span: 2,
  },
  {
    title: 'Weekly activity',
    note: 'A contribution-style heatmap: days by weeks, green, a missing week.',
    config: {
      type: heatmap,
      ...common,
      data: {
        labels: Array.from({ length: 10 }, (_, i) => `W${i + 1}`),
        series: WEEKDAYS.map((name, d) => ({
          name,
          values: Array.from({ length: 10 }, (_, w) =>
            w === 6 ? null : Math.round(rnd() * (d < 5 ? 10 : 4)),
          ),
        })),
      },
    },
    style: { '--tc-heat-color': '#2fb344' },
  },
  {
    title: 'Response times',
    note: 'Heatmap with a fixed range (min 0, max 800 ms) and no gap.',
    config: {
      type: heatmap,
      ...common,
      data: {
        labels: ['00', '04', '08', '12', '16', '20'],
        series: ['EU', 'US', 'APAC'].map((name) => ({
          name,
          values: Array.from({ length: 6 }, () => Math.round(100 + rnd() * 700)),
        })),
      },
      min: 0,
      max: 800,
      gap: 0,
      radius: 0,
      format: { style: 'unit', unit: 'millisecond' },
    },
    style: { '--tc-heat-color': '#d63939' },
  },
  {
    title: 'Gauge',
    note: 'A single value with its share and name in the middle; round caps by default.',
    config: {
      type: gauge,
      ...common,
      aspectRatio: 1.6,
      data: { name: 'delivered', value: 48210, max: 50219 },
      format: { notation: 'compact' },
    },
    style: { '--tc-color-1': '#2fb344' },
  },
  {
    title: 'Dial',
    note: 'startAngle -135 and angle 270 leave the bottom open, like a speedometer.',
    config: {
      type: gauge,
      ...common,
      aspectRatio: 1.6,
      data: { name: 'used', value: 410, max: 500 },
      startAngle: -135,
      angle: 270,
      thickness: 16,
      center: { value: '410 GB', label: 'of 500 GB' },
    },
    style: { '--tc-color-1': '#f59f00' },
  },
  {
    title: 'Nested rings',
    note: 'Three campaigns as concentric rings; the legend toggles each one.',
    config: {
      type: gauge,
      ...common,
      aspectRatio: 1.6,
      data: [
        { name: 'Email', value: 76 },
        { name: 'Social', value: 54 },
        { name: 'Ads', value: 31 },
      ],
      thickness: 10,
      center: false,
    },
  },
  {
    title: 'Thin ring',
    note: 'innerRadius 0.85, no gap, no rounded corners, single value vs. rest.',
    config: {
      type: donut,
      ...common,
      aspectRatio: 1.6,
      data: [
        { name: 'Used', value: 73, color: '#066fd1' },
        { name: 'Free', value: 27, color: '#e6e7e9' },
      ],
      innerRadius: 0.85,
      gap: 0,
      cornerRadius: 0,
      center: { value: '73%', label: 'disk used' },
      legend: false,
    },
  },
  {
    title: 'Pie, many slices',
    note: 'Eight slices with a 3px gap, starting at 90°.',
    config: {
      type: pie,
      ...common,
      aspectRatio: 1.6,
      data: ['Direct', 'Search', 'Social', 'Referral', 'Email', 'Ads', 'Affiliates', 'Other'].map(
        (name, i) => ({
          name,
          value: Math.round(900 / (i + 1)),
        }),
      ),
      gap: 3,
      startAngle: 90,
    },
  },
  {
    title: 'Bubbles',
    note: 'GDP vs. life expectancy, area-proportional bubbles, log x.',
    config: {
      type: scatter,
      ...common,
      data: {
        series: [
          {
            name: 'Europe',
            points: [
              { x: 52000, y: 83.2, size: 84, label: 'Germany' },
              { x: 45000, y: 82.5, size: 68, label: 'France' },
              { x: 38000, y: 78.4, size: 38, label: 'Poland' },
              { x: 33000, y: 83.6, size: 47, label: 'Spain' },
            ],
          },
          {
            name: 'Asia',
            points: [
              { x: 34000, y: 84.8, size: 125, label: 'Japan' },
              { x: 12500, y: 78.2, size: 1412, label: 'China' },
              { x: 2400, y: 70.8, size: 1420, label: 'India' },
              { x: 33000, y: 83.5, size: 52, label: 'South Korea' },
            ],
          },
          {
            name: 'Americas',
            points: [
              { x: 76000, y: 77.5, size: 335, label: 'United States' },
              { x: 9000, y: 75.9, size: 216, label: 'Brazil' },
              { x: 11000, y: 75.1, size: 128, label: 'Mexico' },
            ],
          },
        ],
      },
      x: { scale: 'log', format: { style: 'currency', currency: 'USD', notation: 'compact' } },
      y: { min: 65, max: 90, format: (v: number) => `${v} y` },
      size: { min: 6, max: 34 },
    },
    span: 2,
  },
  {
    title: 'Correlation',
    note: 'Two dense point clouds, dots only.',
    config: {
      type: scatter,
      ...common,
      data: {
        series: [
          {
            name: 'Control',
            points: Array.from({ length: 60 }, () => ({ x: rnd() * 100, y: rnd() * 60 + 20 })),
          },
          {
            name: 'Treatment',
            points: Array.from({ length: 60 }, () => ({ x: rnd() * 100, y: rnd() * 40 + 50 })),
          },
        ],
      },
      radius: 3,
      x: { format: { maximumFractionDigits: 0 } },
      y: { format: { maximumFractionDigits: 0 } },
    },
  },
  {
    title: 'Minimal',
    note: 'No axes, no grid, no legend, no tooltip: just the marks.',
    config: {
      type: area,
      ...common,
      data: {
        labels: days(40),
        series: [
          { name: 'A', values: walk(40, 50, 14) },
          { name: 'B', values: walk(40, 30, 10) },
        ],
      },
      x: { show: false },
      y: { show: false, grid: false },
      legend: false,
      tooltip: false,
      crosshair: false,
      padding: 4,
    },
  },
  {
    title: 'Styled with CSS',
    note: 'Dashed second series, thick stroke and custom palette via --tc-* variables.',
    config: {
      type: line,
      ...common,
      data: {
        labels: MONTHS,
        series: [
          { name: 'Actual', values: walk(12, 100, 30) },
          { name: 'Forecast', values: walk(12, 100, 30), class: 'is-forecast' },
        ],
      },
      curve: 'linear',
    },
    style: { '--tc-color-1': '#0ca678', '--tc-color-2': '#0ca678', '--tc-stroke-width': '3px' },
    class: 'gallery-styled',
  },
  {
    title: 'Dark card',
    note: 'A [data-theme="dark"] subtree inside the light page.',
    config: {
      type: bar,
      ...common,
      data: {
        labels: WEEKDAYS,
        series: [
          { name: 'Desktop', values: walk(7, 400, 120) },
          { name: 'Mobile', values: walk(7, 300, 100) },
        ],
      },
      stacked: true,
    },
    class: 'gallery-dark',
  },
  {
    title: 'Polish locale',
    note: 'pl-PL numbers and dates on a time axis.',
    config: {
      type: line,
      ...common,
      locale: 'pl-PL',
      data: {
        labels: days(90, Date.UTC(2026, 0, 1)),
        series: [{ name: 'Sprzedaż', values: walk(90, 12500, 900) }],
      },
      x: { type: 'time', utc: true },
      y: { format: { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 } },
      points: 'none',
      decimate: 45,
    },
  },
  {
    title: 'Hourly',
    note: '48 hours of requests; hourly ticks show the date at midnight.',
    config: {
      type: area,
      ...common,
      data: {
        labels: Array.from({ length: 48 }, (_, i) => Date.UTC(2026, 8, 29, i)),
        series: [
          {
            name: 'Requests',
            values: Array.from({ length: 48 }, (_, i) =>
              Math.round(200 + 150 * Math.sin((i - 6) / 3.8) + rnd() * 40),
            ),
          },
        ],
      },
      x: { type: 'time', utc: true },
      curve: 'monotone',
      fill: 'solid',
    },
  },
  {
    title: 'Static',
    note: 'animate: false, custom tooltip footer with the sum.',
    config: {
      type: bar,
      ...common,
      data: {
        labels: QUARTERS,
        series: [
          { name: 'Hardware', values: [120, 135, 150, 170] },
          { name: 'Software', values: [80, 95, 110, 140] },
          { name: 'Services', values: [40, 45, 60, 75] },
        ],
      },
      stacked: true,
      animate: false,
      tooltip: {
        footer: (hit: Hit) =>
          h(
            'div',
            { class: 'tc-tooltip-item' },
            h('span', { class: 'tc-tooltip-name' }, 'Total'),
            h(
              'span',
              { class: 'tc-tooltip-value' },
              String(hit.items.reduce((sum, item) => sum + (item.value ?? 0), 0)),
            ),
          ),
      },
    },
  },
]

const SPARKS: { name: string; value: string; config: Record<string, unknown> }[] = [
  { name: 'Revenue', value: '$48.2K', config: { data: walk(20, 40, 10), variant: 'area' } },
  {
    name: 'Bounce rate',
    value: '31%',
    config: { data: walk(20, 30, 8), variant: 'line', markers: 'minmax' },
  },
  { name: 'Errors', value: '12', config: { data: walk(20, 8, 6), variant: 'bar' } },
  {
    name: 'Deploys',
    value: '9 / 12',
    config: { data: [1, 1, -1, 1, 0, 1, -1, 1, 1, 1, 0, -1, 1, 1, 1, 1], variant: 'tristate' },
  },
  {
    name: 'Latency',
    value: '184 ms',
    config: { data: walk(20, 180, 40), variant: 'line', curve: 'step' },
  },
]

export const galleryDemo: Demo = {
  id: 'gallery',
  title: 'Gallery',
  description:
    'Many datasets and configurations side by side, with fixed data so the page looks the same on every load.',
  mount(el) {
    el.classList.add('gallery')
    for (const item of ITEMS) {
      const card = document.createElement('figure')
      card.className = `gallery-item${item.class ? ` ${item.class}` : ''}${item.span === 2 ? ' gallery-wide' : ''}`
      // The library's tokens switch on [data-theme], the page's on the class.
      if (item.class?.includes('gallery-dark')) card.dataset.theme = 'dark'
      const caption = document.createElement('figcaption')
      caption.innerHTML = `<strong>${item.title}</strong> ${item.note}`
      const host = document.createElement('div')
      for (const [prop, value] of Object.entries(item.style ?? {}))
        host.style.setProperty(prop, value)
      card.append(caption, host)
      el.append(card)
      new Chart(host, { ...item.config, title: item.title } as ChartConfig<object>)
    }
    const tiles = document.createElement('div')
    tiles.className = 'gallery-item gallery-wide tiles'
    for (const spark of SPARKS) {
      const tile = document.createElement('div')
      tile.className = 'tile'
      tile.innerHTML = `<div class="tile-label">${spark.name}</div><div class="tile-value">${spark.value}</div>`
      const host = document.createElement('div')
      tile.append(host)
      tiles.append(tile)
      new Chart(host, {
        type: sparkline,
        height: 36,
        locale: 'en-US',
        title: spark.name,
        ...spark.config,
      } as ChartConfig<object>)
    }
    el.append(tiles)
  },
}
