import { area, bar, donut, type Label, pie, scatter } from '@tabler/charts'
import { C, common, type Group, span } from './types.ts'

export const science: Group = {
  id: 'science',
  name: 'Science & space',
  description:
    'Planets, launches, mountains and sunspots: log-log bubbles, truncated axes for close values, an 11-year cycle.',
  items: [
    {
      title: 'The planets',
      note: 'Distance from the Sun against mass, both on log axes, bubbles sized by radius: the rocky four and the giant four.',
      source: 'NASA Planetary Fact Sheet',
      span: 2,
      config: {
        type: scatter,
        ...common,
        aspectRatio: 2.4,
        data: {
          series: [
            {
              name: 'Rocky planets',
              points: [
                { x: 0.39, y: 0.055, size: 2440, label: 'Mercury' },
                { x: 0.72, y: 0.815, size: 6052, label: 'Venus' },
                { x: 1.0, y: 1.0, size: 6371, label: 'Earth' },
                { x: 1.52, y: 0.107, size: 3390, label: 'Mars' },
              ],
            },
            {
              name: 'Giant planets',
              points: [
                { x: 5.2, y: 317.8, size: 69911, label: 'Jupiter' },
                { x: 9.58, y: 95.2, size: 58232, label: 'Saturn' },
                { x: 19.2, y: 14.5, size: 25362, label: 'Uranus' },
                { x: 30.1, y: 17.1, size: 24622, label: 'Neptune' },
              ],
            },
          ],
        },
        x: { scale: 'log', format: (v: number) => `${v} AU` },
        y: { scale: 'log', format: (v: number) => `${v}× Earth` },
        size: { min: 5, max: 36 },
      },
    },
    {
      title: 'Orbital launch attempts',
      note: 'Rockets launched toward orbit per year; the last few years more than double the long-time average.',
      source: 'Jonathan McDowell, General Catalog of Artificial Space Objects, 2000–2024',
      config: {
        type: bar,
        ...common,
        data: {
          labels: span(2000, 2024).map(String),
          series: [
            {
              name: 'Launches',
              values: [
                85, 59, 65, 63, 55, 55, 66, 68, 69, 78, 74, 84, 78, 81, 92, 87, 85, 91, 114, 102,
                114, 146, 186, 223, 263,
              ],
            },
          ],
        },
        maxBarWidth: 14,
        x: { format: (l: Label, i: number) => (i % 4 === 0 ? String(l) : '') },
      },
      style: { '--tc-color-1': C.indigo },
    },
    {
      title: 'The 8,000-metre peaks',
      note: 'Ten highest mountains; the value axis starts at 7,500 m so the 750 m between them is visible.',
      source: 'Survey of Nepal and China joint measurement (Everest, 2020) and standard references',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Everest',
            'K2',
            'Kangchenjunga',
            'Lhotse',
            'Makalu',
            'Cho Oyu',
            'Dhaulagiri I',
            'Manaslu',
            'Nanga Parbat',
            'Annapurna I',
          ],
          series: [
            {
              name: 'Elevation',
              values: [8849, 8611, 8586, 8516, 8485, 8188, 8167, 8163, 8126, 8091],
            },
          ],
        },
        y: { min: 7500, max: 9000, format: (v: number) => `${v.toLocaleString('en-US')} m` },
        valueLabels: { format: (v: number) => `${v.toLocaleString('en-US')} m` },
      },
      style: { '--tc-color-1': C.gray },
    },
    {
      title: 'Longest rivers',
      note: 'Length in kilometres; the Nile and Amazon keep trading first place depending on the measurement.',
      source: 'Standard geographic references',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Nile',
            'Amazon',
            'Yangtze',
            'Mississippi–Missouri',
            'Yenisei',
            'Yellow River',
            'Ob',
            'Paraná',
            'Congo',
            'Amur',
          ],
          series: [
            {
              name: 'Length',
              values: [6650, 6400, 6300, 6275, 5539, 5464, 5410, 4880, 4700, 4444],
            },
          ],
        },
        y: { format: (v: number) => `${v.toLocaleString('en-US')} km` },
      },
      style: { '--tc-color-1': C.blue },
    },
    {
      title: 'Speed of sound',
      note: 'How fast sound travels through different materials, in metres per second.',
      source: 'CRC Handbook of Chemistry and Physics',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Air (20 °C)',
            'Helium',
            'Water',
            'Ice',
            'Wood (oak)',
            'Glass',
            'Steel',
            'Aluminium',
            'Diamond',
          ],
          series: [
            { name: 'Speed', values: [343, 1007, 1480, 3800, 3850, 4540, 5960, 6320, 12000] },
          ],
        },
        y: { format: (v: number) => `${v.toLocaleString('en-US')} m/s` },
      },
      style: { '--tc-color-1': C.teal },
    },
    {
      title: "Earth's atmosphere",
      note: 'Dry air by volume: two gases are 99% of it, the trace gases sit in the legend with their tiny slices.',
      source: 'NOAA / NASA',
      config: {
        type: donut,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'Nitrogen', value: 78.08 },
          { name: 'Oxygen', value: 20.95 },
          { name: 'Argon', value: 0.93 },
          { name: 'Carbon dioxide', value: 0.042 },
          { name: 'Other trace gases', value: 0.003 },
        ],
        format: (v: number) => `${v}%`,
        center: { value: '99%', label: 'N₂ + O₂' },
      },
    },
    {
      title: 'Sunspot cycle',
      note: 'Yearly mean sunspot number across solar cycles 23, 24 and 25: the eleven-year rhythm as an area.',
      source: 'SILSO, Royal Observatory of Belgium, 1996–2024',
      span: 2,
      config: {
        type: area,
        ...common,
        aspectRatio: 2.6,
        data: {
          labels: span(1996, 2024).map(String),
          series: [
            {
              name: 'Sunspot number',
              values: [
                11.6, 28.9, 88.3, 136.3, 173.9, 170.4, 163.6, 99.3, 65.3, 45.8, 24.7, 12.6, 4.2,
                4.8, 24.9, 80.8, 84.5, 94.0, 113.3, 69.8, 39.8, 21.7, 7.0, 3.6, 8.8, 29.6, 83.2,
                125.5, 154.7,
              ],
            },
          ],
        },
        x: { format: (l: Label, i: number) => (i % 4 === 0 ? String(l) : '') },
        annotations: [
          { x: ['1996', '2008'], label: 'Cycle 23' },
          { x: ['2008', '2019'], label: 'Cycle 24' },
          { x: ['2019', '2024'], label: 'Cycle 25' },
        ],
      },
      style: { '--tc-color-1': C.orange },
    },
    {
      title: 'Largest earthquakes',
      note: 'Moment magnitude of the ten strongest recorded quakes; the axis starts at 8 because each step is 32× the energy.',
      source: 'US Geological Survey',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Valdivia 1960',
            'Alaska 1964',
            'Sumatra 2004',
            'Tōhoku 2011',
            'Kamchatka 1952',
            'Chile 2010',
            'Ecuador 1906',
            'Rat Islands 1965',
            'Assam–Tibet 1950',
            'Sumatra 2012',
          ],
          series: [
            { name: 'Magnitude', values: [9.5, 9.2, 9.1, 9.1, 9.0, 8.8, 8.8, 8.7, 8.6, 8.6] },
          ],
        },
        y: { min: 8, max: 10, format: { minimumFractionDigits: 1 } },
        valueLabels: { format: { minimumFractionDigits: 1 } },
      },
      style: { '--tc-color-1': C.red },
    },
    {
      title: "Earth's crust",
      note: 'Elements by mass: oxygen and silicon make three quarters of the rock under your feet.',
      source: 'CRC Handbook of Chemistry and Physics',
      config: {
        type: pie,
        ...common,
        aspectRatio: 1.6,
        data: [
          { name: 'Oxygen', value: 46.1 },
          { name: 'Silicon', value: 28.2 },
          { name: 'Aluminium', value: 8.2 },
          { name: 'Iron', value: 5.6 },
          { name: 'Calcium', value: 4.2 },
          { name: 'Sodium', value: 2.4 },
          { name: 'Magnesium', value: 2.3 },
          { name: 'Potassium', value: 2.1 },
          { name: 'Other', value: 0.9, color: C.muted },
        ],
        format: (v: number) => `${v}%`,
        valueLabels: true,
      },
    },
    {
      title: 'Nearest stars',
      note: 'Distance from the Sun in light-years for the closest star systems.',
      source: 'RECONS / Gaia',
      config: {
        type: bar,
        ...common,
        data: {
          labels: [
            'Proxima Centauri',
            'α Centauri A/B',
            "Barnard's Star",
            'Wolf 359',
            'Lalande 21185',
            'Sirius',
            'Luyten 726-8',
            'Ross 154',
          ],
          series: [{ name: 'Distance', values: [4.25, 4.37, 5.96, 7.86, 8.31, 8.6, 8.73, 9.7] }],
        },
        y: { format: (v: number) => `${v} ly` },
        x: { format: (l: Label) => String(l).replace(' Centauri', ' Cen') },
      },
      style: { '--tc-color-1': C.purple },
    },
  ],
}
