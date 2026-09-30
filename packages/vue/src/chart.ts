import {
  Chart,
  type ChartConfig,
  type ChartEvents,
  type ChartType,
  chartToString,
  resolveSize,
} from '@tabler/charts'
import {
  type DefineSetupFnComponent,
  defineComponent,
  h,
  type MaybeRefOrGetter,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  type Ref,
  type SetupContext,
  type ShallowRef,
  shallowRef,
  toRaw,
  toValue,
  useId,
  watch,
} from 'vue'

/** Chart events, emitted as `hover`, `click`, `legend-toggle` and `render`. */
export type ChartEmits = {
  hover: (event: ChartEvents['hover']) => void
  click: (event: ChartEvents['click']) => void
  'legend-toggle': (event: ChartEvents['legend-toggle']) => void
  render: (event: ChartEvents['render']) => void
}

/**
 * Props of a chart component: the chart config. `class` and `style` go to
 * the container `<div>` as usual in Vue.
 */
export type ChartProps<O extends object> = Omit<ChartConfig<O>, 'class'>

/** A chart component with its type fixed, such as `<LineChart>`. */
export type ChartComponent<O extends object> = DefineSetupFnComponent<
  Omit<ChartProps<O>, 'type'>,
  ChartEmits
>

const EVENTS = ['hover', 'click', 'legend-toggle', 'render'] as const

const camelize = (key: string): string => key.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

/** Whether two configs have the same values, key by key (not deep). */
function shallowEqual(a: object, b: object): boolean {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((key) =>
    Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}

/** A Vue `useId()` as a valid SVG id prefix. */
const idFrom = (vueId: string): string => `tc-${vueId.replace(/[^a-zA-Z0-9]/g, '')}`

function setup<O extends object>(fixedType: ChartType<O> | undefined) {
  return (props: Record<string, unknown>, { attrs, emit, expose }: SetupContext<ChartEmits>) => {
    // Ids from useId() match between the server and the client, so hydration lines up.
    const id = idFrom(useId() ?? '')
    const config = (): ChartConfig<O> => {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(attrs)) {
        // class and style belong to the container; listeners are Vue's.
        if (key === 'class' || key === 'style' || /^on[A-Z]/.test(key)) continue
        out[camelize(key)] = toRaw(value)
      }
      out.data = toRaw(props.data)
      out.type = fixedType ?? toRaw(props.type)
      out.id ??= id
      return out as ChartConfig<O>
    }

    // The server-rendered chart; the same string on every render, so Vue never
    // rewrites the container while the chart owns it.
    const initial = config()
    const html = chartToString(initial, resolveSize(initial))

    const element = shallowRef<HTMLElement | null>(null)
    const chart = shallowRef<Chart<O> | null>(null)
    let applied = initial

    const push = (force: boolean) => {
      const next = config()
      if (!chart.value || (!force && shallowEqual(applied, next))) return
      applied = next
      chart.value.update(next)
    }

    onMounted(() => {
      // The chart takes the server-rendered svg over in place.
      const created = new Chart(element.value as HTMLElement, config())
      applied = created.config
      for (const name of EVENTS) {
        created.on(name, (event) => (emit as (name: string, event: unknown) => void)(name, event))
      }
      chart.value = created
    })
    // Other options arrive as attributes: compare them after every update.
    onUpdated(() => push(false))
    // Data is watched deeply, so reactive arrays can be changed in place.
    watch(
      () => props.data,
      () => push(true),
      { deep: true },
    )
    onBeforeUnmount(() => {
      chart.value?.destroy()
      chart.value = null
    })

    expose({ chart })
    return () =>
      h('div', {
        ref: element,
        class: ['tc-container', attrs.class],
        ...(attrs.style ? { style: attrs.style } : {}),
        innerHTML: html,
      })
  }
}

/**
 * Any chart, with the type as a prop. Renders the SVG on the server and
 * takes it over in the browser. The template ref exposes `chart`.
 *
 * ```vue
 * <TablerChart :type="line" :data="data" :aspect-ratio="3" locale="en-US" @hover="onHover" />
 * ```
 */
export const TablerChart: DefineSetupFnComponent<
  ChartProps<object>,
  ChartEmits
> = /* @__PURE__ */ defineComponent(setup(undefined) as never, {
  name: 'TablerChart',
  inheritAttrs: false,
  props: ['type', 'data'],
  emits: [...EVENTS],
}) as never

/** A component for one chart type, e.g. `chartComponent(line, 'LineChart')`. */
export function chartComponent<O extends object>(
  type: ChartType<O>,
  name: string,
): ChartComponent<O> {
  return defineComponent(setup(type) as never, {
    name,
    inheritAttrs: false,
    props: ['data'],
    emits: [...EVENTS],
  }) as never
}

/**
 * Bind a chart to an element of your own: created when the element is
 * there, updated when the config changes (deeply), destroyed with the
 * component.
 *
 * ```ts
 * const el = ref<HTMLElement | null>(null)
 * const chart = useChart(el, () => ({ type: line, data: data.value }))
 * ```
 */
export function useChart<O extends object>(
  target: Ref<Element | null | undefined>,
  config: MaybeRefOrGetter<ChartConfig<O>>,
): ShallowRef<Chart<O> | null> {
  const chart = shallowRef<Chart<O> | null>(null)
  const read = () => toRaw(toValue(config))
  watch(
    target,
    (element) => {
      chart.value?.destroy()
      chart.value = element ? new Chart(element, read()) : null
    },
    { flush: 'post' },
  )
  onMounted(() => {
    if (!chart.value && target.value) chart.value = new Chart(target.value, read())
  })
  watch(
    () => toValue(config),
    () => chart.value?.update(read()),
    { deep: true },
  )
  onBeforeUnmount(() => {
    chart.value?.destroy()
    chart.value = null
  })
  return chart
}
