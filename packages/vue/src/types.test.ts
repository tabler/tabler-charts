/** The public types, checked by the compiler (`pnpm typecheck`). */
import type { Chart, ChartConfig, LineOptions } from '@tabler/charts'
import { describe, expectTypeOf, test } from 'vitest'
import type { Ref, ShallowRef } from 'vue'
import type { ChartEmits, ChartProps, LineChart, useChart } from './index.ts'

describe('public types', () => {
  test('a typed component takes the options of its chart type, without `type`', () => {
    type Props = InstanceType<typeof LineChart>['$props']
    expectTypeOf<Props['data']>().toEqualTypeOf<LineOptions['data']>()
    expectTypeOf<Props>().not.toHaveProperty('type')
    expectTypeOf<ChartProps<LineOptions>>().not.toHaveProperty('class')
    expectTypeOf<ChartProps<LineOptions>['type']>().toEqualTypeOf<
      ChartConfig<LineOptions>['type']
    >()
  })

  test('every chart event is emitted', () => {
    expectTypeOf<keyof ChartEmits>().toEqualTypeOf<'hover' | 'click' | 'legend-toggle' | 'render'>()
  })

  test('useChart returns the chart of its config', () => {
    type Use = typeof useChart<LineOptions>
    expectTypeOf<ReturnType<Use>>().toEqualTypeOf<ShallowRef<Chart<LineOptions> | null>>()
    expectTypeOf<Parameters<Use>[0]>().toEqualTypeOf<Ref<HTMLElement | null | undefined>>()
  })
})
