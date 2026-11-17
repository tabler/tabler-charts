import { area, bar, heatmap, type Label } from '@tabler/charts'
import { C, common, type Group, years } from './types.ts'

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')
const FREQ = {
  English: [
    8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4, 6.7, 7.5, 1.9, 0.1, 6.0,
    6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.07,
  ],
  German: [
    6.5, 1.9, 2.7, 5.1, 16.4, 1.7, 3.0, 4.8, 6.6, 0.27, 1.4, 3.4, 2.5, 9.8, 2.6, 0.67, 0.02, 7.0,
    7.3, 6.2, 4.2, 0.85, 1.9, 0.03, 0.04, 1.1,
  ],
  Spanish: [
    11.5, 2.2, 4.0, 5.0, 12.2, 0.7, 1.8, 0.7, 6.2, 0.5, 0.01, 5.0, 3.2, 6.7, 8.7, 2.5, 0.9, 6.9,
    7.9, 4.6, 2.9, 1.1, 0.02, 0.2, 1.0, 0.5,
  ],
  Polish: [
    8.9, 1.5, 4.0, 3.3, 7.7, 0.3, 1.4, 1.1, 8.2, 2.3, 3.5, 2.1, 2.8, 5.5, 7.8, 3.1, 0, 4.7, 4.3,
    4.0, 2.5, 0, 4.7, 0, 3.8, 5.6,
  ],
}

