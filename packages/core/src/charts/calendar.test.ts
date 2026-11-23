import { describe, expect, test } from 'vitest'
import { buildChart, type ChartConfig, chartToString, resolveSize } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import { chartInteraction, findByClass, renderOf, tableOf } from '../test-utils.ts'
import { h } from '../vnode.ts'
import { type CalendarOptions, calendar } from './calendar.ts'

const size = { width: 400, height: 160 }
// Monday 5 October to Sunday 18 October 2026: two full weeks.
const base: ChartConfig<CalendarOptions> = {
  type: calendar,
  id: 'c',
  locale: 'en-US',
  utc: true,
  data: {
    series: [
      {
        name: 'Commits',
        values: [
          { date: '2026-10-05', value: 0 },
          { date: '2026-10-06', value: 5 },
          { date: '2026-10-07', value: 10 },
          { date: '2026-10-18', value: null },
        ],
      },
      {
        name: 'Reviews',
        values: [
          { date: '2026-10-06', value: 2 },
          { date: '2026-10-06', value: 1 },
        ],
      },
    ],
  },
}

const render = (config: Partial<ChartConfig<CalendarOptions>> = {}) =>
  buildChart({ ...base, ...config }, size, 'c')

const interactionOf = (config: Partial<ChartConfig<CalendarOptions>> = {}): Interaction =>
  chartInteraction({ ...base, ...config }, size, 'c')

const cells = (node: ReturnType<typeof render>) =>
  findByClass(findByClass(node, 'tc-calendar-cells')[0] ?? node, 'tc-cell')

