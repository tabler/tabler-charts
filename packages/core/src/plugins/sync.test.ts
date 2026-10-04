// @vitest-environment happy-dom
import { afterEach, describe, expect, test } from 'vitest'
import type { ChartConfig } from '../chart.ts'
import { Chart } from '../chart-default.ts'
import { bar } from '../charts/bar.ts'
import { line } from '../charts/line.ts'
import { flush } from '../scheduler.ts'

const charts: Chart<object>[] = []
afterEach(() => {
  for (const chart of charts.splice(0)) chart.destroy()
  document.body.innerHTML = ''
})

function make(options: Record<string, unknown>, labels = ['Mon', 'Tue', 'Wed', 'Thu']) {
  const el = document.createElement('div')
  document.body.append(el)
  const chart = new Chart(el, {
    type: line,
    width: 400,
    height: 200,
    locale: 'en-US',
    data: { labels, series: [{ name: 'A', values: labels.map((_, i) => i + 1) }] },
    ...options,
  } as ChartConfig<object>)
  charts.push(chart)
  flush()
  return chart
}

/** Hover a chart as the pointer does, over its category `index`. */
function hover(chart: Chart<object>, index: number) {
  const hit = chart.interaction?.hitIndex(index)
  chart.highlightAt(hit?.x ?? 0, (hit?.area.y ?? 0) + 10)
  flush()
}

describe('sync', () => {
  test('the pointer over one chart highlights the same category in the others', () => {
    const a = make({ sync: 'board' })
    const b = make({ sync: 'board', type: bar })
    const c = make({ sync: 'other' })
    hover(a, 2)
    expect(a.active?.label).toBe('Wed')
    expect(b.active?.label).toBe('Wed')
    expect(b.highlightSource).toBe('index')
    expect(c.active).toBeNull()
    // The synced chart shows its tooltip too.
    expect(b.element.querySelector('.tc-tooltip[data-visible]')).not.toBeNull()
    a.clearHighlight()
    flush()
    expect(b.active).toBeNull()
  })

  test('categories are matched by label, and a chart without the label clears', () => {
    const a = make({ sync: 'g' })
    const b = make({ sync: 'g' }, ['Tue', 'Wed', 'Fri'])
    hover(a, 2)
    expect(b.active?.label).toBe('Wed')
    expect(b.active?.index).toBe(1)
    hover(a, 0)
    expect(b.active).toBeNull()
  })

  test('keyboard highlights stay in their chart', () => {
    const a = make({ sync: 'k' })
    const b = make({ sync: 'k' })
    a.highlightIndex(1)
    flush()
    expect(b.active).toBeNull()
  })

  test('a chart leaves its group when it is destroyed or its sync changes', () => {
    const a = make({ sync: 'd' })
    const b = make({ sync: 'd' })
    b.update({ sync: 'elsewhere' } as never)
    flush()
    hover(a, 1)
    expect(b.active).toBeNull()
    b.update({ sync: 'd' } as never)
    flush()
    hover(a, 3)
    expect(b.active?.label).toBe('Thu')
    b.destroy()
    expect(() => hover(a, 0)).not.toThrow()
  })
})
