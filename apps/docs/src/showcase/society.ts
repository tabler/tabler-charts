import { area, bar, line, pie, scatter } from '@tabler/charts'
import { C, common, type Group, years } from './types.ts'

const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2023]

export const society: Group = {
  id: 'society',
  name: 'Population & society',
  description:
    'Demographics over decades and across countries: projections as dashed lines, a population pyramid, bubbles sized by population.',
  items: [
    {
      title: 'World population',
      note: 'Estimates to 2024 and the medium projection to 2050 as a dashed, thinner second series on a time axis.',
      source: 'UN World Population Prospects 2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: years([1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2024, 2030, 2040, 2050]),
          series: [
            {
              name: 'Estimate',
              values: [2.5, 3.0, 3.7, 4.4, 5.3, 6.1, 6.9, 7.8, 8.1, null, null, null],
            },
            {
              name: 'Projection',
              values: [null, null, null, null, null, null, null, null, 8.1, 8.5, 9.2, 9.7],
              dash: 5,
              width: 1.5,
            },
          ],
        },
        x: { type: 'time', utc: true },
        y: { zero: true, format: (v: number) => `${v}B` },
        points: 'all',
        pointRadius: 3,
      },
      style: { '--tc-color-2': 'var(--tc-color-1)' },
    },
    {
      title: 'Population by continent',
      note: 'Mid-2024 population in billions; Asia alone is more than half of the pie.',
      source: 'UN World Population Prospects 2024',
      config: {
        type: pie,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'Asia', value: 4.81 },
          { name: 'Africa', value: 1.52 },
          { name: 'Europe', value: 0.74 },
          { name: 'Latin America & Caribbean', value: 0.66 },
          { name: 'Northern America', value: 0.38 },
          { name: 'Oceania', value: 0.046 },
        ],
        format: (v: number) => `${v}B`,
        valueLabels: true,
      },
    },
    {
      title: 'Japan: population pyramid',
      note: 'Men to the left as negative values, women to the right, stacked horizontal bars by age group; the axis shows absolute values.',
      source: 'Statistics Bureau of Japan, 2023 estimate',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        stacked: true,
        maxBarWidth: 18,
        gap: 0,
        data: {
          labels: [
            '90+',
            '80–89',
            '70–79',
            '60–69',
            '50–59',
            '40–49',
            '30–39',
            '20–29',
            '10–19',
            '0–9',
          ],
          series: [
            {
              name: 'Men',
              values: [-0.6, -3.8, -7.0, -7.3, -8.4, -8.6, -6.6, -6.3, -5.4, -4.4],
              color: C.blue,
            },
            {
              name: 'Women',
              values: [2.0, 6.0, 8.2, 7.6, 8.4, 8.4, 6.4, 6.0, 5.1, 4.2],
              color: C.pink,
            },
          ],
        },
        y: { format: (v: number) => `${Math.abs(v).toFixed(1)}M` },
      },
    },
    {
      title: 'Life expectancy at birth',
      note: 'Four trajectories since 1950: a steady world average, Japan at the top, India catching up, Nigeria lagging.',
      source: 'UN World Population Prospects 2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: DECADES.map(String),
          series: [
            { name: 'Japan', values: [61.0, 67.7, 72.0, 76.1, 78.8, 81.1, 82.8, 84.6, 84.7] },
            { name: 'World', values: [46.5, 50.9, 56.1, 60.6, 64.0, 66.5, 70.1, 72.0, 73.3] },
            { name: 'India', values: [35.2, 41.4, 47.7, 53.8, 58.6, 62.5, 66.7, 70.1, 72.0] },
            { name: 'Nigeria', values: [33.6, 37.0, 41.0, 45.1, 45.9, 46.3, 50.9, 52.7, 54.5] },
          ],
        },
        curve: 'linear',
        y: { format: (v: number) => `${v} y` },
      },
    },
    {
      title: 'Fertility rate',
      note: 'Children per woman with the replacement level of 2.1 as a reference line; South Korea falls below 1.',
      source: 'World Bank World Development Indicators, 1960–2023',
      config: {
        type: line,
        ...common,
        data: {
          labels: ['1960', '1970', '1980', '1990', '2000', '2010', '2020', '2023'],
          series: [
            { name: 'Nigeria', values: [6.4, 6.4, 6.8, 6.5, 6.1, 5.9, 5.3, 4.5] },
            { name: 'World', values: [4.7, 4.8, 3.7, 3.3, 2.7, 2.6, 2.3, 2.3] },
            { name: 'Poland', values: [3.0, 2.2, 2.3, 2.1, 1.4, 1.4, 1.4, 1.2] },
            { name: 'South Korea', values: [6.0, 4.5, 2.8, 1.6, 1.5, 1.2, 0.84, 0.72] },
          ],
        },
        y: { zero: true },
        annotations: [{ y: 2.1, label: 'Replacement level', color: C.gray }],
      },
    },
    {
      title: 'Urban and rural population',
      note: "The world's people as 100% stacked areas: the urban majority arrives around 2007.",
      source: 'UN World Urbanization Prospects, 1960–2023',
      config: {
        type: area,
        ...common,
        data: {
          labels: ['1960', '1970', '1980', '1990', '2000', '2010', '2020', '2023'],
          series: [
            { name: 'Urban', values: [34, 37, 39, 43, 47, 52, 56, 57] },
            { name: 'Rural', values: [66, 63, 61, 57, 53, 48, 44, 43] },
          ],
        },
        stacked: 'percent',
        curve: 'linear',
        // A percent stack runs from 0 to 1 on the value axis: half is 0.5.
        annotations: [{ y: 0.5, color: C.gray }],
      },
    },
    {
      title: 'Languages by native speakers',
      note: 'First-language speakers in millions, a ranking as horizontal bars.',
      source: 'Ethnologue, 2024',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Mandarin Chinese',
            'Spanish',
            'English',
            'Hindi',
            'Bengali',
            'Portuguese',
            'Russian',
            'Japanese',
            'Vietnamese',
            'Turkish',
          ],
          series: [
            { name: 'Native speakers', values: [941, 486, 380, 345, 237, 236, 148, 123, 85, 84] },
          ],
        },
        y: { format: (v: number) => `${v}M` },
      },
    },
    {
      title: 'Largest urban areas',
      note: 'Population of the ten largest agglomerations in millions, 2024.',
      source: 'UN World Urbanization Prospects, 2024',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Tokyo',
            'Delhi',
            'Shanghai',
            'Dhaka',
            'São Paulo',
            'Cairo',
            'Mexico City',
            'Beijing',
            'Mumbai',
            'Osaka',
          ],
          series: [
            {
              name: 'Population',
              values: [37.1, 33.8, 29.9, 23.9, 22.8, 22.6, 22.5, 22.2, 21.7, 18.9],
            },
          ],
        },
        y: { format: (v: number) => `${v}M` },
        valueLabels: { format: (v: number) => `${v}M` },
      },
      style: { '--tc-color-1': C.indigo },
    },
    {
      title: 'Median age vs. fertility',
      note: 'Each bubble is a country, sized by population: older societies have fewer children.',
      source: 'UN World Population Prospects 2024',
      span: 2,
      config: {
        type: scatter,
        ...common,
        aspectRatio: 2.4,
        data: {
          series: [
            {
              name: 'Africa',
              points: [
                { x: 15.2, y: 6.7, size: 27, label: 'Niger' },
                { x: 17.2, y: 5.1, size: 227, label: 'Nigeria' },
                { x: 20.0, y: 3.2, size: 56, label: 'Kenya' },
                { x: 24.1, y: 2.8, size: 114, label: 'Egypt' },
              ],
            },
            {
              name: 'Asia',
              points: [
                { x: 28.2, y: 2.0, size: 1441, label: 'India' },
                { x: 30.4, y: 2.1, size: 280, label: 'Indonesia' },
                { x: 39.5, y: 1.0, size: 1419, label: 'China' },
                { x: 45.5, y: 0.7, size: 52, label: 'South Korea' },
                { x: 49.5, y: 1.2, size: 124, label: 'Japan' },
              ],
            },
            {
              name: 'Europe',
              points: [
                { x: 42.0, y: 1.2, size: 38, label: 'Poland' },
                { x: 46.7, y: 1.4, size: 84, label: 'Germany' },
                { x: 48.1, y: 1.2, size: 59, label: 'Italy' },
              ],
            },
            {
              name: 'Americas',
              points: [
                { x: 29.3, y: 1.9, size: 129, label: 'Mexico' },
                { x: 33.2, y: 1.6, size: 217, label: 'Brazil' },
                { x: 38.5, y: 1.6, size: 345, label: 'United States' },
              ],
            },
          ],
        },
        x: { format: (v: number) => `${v} y` },
        y: { min: 0, max: 8 },
        size: { min: 5, max: 30 },
      },
    },
    {
      title: 'World Happiness Report, top 10',
      note: 'Life evaluation on a 0–10 scale; the axis starts at 6 so the small gaps between countries show.',
      source: 'World Happiness Report 2024 (2021–2023 average)',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Finland',
            'Denmark',
            'Iceland',
            'Sweden',
            'Israel',
            'Netherlands',
            'Norway',
            'Luxembourg',
            'Switzerland',
            'Australia',
          ],
          series: [
            { name: 'Score', values: [7.74, 7.58, 7.53, 7.34, 7.34, 7.32, 7.3, 7.12, 7.06, 7.06] },
          ],
        },
        y: { min: 6, max: 8, format: { minimumFractionDigits: 1 } },
        valueLabels: { format: { minimumFractionDigits: 2 } },
      },
      style: { '--tc-color-1': C.yellow },
    },
  ],
}
