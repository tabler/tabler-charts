import { area, bar, type Label, line, pie, scatter } from '@tabler/charts'
import { C, common, type Group, span } from './types.ts'

const pct = (v: number) => `${v}%`

export const technology: Group = {
  id: 'technology',
  name: 'Technology & web',
  description: 'Market shares over time, exponential trends on log scales and survey rankings.',
  items: [
    {
      title: 'Browser market share',
      note: 'Fifteen years of browsers as 100% stacked areas: Internet Explorer fades, Chrome takes two thirds.',
      source: 'StatCounter GlobalStats, 2009–2024',
      span: 2,
      config: {
        type: area,
        ...common,
        aspectRatio: 2.6,
        data: {
          labels: ['2009', '2012', '2015', '2018', '2021', '2024'],
          series: [
            { name: 'Chrome', values: [4, 33, 53, 61, 65, 66], color: C.yellow },
            { name: 'Safari', values: [3, 7, 12, 15, 19, 18], color: C.blue },
            { name: 'Firefox', values: [27, 23, 15, 5, 4, 2.6], color: C.orange },
            { name: 'Internet Explorer / Edge', values: [65, 35, 13, 7, 3.5, 5.2], color: C.cyan },
            { name: 'Other', values: [1, 2, 7, 12, 8.5, 8.2], color: C.muted },
          ],
        },
        stacked: 'percent',
        curve: 'linear',
      },
    },
    {
      title: 'Mobile overtakes desktop',
      note: 'Share of web page views by device, a 100% stacked area; mobile crosses 50% in 2017.',
      source: 'StatCounter GlobalStats, 2011–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: span(2011, 2024).map(String),
          series: [
            {
              name: 'Mobile & tablet',
              values: [6, 11, 17, 26, 35, 43, 50, 52, 53, 56, 55, 59, 58, 62],
            },
            { name: 'Desktop', values: [94, 89, 83, 74, 65, 57, 50, 48, 47, 44, 45, 41, 42, 38] },
          ],
        },
        stacked: 'percent',
        x: { format: (l: Label, i: number) => (i % 2 === 1 ? String(l) : '') },
        annotations: [{ x: '2017', label: '50/50' }],
      },
    },
    {
      title: 'Most used programming languages',
      note: 'Share of professional developers who worked with each language in the past year.',
      source: 'Stack Overflow Developer Survey, 2024',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.1,
        orientation: 'horizontal',
        maxBarWidth: 14,
        data: {
          labels: [
            'JavaScript',
            'HTML/CSS',
            'SQL',
            'Python',
            'TypeScript',
            'Bash/Shell',
            'Java',
            'C#',
            'C++',
            'C',
            'PHP',
            'PowerShell',
            'Go',
            'Rust',
            'Kotlin',
          ],
          series: [
            {
              name: 'Developers using',
              values: [
                62.3, 52.9, 51.0, 51.0, 38.5, 33.9, 30.3, 27.1, 23.0, 20.2, 18.2, 13.8, 13.5, 12.6,
                9.4,
              ],
            },
          ],
        },
        y: { max: 100, format: pct },
      },
    },
    {
      title: 'Internet users',
      note: 'People online worldwide in billions, a gradient area over twenty years.',
      source: 'ITU Facts and Figures, 2005–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: span(2005, 2024).map(String),
          series: [
            {
              name: 'Internet users',
              values: [
                1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.7, 2.9, 3.2, 3.4, 3.6, 3.9, 4.1, 4.6, 4.9,
                5.1, 5.4, 5.5,
              ],
            },
          ],
        },
        y: { format: (v: number) => `${v}B` },
        x: { format: (l: Label, i: number) => (i % 3 === 0 ? String(l) : '') },
      },
    },
    {
      title: "Moore's law",
      note: 'Transistors per chip for landmark processors on a log y axis: a straight line is a doubling every two years.',
      source: 'Manufacturer specifications, 1971–2023',
      span: 2,
      config: {
        type: scatter,
        ...common,
        aspectRatio: 2.4,
        data: {
          series: [
            {
              name: 'Intel',
              points: [
                { x: 1971, y: 2300, label: '4004' },
                { x: 1974, y: 6000, label: '8080' },
                { x: 1978, y: 29000, label: '8086' },
                { x: 1982, y: 134000, label: '80286' },
                { x: 1985, y: 275000, label: '80386' },
                { x: 1989, y: 1.2e6, label: '80486' },
                { x: 1993, y: 3.1e6, label: 'Pentium' },
                { x: 1997, y: 7.5e6, label: 'Pentium II' },
                { x: 2000, y: 42e6, label: 'Pentium 4' },
                { x: 2006, y: 291e6, label: 'Core 2 Duo' },
                { x: 2008, y: 731e6, label: 'Core i7' },
                { x: 2012, y: 1.4e9, label: 'Ivy Bridge' },
              ],
            },
            {
              name: 'AMD',
              points: [
                { x: 2017, y: 4.8e9, label: 'Ryzen 7 1800X' },
                { x: 2019, y: 3.9e9, label: 'Ryzen 9 3900X (CCD)' },
              ],
            },
            {
              name: 'Apple',
              points: [
                { x: 2020, y: 16e9, label: 'M1' },
                { x: 2022, y: 114e9, label: 'M1 Ultra' },
                { x: 2023, y: 134e9, label: 'M2 Ultra' },
              ],
            },
          ],
        },
        radius: 5,
        x: { min: 1970, max: 2025, format: { useGrouping: false } },
        y: { scale: 'log', format: { notation: 'compact' } },
      },
    },
    {
      title: 'Wikipedia by language',
      note: 'Articles in millions; the second place is a bot-written edition, a fact the chart cannot show.',
      source: 'Wikimedia statistics, 2024',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'English',
            'Cebuano',
            'German',
            'French',
            'Swedish',
            'Dutch',
            'Russian',
            'Spanish',
            'Italian',
            'Polish',
          ],
          series: [
            { name: 'Articles', values: [6.9, 6.1, 2.9, 2.6, 2.6, 2.2, 2.0, 1.98, 1.9, 1.63] },
          ],
        },
        y: { format: (v: number) => `${v}M` },
      },
    },
    {
      title: 'Cloud infrastructure market',
      note: 'Share of worldwide cloud infrastructure services spending in the fourth quarter of 2024.',
      source: 'Synergy Research Group, Q4 2024',
      config: {
        type: pie,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'AWS', value: 30, color: C.orange },
          { name: 'Microsoft Azure', value: 21, color: C.blue },
          { name: 'Google Cloud', value: 12, color: C.red },
          { name: 'Alibaba Cloud', value: 4, color: C.yellow },
          { name: 'Others', value: 33, color: C.muted },
        ],
        format: pct,
        valueLabels: true,
      },
    },
    {
      title: 'Cost of storage',
      note: 'Hard disk price per gigabyte, from half a million dollars to a cent: seven orders of magnitude on a log axis.',
      source: 'Historical price surveys (mkomo.com, Backblaze), 1980–2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: ['1980', '1985', '1990', '1995', '2000', '2005', '2010', '2015', '2020', '2024'],
          series: [
            {
              name: 'USD per GB',
              values: [437_500, 100_000, 9_000, 1_000, 10, 0.9, 0.09, 0.03, 0.02, 0.012],
            },
          ],
        },
        points: 'all',
        y: {
          scale: 'log',
          format: {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 3,
          },
        },
      },
      style: { '--tc-color-1': C.purple },
    },
    {
      title: 'Data created each year',
      note: 'Zettabytes of data created, captured and consumed; the forecast is a second series in a lighter color.',
      source: 'IDC Global DataSphere via Statista, 2010–2025',
      config: {
        type: bar,
        ...common,
        data: {
          labels: ['2010', '2012', '2014', '2016', '2018', '2020', '2022', '2024', '2025'],
          series: [
            { name: 'Actual', values: [2, 6.5, 12.5, 18, 33, 64, 97, 149, null] },
            {
              name: 'Forecast',
              values: [null, null, null, null, null, null, null, null, 181],
              color: C.muted,
            },
          ],
        },
        stacked: true,
        y: { format: (v: number) => `${v} ZB` },
      },
    },
  ],
}