describe('calendar', () => {
  test('draws one keyed cell per day of the data range, rows by weekday', () => {
    const node = render()
    expect(node.attrs.class).toBe('tc-chart tc-chart-calendar')
    const days = cells(node)
    expect(days).toHaveLength(14)
    // Monday on the first row, Sunday on the last; the second week one column right.
    expect(days[0]?.attrs.y).toBe(days[7]?.attrs.y)
    expect(Number(days[7]?.attrs.x)).toBeGreaterThan(Number(days[0]?.attrs.x))
    expect(Number(days[6]?.attrs.y)).toBeGreaterThan(Number(days[0]?.attrs.y))
    expect(days[0]?.attrs.width).toBe(days[0]?.attrs.height)
    // The day with only a null value is drawn empty; days without data too.
    expect(findByClass(node, 'tc-cell-empty')).toHaveLength(11)
  })

  test('shades days in levels from empty to the full color, series added up', () => {
    // 0 → empty, 5 + 3 = 8 of 10 → level 4 of 4, 10 → full.
    const shades = cells(render()).map((c) => c.attrs.style ?? null)
    expect(shades.slice(0, 3)).toEqual(['--tc-heat:0%', '--tc-heat:100%', '--tc-heat:100%'])
    expect(cells(render({ max: 20 }))[2]?.attrs.style).toBe('--tc-heat:50%')
    expect(cells(render({ levels: 10, max: 20 }))[1]?.attrs.style).toBe('--tc-heat:40%')
  })

  test('hides a series from the legend and leaves its values out of the shade', () => {
    const { content, interaction } = renderOf(base, size, { hidden: new Set(['Reviews']) })
    const node = h('g', null, content)
    const hit = interaction?.hitIndex(1)
    expect(hit?.items.map((i) => i.name)).toEqual(['Commits'])
    // 5 of 10 → level 2 of 4; with Reviews shown it was 8 of 10 → level 4.
    expect(findByClass(node, 'tc-cell')[1]?.attrs.style).toBe('--tc-heat:50%')
    expect(
      interactionOf()
        .hitIndex(1)
        ?.items.map((i) => `${i.name} ${i.text}`),
    ).toEqual(['Commits 5', 'Reviews 3'])
  })

  test('names the weekdays on the left and the months on top', () => {
    // Tall enough for every weekday (short rows keep every other name).
    const node = buildChart(base, { width: 400, height: 260 }, 'c')
    const labels = (cls: string) =>
      findByClass(findByClass(node, cls)[0] ?? node, 'tc-tick-label').map((t) =>
        t.children.join(''),
      )
    expect(labels('tc-axis-left')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(
      findByClass(findByClass(render(), 'tc-axis-left')[0] ?? render(), 'tc-tick-label').map((t) =>
        t.children.join(''),
      ),
    ).toEqual(['Mon', 'Wed', 'Fri', 'Sun'])
    expect(labels('tc-axis-top')).toEqual(['Oct'])
    expect(labels('tc-calendar-scale')).toEqual(['Less', 'More'])
    const sunday = render({ weekStart: 0 })
    expect(
      findByClass(findByClass(sunday, 'tc-axis-left')[0] ?? sunday, 'tc-tick-label')[0]?.children,
    ).toEqual(['Sun'])
    const bare = render({ x: { show: false }, y: { show: false }, scale: false })
    expect(findByClass(bare, 'tc-axis')).toEqual([])
    expect(findByClass(bare, 'tc-calendar-scale')).toEqual([])
  })

  test('a weeks window ends with the week of the last day', () => {
    const node = render({ weeks: 4 })
    // Four columns of seven, from Monday 21 September; days before the data stay blank.
    const days = cells(node)
    expect(days).toHaveLength(28)
    expect(days[0]?.key).toBe((days[14]?.key as number) - 14)
    // The window ends at `to` (a Wednesday): the rest of its week stays blank.
    const to = render({ weeks: 2, to: '2026-10-07' })
    expect(cells(to)).toHaveLength(10)
    expect(cells(to)[9]?.key).toBe(days[16]?.key)
  })

  test('hit testing finds the day under the pointer', () => {
    const interaction = interactionOf()
    expect(interaction.count).toBe(14)
    const days = cells(render())
    const center = (i: number) => {
      const c = days[i]
      return [
        Number(c?.attrs.x) + Number(c?.attrs.width) / 2,
        Number(c?.attrs.y) + Number(c?.attrs.height) / 2,
      ] as const
    }
    const hit = interaction.hitTest(...center(1))
    expect(hit?.index).toBe(1)
    expect(hit?.label).toBe('2026-10-06')
    expect(hit?.title).toBe('Oct 6, 2026')
    expect(hit?.items.map((i) => i.text)).toEqual(['5', '3'])
    expect(hit?.mark?.d).toMatch(/^M.*Z$/)
    // Keyboard: a day with a series picked; a day without data lists dashes.
    expect(interaction.hitIndex(8, 1)?.seriesIndex).toBe(1)
    expect(interaction.hitIndex(8)?.items.map((i) => i.text)).toEqual(['–', '–'])
    expect(interaction.hitTest(0, 0)).toBeNull()
    expect(interaction.hitIndex(14)).toBeNull()
  })

  test('lists the days with data as a table', () => {
    const table = tableOf(base, 100)
    expect(table?.columns).toEqual(['', 'Commits', 'Reviews'])
    expect(table?.rows).toEqual([
      ['Oct 5, 2026', '0', '–'],
      ['Oct 6, 2026', '5', '3'],
      ['Oct 7, 2026', '10', '–'],
      ['Oct 18, 2026', '–', '–'],
    ])
    expect(tableOf(base, 1)?.total).toBe(4)
  })

  test('takes a plain list of days, with no legend', () => {
    const config = { ...base, data: [{ date: '2026-10-05', value: 1 }] }
    expect(calendar.legend?.(config)).toEqual([])
    expect(cells(render(config))).toHaveLength(1)
    expect(calendar.legend?.(base).map((i) => i.name)).toEqual(['Commits', 'Reviews'])
  })

  test('more than a year is split into bands of twelve months, named by their years', () => {
    // April 2024 to March 2026: two fiscal years.
    const config = { data: [], from: '2024-04-01', to: '2026-03-31' }
    const node = buildChart({ ...base, ...config }, { width: 800, height: 300 }, 'c')
    expect(cells(node)).toHaveLength(730)
    const bands = findByClass(node, 'tc-calendar-band')
    expect(bands).toHaveLength(2)
    expect(findByClass(node, 'tc-calendar-year').map((t) => t.children.join(''))).toEqual([
      '2024–25',
      '2025–26',
    ])
    // Both bands start in April, each with its own month and weekday names.
    for (const band of bands) {
      const months = findByClass(findByClass(band, 'tc-axis-top')[0] ?? band, 'tc-tick-label')
      expect(months[0]?.children).toEqual(['Apr'])
      expect(findByClass(band, 'tc-axis-left')).toHaveLength(1)
    }
    // The second band is drawn below the first, from the left again.
    const days = cells(node)
    expect(Number(days[365]?.attrs.y)).toBeGreaterThan(Number(days[364]?.attrs.y))
    expect(Number(days[365]?.attrs.x)).toBeLessThan(Number(days[364]?.attrs.x))
    // Hit testing and the keyboard reach the second band.
    const interaction = interactionOf(config)
    expect(interaction.hitIndex(365)?.label).toBe('2025-04-01')
    // A year or less is one band, without a year name.
    const year = render({ data: [], from: '2026-01-01', to: '2026-12-31' })
    expect(findByClass(year, 'tc-calendar-band')).toHaveLength(1)
    expect(findByClass(year, 'tc-calendar-year')).toEqual([])
    // So are 53 weeks, the last year of a contribution graph.
    const weeks = render({ data: [], weeks: 53, to: '2026-10-25' })
    expect(cells(weeks)).toHaveLength(371)
    expect(findByClass(weeks, 'tc-calendar-band')).toHaveLength(1)
    expect(
      findByClass(render({ data: [], from: '2025-10-01', to: '2026-12-31' }), 'tc-calendar-band'),
    ).toHaveLength(2)
  })

  test('the proportions follow the range unless they are set', () => {
    const clean = (config: object) =>
      calendar.clean?.({ ...base, ...config } as never) as { aspectRatio?: number }
    // A year: a low strip of 53 columns.
    const year = clean({ data: [], from: '2026-01-01', to: '2026-12-31' })
    expect(year.aspectRatio).toBeCloseTo(5.37, 1)
    // Two bands are twice as tall; a few weeks are not taller than the usual chart.
    expect(clean({ data: [], from: '2025-01-01', to: '2026-12-31' }).aspectRatio).toBeCloseTo(
      2.8,
      1,
    )
    expect(clean({}).aspectRatio).toBe(2)
    // Your own ratio is kept; the one set here follows the range as it changes.
    expect(clean({ aspectRatio: 3 }).aspectRatio).toBe(3)
    expect(clean({ ...year, data: base.data, from: undefined, to: undefined }).aspectRatio).toBe(2)
    expect(clean({ data: [] }).aspectRatio).toBeUndefined()
  })

  test('a year on a phone keeps room for its days', () => {
    const year = { data: [], from: '2026-01-01', to: '2026-12-31' }
    const cleaned = (config: object) =>
      calendar.clean?.({ ...base, ...year, ...config } as never) as ChartConfig<CalendarOptions>
    // Wide, the height follows the ratio.
    expect(resolveSize(cleaned({}), { width: 1074 }).height).toBe(200)
    // Narrow, the names and the scale keep their size: taller than the ratio's 54.
    const phone = resolveSize(cleaned({}), { width: 290 })
    expect(phone.height).toBeGreaterThan(70)
    const days = cells(buildChart(cleaned({}), phone, 'c'))
    expect(days).toHaveLength(365)
    expect(days[0]?.attrs.width).toBeGreaterThan(3)
    // Your own proportions and height are kept.
    expect(resolveSize(cleaned({ aspectRatio: 5 }), { width: 290 }).height).toBe(58)
    expect(resolveSize(cleaned({ height: 60 }), { width: 290 }).height).toBe(60)
  })

  test('the keyboard walks the grid by weeks and days', () => {
    expect(interactionOf().rows).toBe(7)
  })

  test('colors shade through a scale; diverging centers two hues on zero', () => {
    const data = [
      { date: '2026-10-05', value: -10 },
      { date: '2026-10-06', value: -2 },
      { date: '2026-10-07', value: 0 },
      { date: '2026-10-08', value: 5 },
    ]
    const fills = (config: Partial<ChartConfig<CalendarOptions>>) =>
      cells(render({ data, ...config })).map(
        (c) => String(c.attrs.style ?? '').match(/--tc-cell-fill:(.*)$/)?.[1],
      )
    // −10 … 10 around 0 in four steps: full blue, (−2 rounds to) neutral, neutral, half red.
    expect(fills({ colors: 'diverging' })).toEqual([
      'var(--tc-color-1)',
      'var(--tc-grid-color)',
      'var(--tc-grid-color)',
      'color-mix(in oklab,var(--tc-color-8) 50%,var(--tc-grid-color))',
    ])
    // The scale names its ends by their values, with one swatch per step.
    const node = render({ data, colors: 'diverging' })
    const scale = findByClass(node, 'tc-calendar-scale')[0] ?? node
    expect(findByClass(scale, 'tc-tick-label').map((t) => t.children.join(''))).toEqual([
      '-10',
      '10',
    ])
    expect(findByClass(scale, 'tc-cell')).toHaveLength(5)
    // A middle of your own, and ends of your own.
    expect(fills({ colors: 'diverging', mid: -10, max: 10 })[0]).toBe('var(--tc-grid-color)')
    expect(fills({ colors: 'diverging', min: -20 })[0]).toBe(
      'color-mix(in oklab,var(--tc-grid-color) 50%,var(--tc-color-1))',
    )
    // Your own colors run from min to max; one color alone is not a scale.
    expect(fills({ colors: ['white', 'black'], levels: 2 })).toEqual([
      'white',
      'color-mix(in oklab,black 50%,white)',
      'color-mix(in oklab,black 50%,white)',
      'black',
    ])
    expect(fills({ colors: ['red'] })[0]).toBeUndefined()
  })

  test('renders empty, junk and flat data without NaN', () => {
    for (const data of [
      [],
      { series: [] },
      { series: [{ name: 'A', values: [] }] },
      {
        series: [
          {
            name: 'A',
            values: [
              { date: 'never', value: 1 },
              { date: null, value: 2 },
            ],
          },
        ],
      },
      { series: [{ name: 'A', values: [{ date: '2026-01-01', value: 3 }] }] },
    ]) {
      const svg = chartToString({ ...base, data: data as CalendarOptions['data'] }, size)
      expect(svg).not.toContain('NaN')
    }
  })
})
