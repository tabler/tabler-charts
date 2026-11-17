import { area, bar, heatmap, line, pie } from '@tabler/charts'
import { C, common, type Group, MONTHS, years } from './types.ts'

const CLIMATE_YEARS = [
  1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024,
]
const celsius = { style: 'unit', unit: 'celsius' } as const

export const climate: Group = {
  id: 'climate',
  name: 'Climate & environment',
  description:
    'Long records and climate normals: synced charts, diverging bars, a heatmap of monthly highs, bands and reference lines.',
  items: [
    {
      title: 'Atmospheric CO₂',
      note: 'Annual mean at Mauna Loa, every five years. Hover: this chart and the next share one sync group, so the tooltip opens in both.',
      source: 'NOAA Global Monitoring Laboratory, 1960–2024',
      config: {
        type: area,
        ...common,
        sync: 'climate',
        data: {
          labels: CLIMATE_YEARS.map(String),
          series: [
            {
              name: 'CO₂, ppm',
              values: [
                316.9, 320.0, 325.7, 331.1, 338.8, 346.1, 354.4, 360.8, 369.5, 379.8, 389.9, 400.8,
                414.2, 424.6,
              ],
            },
          ],
        },
        y: { min: 300, format: (v: number) => `${v} ppm` },
        annotations: [{ y: 350, label: '350 ppm', color: C.orange }],
      },
    },
    {
      title: 'Global temperature anomaly',
      note: 'Difference from the 1951–1980 mean, the same years as the CO₂ chart and the same sync group.',
      source: 'NASA GISS Surface Temperature Analysis, 1960–2024',
      config: {
        type: line,
        ...common,
        sync: 'climate',
        data: {
          labels: CLIMATE_YEARS.map(String),
          series: [
            {
              name: 'Anomaly',
              values: [
                0.03, -0.11, 0.03, -0.01, 0.26, 0.12, 0.45, 0.45, 0.4, 0.68, 0.72, 0.9, 1.01, 1.28,
              ],
            },
          ],
        },
        curve: 'linear',
        points: 'all',
        y: {
          format: { ...celsius, signDisplay: 'exceptZero', maximumFractionDigits: 1 },
          zero: true,
        },
      },
      style: { '--tc-color-1': C.red },
    },
    {
      title: 'Warming by decade',
      note: 'Decadal mean anomaly from the 1880s on: cool decades grow down, warm ones up, each in its own color.',
      source: 'NASA GISS, 1880–2024 (the 2020s so far)',
      span: 2,
      config: {
        type: bar,
        ...common,
        aspectRatio: 2.6,
        data: {
          labels: [
            '1880s',
            '1890s',
            '1900s',
            '1910s',
            '1920s',
            '1930s',
            '1940s',
            '1950s',
            '1960s',
            '1970s',
            '1980s',
            '1990s',
            '2000s',
            '2010s',
            '2020s',
          ],
          series: [
            {
              name: 'Cooler than 1951–1980',
              values: [
                -0.27,
                -0.26,
                -0.26,
                -0.27,
                -0.17,
                -0.03,
                null,
                -0.02,
                -0.01,
                null,
                null,
                null,
                null,
                null,
                null,
              ],
              color: C.azure,
            },
            {
              name: 'Warmer than 1951–1980',
              values: [
                null,
                null,
                null,
                null,
                null,
                null,
                0.04,
                null,
                null,
                0.0,
                0.2,
                0.38,
                0.61,
                0.86,
                1.14,
              ],
              color: C.red,
            },
          ],
        },
        stacked: true,
        radius: 2,
        y: { format: { ...celsius, signDisplay: 'exceptZero', maximumFractionDigits: 2 } },
      },
    },
    {
      title: 'Warsaw: daily highs and lows',
      note: 'Climate normals by month; both lines cross zero in winter and the axis is in °C.',
      source: 'IMGW climate normals 1991–2020',
      config: {
        type: line,
        ...common,
        data: {
          labels: MONTHS,
          series: [
            {
              name: 'Average high',
              values: [0.6, 1.9, 6.6, 13.6, 19.5, 22.4, 24.7, 24.2, 18.6, 12.7, 6.1, 1.7],
              color: C.orange,
            },
            {
              name: 'Average low',
              values: [-4.2, -3.6, -0.6, 3.9, 8.9, 12.1, 14.4, 13.7, 9.6, 5.1, 1.1, -2.6],
              color: C.azure,
            },
          ],
        },
        points: 'all',
        pointRadius: 3,
        y: { format: celsius, zero: true },
      },
    },
    {
      title: 'Rain in Warsaw and Lisbon',
      note: 'Monthly precipitation normals: a continental summer peak against a Mediterranean dry season.',
      source: 'IMGW and IPMA climate normals 1991–2020',
      config: {
        type: bar,
        ...common,
        data: {
          labels: MONTHS,
          series: [
            { name: 'Warsaw', values: [27, 26, 29, 35, 55, 69, 73, 59, 46, 36, 36, 33] },
            { name: 'Lisbon', values: [100, 90, 55, 65, 40, 15, 5, 5, 30, 100, 110, 105] },
          ],
        },
        y: { format: (v: number) => `${v} mm` },
      },
    },
    {
      title: 'Monthly highs in seven cities',
      note: 'Average daily high by month: a sequential heatmap from cold blue-ish grid to hot red, with a fixed 0–42 °C range.',
      source: 'WMO climate normals 1991–2020',
      span: 2,
      config: {
        type: heatmap,
        ...common,
        aspectRatio: 2.6,
        data: {
          labels: MONTHS,
          series: [
            { name: 'Reykjavík', values: [3, 3, 4, 6, 10, 12, 14, 14, 11, 7, 4, 3] },
            { name: 'Warsaw', values: [1, 2, 7, 14, 20, 22, 25, 24, 19, 13, 6, 2] },
            { name: 'New York', values: [4, 6, 10, 17, 22, 27, 30, 29, 25, 18, 12, 7] },
            { name: 'Tokyo', values: [10, 11, 14, 19, 23, 26, 30, 31, 27, 22, 17, 12] },
            { name: 'Lisbon', values: [15, 16, 19, 20, 22, 26, 28, 29, 27, 23, 18, 15] },
            { name: 'Sydney', values: [26, 26, 25, 23, 20, 17, 17, 18, 20, 22, 24, 25] },
            { name: 'Singapore', values: [30, 31, 32, 32, 32, 31, 31, 31, 31, 31, 30, 30] },
            { name: 'Dubai', values: [24, 25, 29, 33, 38, 40, 41, 42, 39, 35, 30, 26] },
          ],
        },
        min: 0,
        max: 42,
        colors: [C.azure, 'var(--tc-grid-color)', C.yellow, C.red],
        format: celsius,
        padding: { top: 4, left: 10 },
      },
    },
    {
      title: 'Arctic sea ice minimum',
      note: 'September extent in million km²; the 2012 record low as a point annotation on the time axis.',
      source: 'NSIDC Sea Ice Index, 1980–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: years([1980, 1985, 1990, 1995, 2000, 2005, 2010, 2012, 2015, 2020, 2024]),
          series: [
            {
              name: 'September extent',
              values: [7.67, 6.7, 6.14, 6.08, 6.25, 5.5, 4.87, 3.57, 4.63, 3.92, 4.28],
            },
          ],
        },
        x: { type: 'time', utc: true },
        y: { zero: true, format: (v: number) => `${v}M km²` },
        annotations: [{ x: Date.UTC(2012, 0, 1), label: '2012 record low', color: C.red }],
      },
      style: { '--tc-color-1': C.cyan },
    },
    {
      title: 'CO₂ emissions per person',
      note: 'Fossil emissions per capita in tonnes; sorted horizontal bars with a world-average line.',
      source: 'Global Carbon Project via Our World in Data, 2023',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Qatar',
            'United States',
            'Russia',
            'Japan',
            'China',
            'Poland',
            'Germany',
            'United Kingdom',
            'India',
            'Nigeria',
          ],
          series: [
            {
              name: 'Tonnes per person',
              values: [37.6, 14.3, 11.4, 8.5, 8.0, 7.9, 7.7, 4.4, 2.0, 0.6],
            },
          ],
        },
        y: { format: (v: number) => `${v} t` },
        annotations: [{ y: 4.7, label: 'World 4.7 t', color: C.gray }],
      },
    },
    {
      title: 'Greenhouse gas emissions by sector',
      note: 'Global emissions split into sectors; eight slices with a gap between them.',
      source: 'Climate Watch / Our World in Data, 2016',
      config: {
        type: pie,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'Energy in industry', value: 24.2 },
          { name: 'Agriculture, forestry, land', value: 18.4 },
          { name: 'Energy in buildings', value: 17.5 },
          { name: 'Transport', value: 16.2 },
          { name: 'Unallocated fuel combustion', value: 7.8 },
          { name: 'Fugitive emissions', value: 5.8 },
          { name: 'Industrial processes', value: 5.2 },
          { name: 'Waste', value: 3.2 },
          { name: 'Agriculture & fishing energy', value: 1.7 },
        ],
        format: (v: number) => `${v}%`,
        gap: 3,
      },
    },
    {
      title: 'Hours of daylight',
      note: 'Day length on the 15th of each month at three latitudes: 64°N, 52°N and the equator.',
      source: 'Astronomical computation (NOAA solar calculator)',
      config: {
        type: line,
        ...common,
        data: {
          labels: MONTHS,
          series: [
            {
              name: 'Reykjavík',
              values: [4.9, 7.9, 11.5, 15.3, 18.9, 21.0, 19.9, 16.6, 13.0, 9.5, 6.2, 4.2],
            },
            {
              name: 'Warsaw',
              values: [8.4, 9.9, 11.8, 14.0, 15.8, 16.8, 16.3, 14.7, 12.6, 10.5, 8.7, 7.8],
            },
            {
              name: 'Singapore',
              values: [12.0, 12.1, 12.1, 12.2, 12.2, 12.2, 12.2, 12.2, 12.1, 12.1, 12.0, 12.0],
            },
          ],
        },
        y: { min: 0, max: 24, ticks: 5, format: (v: number) => `${v} h` },
      },
    },
    {
      title: 'Sea level rise',
      note: 'Global mean sea level from satellite altimetry, relative to 1993, in millimetres.',
      source: 'NASA / CNES satellite altimetry, 1993–2023',
      config: {
        type: area,
        ...common,
        data: {
          labels: years([1993, 1998, 2003, 2008, 2013, 2018, 2023]),
          series: [{ name: 'Sea level change', values: [0, 12, 25, 38, 55, 78, 101] }],
        },
        x: { type: 'time', utc: true },
        points: 'all',
        y: { format: (v: number) => `${v} mm` },
      },
      style: { '--tc-color-1': C.blue },
    },
  ],
}
