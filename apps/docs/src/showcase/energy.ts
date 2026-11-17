import { area, bar, donut, gauge, type Label, line, sankey } from '@tabler/charts'
import { C, common, type Group, span, years } from './types.ts'

const pct = (v: number) => `${v}%`
const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const

export const energy: Group = {
  id: 'energy',
  name: 'Energy',
  description:
    'Generation mixes, falling technology costs and a national energy balance: stacked areas, a sankey, a gauge against a target.',
  items: [
    {
      title: 'World electricity by source',
      note: 'Share of global generation in 2023; fossil sources in warm colors, clean ones in cool colors.',
      source: 'Ember Global Electricity Review, 2023',
      config: {
        type: donut,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'Coal', value: 35.5, color: '#4a4a4a' },
          { name: 'Gas', value: 22.5, color: C.orange },
          { name: 'Other fossil', value: 2.6, color: C.gray },
          { name: 'Hydro', value: 14.3, color: C.blue },
          { name: 'Nuclear', value: 9.1, color: C.purple },
          { name: 'Wind', value: 7.8, color: C.cyan },
          { name: 'Solar', value: 5.5, color: C.yellow },
          { name: 'Bioenergy & other', value: 2.7, color: C.green },
        ],
        format: pct,
        center: { value: '39%', label: 'clean' },
      },
    },
    {
      title: 'Solar capacity installed',
      note: 'Cumulative photovoltaic capacity worldwide, a near-exponential curve on a linear axis.',
      source: 'IRENA Renewable Capacity Statistics, 2010–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: span(2010, 2024).map(String),
          series: [
            {
              name: 'Solar PV, GW',
              values: [40, 70, 100, 138, 177, 227, 302, 393, 486, 587, 714, 849, 1055, 1419, 1865],
            },
          ],
        },
        y: { format: (v: number) => `${v} GW` },
        x: { format: (l: Label, i: number) => (i % 2 === 0 ? String(l) : '') },
      },
      style: { '--tc-color-1': C.yellow },
    },
    {
      title: 'Cost of new power',
      note: 'Unsubsidized levelized cost of utility solar and onshore wind in $/MWh, falling by ~85% in 15 years.',
      source: 'Lazard LCOE analysis, 2009–2024 (midpoints)',
      config: {
        type: line,
        ...common,
        data: {
          labels: [
            2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2023,
            2024,
          ].map(String),
          series: [
            {
              name: 'Utility solar',
              values: [359, 248, 157, 125, 104, 79, 65, 55, 50, 43, 40, 37, 36, 60, 61],
              color: C.yellow,
            },
            {
              name: 'Onshore wind',
              values: [135, 124, 71, 72, 70, 59, 55, 47, 45, 42, 41, 40, 38, 50, 50],
              color: C.cyan,
            },
          ],
        },
        y: { format: usd, zero: true },
      },
    },
    {
      title: 'US energy flows',
      note: 'Primary energy by source into the sectors that use it, in quads (10¹⁵ BTU); nodes colored by source.',
      source: 'Lawrence Livermore National Laboratory energy flow chart, 2023 (rounded)',
      span: 2,
      config: {
        type: sankey,
        ...common,
        aspectRatio: 1.7,
        padding: { top: 8, right: 8, bottom: 8, left: 8 },
        format: (v: number) => `${v.toFixed(1)} quads`,
        nodePadding: 12,
        data: {
          nodes: [
            { name: 'Petroleum', color: '#4a4a4a' },
            { name: 'Natural gas', color: C.orange },
            { name: 'Coal', color: C.gray },
            { name: 'Nuclear', color: C.purple },
            { name: 'Renewables', color: C.green },
          ],
          links: [
            { from: 'Petroleum', to: 'Transportation', value: 25.0 },
            { from: 'Petroleum', to: 'Industrial', value: 8.6 },
            { from: 'Petroleum', to: 'Residential & commercial', value: 1.6 },
            { from: 'Petroleum', to: 'Electricity generation', value: 0.2 },
            { from: 'Natural gas', to: 'Electricity generation', value: 12.6 },
            { from: 'Natural gas', to: 'Industrial', value: 10.7 },
            { from: 'Natural gas', to: 'Residential & commercial', value: 8.4 },
            { from: 'Natural gas', to: 'Transportation', value: 1.3 },
            { from: 'Coal', to: 'Electricity generation', value: 7.0 },
            { from: 'Coal', to: 'Industrial', value: 1.0 },
            { from: 'Nuclear', to: 'Electricity generation', value: 8.1 },
            { from: 'Renewables', to: 'Electricity generation', value: 6.2 },
            { from: 'Renewables', to: 'Industrial', value: 2.3 },
            { from: 'Renewables', to: 'Transportation', value: 1.5 },
            { from: 'Renewables', to: 'Residential & commercial', value: 0.9 },
          ],
        },
      },
    },
    {
      title: 'Germany: electricity generation',
      note: 'Gross generation by source in TWh, stacked areas: coal and nuclear shrink while wind and solar grow.',
      source: 'AG Energiebilanzen, 2015–2024',
      span: 2,
      config: {
        type: area,
        ...common,
        aspectRatio: 2.6,
        data: {
          labels: span(2015, 2024).map(String),
          series: [
            {
              name: 'Coal',
              values: [273, 262, 241, 229, 171, 134, 165, 181, 132, 110],
              color: '#4a4a4a',
            },
            { name: 'Gas', values: [62, 81, 87, 83, 91, 95, 90, 80, 76, 80], color: C.orange },
            { name: 'Nuclear', values: [92, 85, 76, 76, 75, 64, 69, 35, 7, 0], color: C.purple },
            {
              name: 'Wind',
              values: [80, 80, 106, 111, 126, 132, 114, 125, 139, 137],
              color: C.cyan,
            },
            { name: 'Solar', values: [39, 38, 39, 46, 47, 51, 50, 61, 62, 72], color: C.yellow },
            {
              name: 'Biomass & hydro',
              values: [70, 70, 68, 65, 64, 64, 63, 60, 60, 60],
              color: C.green,
            },
          ],
        },
        stacked: true,
        y: { format: (v: number) => `${v} TWh` },
        annotations: [{ x: '2023', label: 'Last reactors off', position: 'start' }],
      },
    },
    {
      title: 'Crude oil producers',
      note: 'Crude output in million barrels per day; horizontal bars with one decimal.',
      source: 'US EIA International Energy Statistics, 2023',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'United States',
            'Saudi Arabia',
            'Russia',
            'Canada',
            'Iraq',
            'China',
            'Iran',
            'UAE',
            'Brazil',
            'Kuwait',
          ],
          series: [
            { name: 'Crude oil', values: [12.9, 9.7, 9.5, 4.6, 4.3, 4.2, 3.6, 3.4, 3.4, 2.7] },
          ],
        },
        y: { format: (v: number) => `${v} mb/d` },
      },
      style: { '--tc-color-1': '#4a4a4a' },
    },
    {
      title: 'Electric cars in new sales',
      note: 'Share of battery and plug-in hybrid cars among new car sales in 2023.',
      source: 'IEA Global EV Outlook, 2024',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Norway',
            'Iceland',
            'Sweden',
            'Denmark',
            'Netherlands',
            'China',
            'Germany',
            'France',
            'United Kingdom',
            'United States',
            'Japan',
          ],
          series: [{ name: 'EV share', values: [93, 71, 60, 46, 45, 38, 25, 25, 24, 9.5, 3.6] }],
        },
        y: { max: 100, format: pct },
        valueLabels: { format: pct },
      },
      style: { '--tc-color-1': C.teal },
    },
    {
      title: 'Nuclear share of electricity',
      note: "How much of each country's electricity came from nuclear plants in 2023; France leads by far.",
      source: 'IAEA Power Reactor Information System, 2023',
      config: {
        type: bar,
        ...common,
        data: {
          labels: [
            'France',
            'Slovakia',
            'Hungary',
            'Finland',
            'Belgium',
            'South Korea',
            'Sweden',
            'United States',
            'Russia',
            'China',
          ],
          series: [{ name: 'Nuclear share', values: [65, 61, 49, 42, 41, 31, 29, 18, 18, 5] }],
        },
        y: { format: pct },
        maxBarWidth: 28,
      },
      style: { '--tc-color-1': C.purple },
    },
    {
      title: 'EU renewable energy target',
      note: 'The 2023 share of renewables in final energy against the 42.5% target for 2030, as a gauge.',
      source: 'Eurostat SHARES, 2023; Renewable Energy Directive III',
      config: {
        type: gauge,
        ...common,
        aspectRatio: 1.6,
        data: { name: 'of the 2030 target', value: 24.5, max: 42.5 },
        startAngle: -120,
        angle: 240,
        thickness: 18,
        center: { value: '24.5%', label: 'of 42.5% by 2030' },
        format: pct,
      },
      style: { '--tc-color-1': C.green },
    },
    {
      title: 'Battery pack prices',
      note: 'Volume-weighted average lithium-ion pack price per kWh, with every point marked.',
      source: 'BloombergNEF Battery Price Survey, 2013–2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: years(span(2013, 2024)),
          series: [
            {
              name: 'Pack price',
              values: [732, 683, 459, 303, 228, 186, 161, 143, 141, 161, 149, 115],
            },
          ],
        },
        x: { type: 'time', utc: true },
        points: 'all',
        y: { zero: true, format: usd },
      },
      style: { '--tc-color-1': C.indigo },
    },
  ],
}
