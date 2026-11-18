import {
  Chart,
  type ChartConfig,
  type ChartEvents,
  type ChartType,
  chartToString,
  resolveSize,
} from '@tabler/charts'
import {
  type CSSProperties,
  type ForwardedRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type PropsWithoutRef,
  type ReactElement,
  type RefAttributes,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

/** Chart events as React-style callback props. */
export interface ChartEventProps {
  onHover?: (event: ChartEvents['hover']) => void
  onClick?: (event: ChartEvents['click']) => void
  onLegendToggle?: (event: ChartEvents['legend-toggle']) => void
  onRender?: (event: ChartEvents['render']) => void
}

/** Props of `<TablerChart>`: the chart config, event callbacks and the container's class and style. */
export type ChartProps<O extends object> = ChartConfig<O> &
  ChartEventProps & {
    /** Classes on the container `<div>` (the svg takes `class`). */
    className?: string
    style?: CSSProperties
  }

/** A `<TablerChart>` with its type fixed, such as `<LineChart>`. */
export type ChartComponent<O extends object> = ForwardRefExoticComponent<
  PropsWithoutRef<Omit<ChartProps<O>, 'type'>> & RefAttributes<Chart<O> | null>
>

const EVENTS = {
  hover: 'onHover',
  click: 'onClick',
  'legend-toggle': 'onLegendToggle',
  render: 'onRender',
} as const satisfies Record<keyof ChartEvents, keyof ChartEventProps>

/** Whether two configs have the same values, key by key (not deep). */
function shallowEqual(a: object, b: object): boolean {
  const ka = Object.keys(a)
  if (ka.length !== Object.keys(b).length) return false
  return ka.every((key) =>
    Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}

export interface UseChart<O extends object> {
  /** Callback ref for the element the chart renders into. */
  ref: (element: HTMLElement | null) => void
  /** The chart, once the element mounted (`null` before and during SSR). */
  chart: Chart<O> | null
}

/**
 * Bind a chart to an element of your own. The chart is created when the
 * element mounts, updated when the config changes (compared key by key, so
 * keep `data` and nested options referentially stable between renders) and
 * destroyed on unmount.
 *
 * ```tsx
 * const { ref, chart } = useChart({ type: line, data })
 * return <div ref={ref} />
 * ```
 */
export function useChart<O extends object>(
  config: ChartConfig<O>,
  events: ChartEventProps = {},
): UseChart<O> {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [chart, setChart] = useState<Chart<O> | null>(null)
  // Latest values for the effects and event handlers, without re-subscribing.
  const latest = useRef({ config, events })
  latest.current = { config, events }
  const applied = useRef<ChartConfig<O> | null>(null)

  useEffect(() => {
    if (!element) return
    const created = new Chart(element, latest.current.config)
    applied.current = latest.current.config
    for (const [name, prop] of Object.entries(EVENTS) as [
      keyof ChartEvents,
      keyof ChartEventProps,
    ][]) {
      created.on(name, (event) => {
        ;(latest.current.events[prop] as ((e: unknown) => void) | undefined)?.(event)
      })
    }
    setChart(created)
    return () => {
      created.destroy()
      applied.current = null
      setChart(null)
    }
  }, [element])

  useEffect(() => {
    if (chart && applied.current && !shallowEqual(applied.current, config)) {
      applied.current = config
      chart.setConfig(config)
    }
  })

  return { ref: setElement, chart }
}

const subscribe = () => () => {}

/**
 * Whether this render is on the server or hydrates its markup (the server
 * snapshot), rather than a render in the browser alone.
 */
const useServerMarkup = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  )

/** A React `useId()` as a valid SVG id prefix (it may contain colons and other marks). */
const idFrom = (reactId: string): string => `tc-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`

function TablerChartImpl<O extends object>(
  props: ChartProps<O>,
  ref: ForwardedRef<Chart<O> | null>,
): ReactElement {
  const { onHover, onClick, onLegendToggle, onRender, className, style, ...options } = props
  // Ids from useId() match between the server and the client, so hydration lines up.
  const reactId = useId()
  const config = { ...options, id: options.id ?? idFrom(reactId) } as ChartConfig<O>
  // The server-rendered chart; kept as the same object, so React never rewrites the
  // container while the chart owns it. The client chart adopts this svg on mount.
  // In the browser alone there is nothing to match: the chart is built once, by the Chart.
  const server = useServerMarkup()
  const [html] = useState(() => ({
    __html: server ? chartToString(config, resolveSize(config)) : '',
  }))
  const { ref: attach, chart } = useChart(config, { onHover, onClick, onLegendToggle, onRender })
  useImperativeHandle<Chart<O> | null, Chart<O> | null>(ref, () => chart, [chart])
  return (
    <div
      ref={attach}
      className={className ? `tc-container ${className}` : 'tc-container'}
      style={style}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: our own SVG from chartToString, with every value escaped.
      dangerouslySetInnerHTML={html}
    />
  )
}

/**
 * Any chart, with the type as a prop. Renders the SVG on the server (so it
 * shows before JavaScript runs) and takes it over in the browser without
 * re-creating it. The ref is the `Chart` instance.
 *
 * ```tsx
 * <TablerChart type={line} data={data} aspectRatio={3} locale="en-US" />
 * ```
 */
export const TablerChart: <O extends object>(
  props: ChartProps<O> & RefAttributes<Chart<O> | null>,
) => ReactElement | null = forwardRef(TablerChartImpl) as never

/** A component for one chart type, e.g. `chartComponent(line, 'LineChart')`. */
export function chartComponent<O extends object>(
  type: ChartType<O>,
  displayName: string,
): ChartComponent<O> {
  const component = forwardRef<Chart<O> | null, Omit<ChartProps<O>, 'type'>>((props, ref) =>
    TablerChartImpl({ ...props, type } as ChartProps<O>, ref),
  )
  component.displayName = displayName
  return component
}
