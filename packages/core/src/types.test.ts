/**
 * The public types, checked by the compiler (`pnpm typecheck`): the
 * assertions cost nothing at run time, a wrong one does not compile.
 */
import { describe, expectTypeOf, test } from 'vitest'
import { type LineOptions, line } from './charts/line.ts'
import { type PieOptions, type PieSlice, pie } from './charts/pie.ts'
import type { Chart, ChartConfig, ChartEvents, ChartPlugin, ChartType } from './core.ts'
import { type Chart as DefaultChart, types } from './index.ts'

describe('public types', () => {
  test('a config takes the options of its chart type', () => {
    expectTypeOf<ChartConfig<PieOptions>['data']>().toEqualTypeOf<readonly PieSlice[]>()
    // A config takes a chart type of its options, whatever the type's chart model.
    expectTypeOf<ChartConfig<LineOptions>['type']>().toEqualTypeOf<ChartType<LineOptions, object>>()
    expectTypeOf(line).toExtend<ChartConfig<LineOptions>['type']>()
    expectTypeOf({ type: pie, data: [{ name: 'A', value: 1 }] }).toExtend<ChartConfig<PieOptions>>()

    // @ts-expect-error `data` is required.
    const missing: ChartConfig<LineOptions> = { type: line }
    // @ts-expect-error The data of a pie chart is not the data of a line chart.
    const mixed: ChartConfig<LineOptions> = { type: line, data: [{ name: 'A', value: 1 }] }
    // @ts-expect-error A chart type only takes its own options.
    const wrong: ChartConfig<LineOptions> = { type: pie, data: { series: [] } }
    void [missing, mixed, wrong]
  })

  test('a chart keeps the options it was created with', () => {
    expectTypeOf<Chart<LineOptions>['config']>().toEqualTypeOf<ChartConfig<LineOptions>>()
    expectTypeOf<Chart<LineOptions>['setData']>().parameter(0).toEqualTypeOf<LineOptions['data']>()
    expectTypeOf<Chart<PieOptions>['setData']>().parameter(0).toEqualTypeOf<readonly PieSlice[]>()
    expectTypeOf<Chart<LineOptions>['update']>()
      .parameter(0)
      .toEqualTypeOf<Partial<ChartConfig<LineOptions>>>()
    expectTypeOf<Chart<LineOptions>['element']>().toEqualTypeOf<HTMLElement>()
  })

  test('any chart is a Chart<object>, as plugins and registries take it', () => {
    expectTypeOf<Chart<LineOptions>>().toExtend<Chart<object>>()
    expectTypeOf<DefaultChart<PieOptions>>().toExtend<Chart<object>>()
    expectTypeOf<ChartPlugin['install']>().parameter(0).toEqualTypeOf<Chart<object>>()
  })

  test('handlers get the event they subscribed to', () => {
    const subscribe = (chart: Chart): void => {
      chart.on('click', (event) => expectTypeOf(event).toEqualTypeOf<ChartEvents['click']>())
      chart.on('hover', (event) =>
        expectTypeOf(event.hit).toEqualTypeOf<ChartEvents['hover']['hit']>(),
      )
      chart.emit('render', { size: { width: 1, height: 1 } })
      // @ts-expect-error Not an event.
      chart.on('missing', () => {})
      // @ts-expect-error A `render` event has a size, not a hit.
      chart.emit('render', { hit: null })
    }
    expectTypeOf(subscribe).returns.toBeVoid()
  })

  test('the registry of types is read by name', () => {
    expectTypeOf(types.line).toEqualTypeOf<ChartType<never> | undefined>()
  })
})
