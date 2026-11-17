import { area, bar, donut, line, pie, sankey } from '@tabler/charts'
import { C, common, type Group, span } from './types.ts'

const usdB = { style: 'currency', currency: 'USD', notation: 'compact' } as const

export const business: Group = {
  id: 'business',
  name: 'Business & tech companies',
  description:
    'Revenue, deliveries and subscribers from annual reports: donuts, grouped bars, a sankey of an income statement.',
  items: [
    {
      title: 'Apple revenue by segment',
      note: 'Fiscal 2024 net sales; the donut total in the middle, compact currency in the tooltip.',
      source: 'Apple Form 10-K, FY2024',
      config: {
        type: donut,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'iPhone', value: 201.2e9 },
          { name: 'Services', value: 96.2e9 },
          { name: 'Wearables, Home', value: 37.0e9 },
          { name: 'Mac', value: 30.0e9 },
          { name: 'iPad', value: 26.7e9 },
        ],
        format: usdB,
        center: { value: '$391B', label: 'net sales' },
      },
    },
    {
      title: 'Nvidia revenue',
      note: 'Eleven fiscal years; the last three bars dwarf the rest, so the axis goes compact.',
      source: 'Nvidia annual reports, FY2015–FY2025',
      config: {
        type: bar,
        ...common,
        data: {
          labels: span(2015, 2025).map((y) => `FY${String(y).slice(2)}`),
          series: [
            {
              name: 'Revenue',
              values: [
                4.68e9, 5.01e9, 6.91e9, 9.71e9, 11.72e9, 10.92e9, 16.68e9, 26.91e9, 26.97e9,
                60.92e9, 130.5e9,
              ],
            },
          ],
        },
        y: { format: usdB },
        valueLabels: true,
      },
      style: { '--tc-color-1': C.green },
    },
    {
      title: 'Tesla deliveries',
      note: 'Vehicles delivered per year; the first decline in 2024 shows with value labels on top.',
      source: 'Tesla quarterly production and deliveries reports, 2015–2024',
      config: {
        type: bar,
        ...common,
        data: {
          labels: span(2015, 2024).map(String),
          series: [
            {
              name: 'Deliveries',
              values: [
                50_580, 76_230, 103_020, 245_240, 367_500, 499_550, 936_170, 1_313_850, 1_808_580,
                1_789_230,
              ],
            },
          ],
        },
        y: { format: { notation: 'compact' } },
        valueLabels: { format: { notation: 'compact', maximumFractionDigits: 2 } },
      },
      style: { '--tc-color-1': C.red },
    },
    {
      title: 'Netflix paid memberships',
      note: 'Year-end subscribers in millions, a gradient area with a dot on the last point.',
      source: 'Netflix shareholder letters, 2012–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: span(2012, 2024).map(String),
          series: [
            {
              name: 'Paid memberships',
              values: [
                30.4, 44.4, 57.4, 74.8, 93.8, 117.6, 139.3, 167.1, 203.7, 221.8, 230.7, 260.3,
                301.6,
              ],
            },
          ],
        },
        points: 'last',
        y: { format: (v: number) => `${v}M` },
      },
      style: { '--tc-color-1': '#e50914' },
    },
    {
      title: 'Alphabet income statement',
      note: 'Where 2024 revenue came from and where it went: six sources into revenue, out to costs and operating income.',
      source: 'Alphabet Form 10-K, 2024',
      span: 2,
      config: {
        type: sankey,
        ...common,
        aspectRatio: 1.7,
        padding: { top: 12, right: 8, bottom: 16, left: 8 },
        format: usdB,
        data: {
          nodes: [
            { name: 'Google Search', color: C.blue },
            { name: 'YouTube ads', color: C.red },
            { name: 'Google Network', color: C.azure },
            { name: 'Subscriptions & devices', color: C.indigo },
            { name: 'Google Cloud', color: C.teal },
            { name: 'Other Bets', color: C.gray },
            { name: 'Cost of revenue', color: C.orange },
            { name: 'R&D', color: C.yellow },
            { name: 'Sales & marketing', color: C.yellow },
            { name: 'General & admin', color: C.yellow },
            { name: 'Operating income', color: C.green },
          ],
          links: [
            ['Google Search', 'Revenue', 198.1],
            ['YouTube ads', 'Revenue', 36.1],
            ['Google Network', 'Revenue', 30.4],
            ['Subscriptions & devices', 'Revenue', 40.3],
            ['Google Cloud', 'Revenue', 43.2],
            ['Other Bets', 'Revenue', 1.6],
            ['Revenue', 'Cost of revenue', 146.3],
            ['Revenue', 'R&D', 49.3],
            ['Revenue', 'Sales & marketing', 27.8],
            ['Revenue', 'General & admin', 14.2],
            ['Revenue', 'Operating income', 112.4],
          ].map(([from, to, value]) => ({
            from: from as string,
            to: to as string,
            value: (value as number) * 1e9,
          })),
        },
      },
    },
    {
      title: 'Microsoft revenue by segment',
      note: 'Three segments of fiscal 2024, a plain pie with value labels showing each share.',
      source: 'Microsoft Form 10-K, FY2024',
      config: {
        type: pie,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'Intelligent Cloud', value: 105.4e9 },
          { name: 'Productivity & Business Processes', value: 77.7e9 },
          { name: 'More Personal Computing', value: 62.0e9 },
        ],
        format: usdB,
        valueLabels: true,
      },
    },
    {
      title: 'Smartphone shipments by vendor',
      note: 'Units shipped in 2024, with the long tail as "Others"; the slices start at 90°.',
      source: 'IDC Worldwide Quarterly Mobile Phone Tracker, 2024',
      config: {
        type: donut,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'Apple', value: 232.1 },
          { name: 'Samsung', value: 223.4 },
          { name: 'Xiaomi', value: 168.6 },
          { name: 'Transsion', value: 106.7 },
          { name: 'OPPO', value: 103.6 },
          { name: 'Others', value: 404.4, color: C.muted },
        ],
        startAngle: 90,
        format: (v: number) => `${v.toFixed(1)}M`,
        center: { value: '1.24B', label: 'units' },
      },
    },
    {
      title: 'Starbucks stores worldwide',
      note: 'Store count at fiscal year end, every four years, a monotone line.',
      source: 'Starbucks annual reports, FY2000–FY2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: ['2000', '2004', '2008', '2012', '2016', '2020', '2024'],
          series: [{ name: 'Stores', values: [3501, 8569, 16680, 18066, 25085, 32660, 40199] }],
        },
        points: 'all',
        y: { zero: true, format: { notation: 'compact' } },
      },
      style: { '--tc-color-1': '#00704a' },
    },
    {
      title: 'Spotify users',
      note: 'Monthly active users and premium subscribers at year end, in millions; the gap is the ad-supported tier.',
      source: 'Spotify quarterly reports, 2016–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: span(2016, 2024).map(String),
          series: [
            { name: 'Monthly active users', values: [123, 160, 207, 271, 345, 406, 489, 602, 675] },
            { name: 'Premium subscribers', values: [48, 71, 96, 124, 155, 180, 205, 236, 263] },
          ],
        },
        y: { format: (v: number) => `${v}M` },
      },
      style: { '--tc-color-1': '#1db954', '--tc-color-2': '#191414' },
    },
    {
      title: 'Amazon net sales by segment',
      note: 'Quarterly 2024 sales stacked by segment: AWS is a fifth of the sales but most of the operating income.',
      source: 'Amazon Form 10-K, 2024',
      config: {
        type: bar,
        ...common,
        data: {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          series: [
            { name: 'North America', values: [86.3e9, 90.0e9, 95.5e9, 115.6e9] },
            { name: 'International', values: [31.9e9, 31.7e9, 35.9e9, 43.4e9] },
            { name: 'AWS', values: [25.0e9, 26.3e9, 27.5e9, 28.8e9] },
          ],
        },
        stacked: true,
        y: { format: usdB },
      },
    },
  ],
}
