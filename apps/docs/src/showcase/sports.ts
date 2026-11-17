import { area, bar, line, pie } from '@tabler/charts'
import { C, common, type Group, years } from './types.ts'

/** Seconds as h:mm:ss. */
const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.round(s % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
const hms = (h: number, m: number, s: number) => h * 3600 + m * 60 + s

export const sports: Group = {
  id: 'sports',
  name: 'Sports',
  description:
    'Medal tables, record progressions and title counts: stacked bars in medal colors, step lines and a tristate sparkline.',
  items: [
    {
      title: 'Paris 2024 medal table',
      note: 'Gold, silver and bronze stacked per country in medal colors, sorted by golds.',
      source: 'International Olympic Committee, 2024',
      span: 2,
      config: {
        type: bar,
        ...common,
        aspectRatio: 2.4,
        orientation: 'horizontal',
        stacked: true,
        maxBarWidth: 16,
        data: {
          labels: [
            'United States',
            'China',
            'Japan',
            'Australia',
            'France',
            'Netherlands',
            'Great Britain',
            'South Korea',
            'Italy',
            'Germany',
          ],
          series: [
            { name: 'Gold', values: [40, 40, 20, 18, 16, 15, 14, 13, 12, 12], color: '#d4a017' },
            { name: 'Silver', values: [44, 27, 12, 19, 26, 7, 22, 9, 13, 13], color: '#a8a9ad' },
            { name: 'Bronze', values: [42, 24, 13, 16, 22, 12, 29, 10, 15, 8], color: '#a97142' },
          ],
        },
      },
    },
    {
      title: "Men's 100 m world record",
      note: 'Each record holds until the next: a step line on a time axis, from 10.6 to 9.58 seconds.',
      source: 'World Athletics, 1912–2009',
      config: {
        type: line,
        ...common,
        data: {
          labels: years([
            1912, 1921, 1930, 1936, 1956, 1960, 1968, 1983, 1988, 1991, 1994, 1996, 1999, 2005,
            2007, 2008, 2009, 2024,
          ]),
          series: [
            {
              name: 'Record',
              values: [
                10.6, 10.4, 10.3, 10.2, 10.1, 10.0, 9.95, 9.93, 9.92, 9.86, 9.85, 9.84, 9.79, 9.77,
                9.74, 9.69, 9.58, 9.58,
              ],
            },
          ],
        },
        x: { type: 'time', utc: true },
        curve: 'step-after',
        points: 'all',
        pointRadius: 2.5,
        y: { format: (v: number) => `${v.toFixed(2)} s` },
        annotations: [{ x: Date.UTC(2009, 7, 16), label: 'Bolt 9.58', color: C.yellow }],
      },
    },
    {
      title: "Men's marathon world record",
      note: 'Times stored in seconds and formatted as h:mm:ss on the axis and in the tooltip.',
      source: 'World Athletics, 1908–2023',
      config: {
        type: line,
        ...common,
        data: {
          labels: years([
            1908, 1925, 1947, 1953, 1967, 1981, 1988, 1999, 2003, 2008, 2014, 2018, 2023,
          ]),
          series: [
            {
              name: 'Record',
              values: [
                hms(2, 55, 18),
                hms(2, 29, 2),
                hms(2, 25, 39),
                hms(2, 18, 40),
                hms(2, 9, 36),
                hms(2, 8, 18),
                hms(2, 6, 50),
                hms(2, 5, 42),
                hms(2, 4, 55),
                hms(2, 3, 59),
                hms(2, 2, 57),
                hms(2, 1, 39),
                hms(2, 0, 35),
              ],
            },
          ],
        },
        x: { type: 'time', utc: true },
        curve: 'step-after',
        points: 'all',
        pointRadius: 2.5,
        y: { format: clock },
        annotations: [{ y: hms(2, 0, 0), label: 'Two hours', color: C.red }],
      },
    },
    {
      title: 'FIFA World Cup titles',
      note: 'Eight winners in 22 tournaments; slices start at 90° and show their count.',
      source: 'FIFA, 1930–2022',
      config: {
        type: pie,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'Brazil', value: 5 },
          { name: 'Germany', value: 4 },
          { name: 'Italy', value: 4 },
          { name: 'Argentina', value: 3 },
          { name: 'France', value: 2 },
          { name: 'Uruguay', value: 2 },
          { name: 'England', value: 1 },
          { name: 'Spain', value: 1 },
        ],
        startAngle: 90,
        valueLabels: { format: (v: number) => String(v) },
      },
    },
    {
      title: "Formula 1 drivers' titles",
      note: 'World championships won, value labels on the bars.',
      source: 'FIA, 1950–2024',
      config: {
        type: bar,
        ...common,
        data: {
          labels: [
            'Schumacher',
            'Hamilton',
            'Fangio',
            'Prost',
            'Vettel',
            'Verstappen',
            'Senna',
            'Lauda',
            'Piquet',
            'Stewart',
            'Brabham',
          ],
          series: [{ name: 'Titles', values: [7, 7, 5, 4, 4, 4, 3, 3, 3, 3, 3] }],
        },
        y: { ticks: 4 },
        valueLabels: true,
      },
      style: { '--tc-color-1': C.red },
    },
    {
      title: 'Grand Slam singles titles',
      note: "Men's titles by tournament, stacked: Nadal's Roland Garros block, Federer's Wimbledon block.",
      source: 'ATP, through 2024',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.5,
        orientation: 'horizontal',
        stacked: true,
        data: {
          labels: ['Djokovic', 'Nadal', 'Federer', 'Sampras', 'Emerson', 'Laver', 'Borg'],
          series: [
            { name: 'Australian Open', values: [10, 2, 6, 2, 6, 3, 0], color: C.blue },
            { name: 'Roland Garros', values: [3, 14, 1, 0, 2, 2, 6], color: C.orange },
            { name: 'Wimbledon', values: [7, 2, 8, 7, 2, 4, 5], color: C.green },
            { name: 'US Open', values: [4, 4, 5, 5, 2, 2, 0], color: C.indigo },
          ],
        },
        valueLabels: true,
      },
    },
    {
      title: 'Premier League 2023–24',
      note: 'Final points of the top eight, with the 40-point "safety" mark far below as a reference line.',
      source: 'Premier League, 2024',
      config: {
        type: bar,
        ...common,
        data: {
          labels: [
            'Man City',
            'Arsenal',
            'Liverpool',
            'Aston Villa',
            'Tottenham',
            'Chelsea',
            'Newcastle',
            'Man United',
          ],
          series: [{ name: 'Points', values: [91, 89, 82, 68, 66, 63, 60, 60] }],
        },
        y: { zero: true },
        annotations: [{ y: 40, label: 'Safety', color: C.gray }],
        valueLabels: true,
      },
      style: { '--tc-color-1': '#3d195b' },
    },
    {
      title: "Magnus Carlsen's rating",
      note: 'FIDE rating each January; the all-time peak of 2882 (May 2014) as a reference line.',
      source: 'FIDE rating lists, 2010–2024',
      config: {
        type: line,
        ...common,
        data: {
          labels: [
            '2010',
            '2011',
            '2012',
            '2013',
            '2014',
            '2015',
            '2016',
            '2017',
            '2018',
            '2019',
            '2020',
            '2021',
            '2022',
            '2023',
            '2024',
          ],
          series: [
            {
              name: 'Rating',
              values: [
                2810, 2814, 2835, 2861, 2872, 2862, 2844, 2840, 2834, 2835, 2872, 2862, 2865, 2859,
                2830,
              ],
            },
          ],
        },
        points: 'all',
        pointRadius: 3,
        y: { min: 2780, max: 2900, format: { useGrouping: false } },
        annotations: [{ y: 2882, label: 'Peak 2882', color: C.yellow }],
      },
    },
    {
      title: 'Athletes at the Summer Olympics',
      note: 'Competitors per Games, from 241 in Athens to over ten thousand; a gradient area.',
      source: 'International Olympic Committee, 1896–2024',
      config: {
        type: area,
        ...common,
        data: {
          labels: ['1896', '1912', '1936', '1960', '1976', '1992', '2008', '2016', '2024'],
          series: [
            { name: 'Athletes', values: [241, 2407, 3963, 5338, 6084, 9356, 10942, 11238, 10714] },
          ],
        },
        points: 'all',
        y: { format: { notation: 'compact' } },
      },
    },
    {
      kind: 'tiles',
      title: 'World Chess Championship 2018',
      note: 'Carlsen vs. Caruana as a tristate sparkline: twelve draws, then three rapid tiebreak wins.',
      source: 'FIDE, London 2018',
      tiles: [
        {
          name: 'Carlsen – Caruana, game results',
          value: '3–0 after 12 draws',
          config: {
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
            variant: 'tristate',
            labels: [
              'G1',
              'G2',
              'G3',
              'G4',
              'G5',
              'G6',
              'G7',
              'G8',
              'G9',
              'G10',
              'G11',
              'G12',
              'TB1',
              'TB2',
              'TB3',
            ],
          },
        },
        {
          name: 'Poland at Euro 2024',
          value: 'L L D',
          config: {
            data: [-1, -1, 0],
            variant: 'tristate',
            labels: ['Netherlands', 'Austria', 'France'],
          },
        },
        {
          name: 'Iga Świątek, 2024 Grand Slams',
          value: 'R3 · W · R3 · QF',
          config: {
            data: [3, 7, 3, 5],
            variant: 'bar',
            labels: ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'],
            format: (v: number) => ['', 'R1', 'R2', 'R3', 'R4', 'QF', 'SF', 'W'][v] ?? '',
          },
        },
      ],
    },
  ],
}
