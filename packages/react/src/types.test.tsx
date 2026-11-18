/** The public types, checked by the compiler (`pnpm typecheck`). */
import type { Chart, ChartEvents, LineOptions, PieOptions } from '@tabler/charts'
import type { ComponentProps } from 'react'
import { describe, expectTypeOf, test } from 'vitest'
import {
  LineChart,
  type PieChart,
  type TablerChart,
  type UseChart,
  type useChart,
} from './index.ts'

describe('public types', () => {
  test('a typed component takes the options of its chart type, without `type`', () => {
    type Props = ComponentProps<typeof LineChart>
    expectTypeOf<Props['data']>().toEqualTypeOf<LineOptions['data']>()
    expectTypeOf<Props>().not.toHaveProperty('type')
    expectTypeOf<ComponentProps<typeof PieChart>['data']>().toEqualTypeOf<PieOptions['data']>()
    expectTypeOf<ComponentProps<typeof TablerChart>>().toHaveProperty('type')

    // @ts-expect-error `data` is required.
    const missing = <LineChart />
    // @ts-expect-error The data of a pie chart is not the data of a line chart.
    const mixed = <LineChart data={[{ name: 'A', value: 1 }]} />
    void [missing, mixed]
  })

  test('event props and the ref carry the chart types', () => {
    type Props = ComponentProps<typeof LineChart>
    expectTypeOf<NonNullable<Props['onClick']>>().parameter(0).toEqualTypeOf<ChartEvents['click']>()
    expectTypeOf<NonNullable<Props['onLegendToggle']>>()
      .parameter(0)
      .toEqualTypeOf<ChartEvents['legend-toggle']>()
    expectTypeOf<Props['ref']>().toExtend<React.Ref<Chart<LineOptions> | null> | undefined>()
  })

  test('useChart returns the chart of its config', () => {
    expectTypeOf<ReturnType<typeof useChart<LineOptions>>>().toEqualTypeOf<UseChart<LineOptions>>()
    expectTypeOf<UseChart<LineOptions>['chart']>().toEqualTypeOf<Chart<LineOptions> | null>()
    expectTypeOf<UseChart<LineOptions>['ref']>().parameter(0).toEqualTypeOf<HTMLElement | null>()
  })
})