export const culture: Group = {
  id: 'culture',
  name: 'Culture & media',
  description:
    'Box office, music formats and bestsellers: wide rankings, a stacked area of a changing industry, a 26-column heatmap.',
  items: [
    {
      title: 'Highest-grossing films',
      note: 'Worldwide box office, not adjusted for inflation, in billions of dollars.',
      source: 'Box Office Mojo, through 2024',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Avatar',
            'Avengers: Endgame',
            'Avatar: The Way of Water',
            'Titanic',
            'Star Wars: The Force Awakens',
            'Avengers: Infinity War',
            'Spider-Man: No Way Home',
            'Inside Out 2',
            'Jurassic World',
            'The Lion King (2019)',
          ],
          series: [
            {
              name: 'Gross',
              values: [
                2.92e9, 2.8e9, 2.32e9, 2.26e9, 2.07e9, 2.05e9, 1.92e9, 1.7e9, 1.67e9, 1.66e9,
              ],
            },
          ],
        },
        y: {
          format: {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 2,
          },
        },
      },
      style: { '--tc-color-1': C.purple },
    },
    {
      title: 'US recorded music revenue by format',
      note: 'Nominal revenue in billions as stacked areas on a time axis: the CD peak, the download blip, the streaming era.',
      source: 'RIAA US Sales Database, 1983–2023',
      span: 2,
      config: {
        type: area,
        ...common,
        aspectRatio: 2.6,
        data: {
          labels: years([1983, 1990, 1999, 2005, 2010, 2015, 2020, 2023]),
          series: [
            { name: 'Vinyl', values: [1.7, 0.1, 0.03, 0.03, 0.09, 0.42, 0.63, 1.4], color: C.gray },
            { name: 'Cassette', values: [1.8, 3.5, 1.1, 0.01, 0, 0, 0, 0], color: C.orange },
            { name: 'CD', values: [0.02, 3.5, 12.8, 10.5, 3.4, 1.5, 0.48, 0.54], color: C.blue },
            { name: 'Downloads', values: [0, 0, 0, 0.4, 2.3, 2.3, 0.67, 0.43], color: C.purple },
            { name: 'Streaming', values: [0, 0, 0, 0, 0.4, 2.3, 10.1, 14.4], color: C.green },
          ],
        },
        x: { type: 'time', utc: true },
        stacked: true,
        curve: 'linear',
        y: { format: { style: 'currency', currency: 'USD', notation: 'compact' } },
      },
    },
    {
      title: 'Best-selling books',
      note: 'Estimated copies sold of single-volume books, in millions; estimates, so the bars are rounded.',
      source: "Publishers' estimates compiled by Wikipedia, 2024",
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Don Quixote',
            'A Tale of Two Cities',
            'The Lord of the Rings',
            'The Little Prince',
            "Harry Potter and the Philosopher's Stone",
            'The Hobbit',
            'Dream of the Red Chamber',
            'And Then There Were None',
            "Alice's Adventures in Wonderland",
            'The Lion, the Witch and the Wardrobe',
          ],
          series: [{ name: 'Copies', values: [500, 200, 150, 140, 120, 100, 100, 100, 100, 85] }],
        },
        y: { format: (v: number) => `${v}M` },
      },
      style: { '--tc-color-1': C.orange },
    },
    {
      title: 'Best-selling game consoles',
      note: "Units sold over each console's lifetime, in millions.",
      source: "Manufacturers' reports, through 2024",
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'PlayStation 2',
            'Nintendo DS',
            'Nintendo Switch',
            'Game Boy',
            'PlayStation 4',
            'PlayStation',
            'Wii',
            'PlayStation 3',
            'Xbox 360',
            'Game Boy Advance',
          ],
          series: [
            { name: 'Units', values: [160, 154, 146, 118.7, 117.2, 102.5, 101.6, 87.4, 84, 81.5] },
          ],
        },
        y: { format: (v: number) => `${v}M` },
      },
      style: { '--tc-color-1': C.indigo },
    },
    {
      title: 'Eurovision wins',
      note: 'Countries with three or more victories; two share the lead.',
      source: 'European Broadcasting Union, 1956–2025',
      config: {
        type: bar,
        ...common,
        data: {
          labels: [
            'Ireland',
            'Sweden',
            'France',
            'Luxembourg',
            'Netherlands',
            'United Kingdom',
            'Israel',
            'Italy',
            'Norway',
            'Denmark',
            'Ukraine',
            'Switzerland',
            'Austria',
          ],
          series: [{ name: 'Wins', values: [7, 7, 5, 5, 5, 5, 4, 3, 3, 3, 3, 3, 3] }],
        },
        maxBarWidth: 18,
        y: { ticks: 4 },
        valueLabels: true,
        x: {
          format: (l: Label) =>
            String(l)
              .replace('United Kingdom', 'UK')
              .replace('Netherlands', 'NL')
              .replace('Luxembourg', 'LUX')
              .replace('Switzerland', 'SUI'),
        },
      },
      style: { '--tc-color-1': C.pink },
    },
    {
      title: 'Most-visited museums',
      note: "Visitors in 2023, in millions; the Louvre alone outdraws most countries' entire museum sectors.",
      source: 'The Art Newspaper visitor survey, 2023',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Louvre, Paris',
            'Vatican Museums',
            'British Museum',
            'Natural History Museum, London',
            'Metropolitan Museum, New York',
            'Tate Modern',
            'National Museum of Korea',
            "Musée d'Orsay",
            'Centre Pompidou',
            'National Gallery, London',
          ],
          series: [
            { name: 'Visitors', values: [8.9, 6.8, 5.8, 5.7, 5.4, 4.7, 4.2, 3.9, 3.2, 3.1] },
          ],
        },
        y: { format: (v: number) => `${v}M` },
      },
      style: { '--tc-color-1': C.yellow },
    },
    {
      title: 'Letter frequency in four languages',
      note: 'Share of each letter in running text, a 26-column heatmap; Polish diacritics are folded into their base letters, q, v and x hardly occur.',
      source: 'Corpus letter frequencies (Wikipedia, "Letter frequency")',
      span: 2,
      config: {
        type: heatmap,
        ...common,
        aspectRatio: 3.4,
        data: {
          labels: LETTERS,
          series: Object.entries(FREQ).map(([name, values]) => ({ name, values })),
        },
        max: 13,
        gap: 1,
        radius: 2,
        format: (v: number) => `${v}%`,
      },
    },
    {
      title: 'Most-streamed songs',
      note: 'Streams on one platform in billions, early 2025; the gaps between the top ten are small.',
      source: 'Spotify, January 2025',
      config: {
        type: bar,
        ...common,
        aspectRatio: 1.3,
        orientation: 'horizontal',
        data: {
          labels: [
            'Blinding Lights',
            'Shape of You',
            'Someone You Loved',
            'As It Was',
            'Sunflower',
            'Starboy',
            'Sweater Weather',
            'One Dance',
            'Stay',
            'Believer',
          ],
          series: [{ name: 'Streams', values: [4.7, 4.3, 3.9, 3.9, 3.7, 3.6, 3.5, 3.4, 3.3, 3.3] }],
        },
        y: { min: 0, format: (v: number) => `${v}B` },
        valueLabels: { format: (v: number) => `${v}B` },
      },
      style: { '--tc-color-1': '#1db954' },
    },
  ],
}
