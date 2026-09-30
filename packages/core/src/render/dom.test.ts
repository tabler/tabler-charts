// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from 'vitest'
import { h, type VNode } from '../vnode.ts'
import { render } from './dom.ts'
import { renderToString } from './string.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'
const HTML_NS = 'http://www.w3.org/1999/xhtml'

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
})

/** Collect DOM mutations caused by `fn`. */
async function mutations(fn: () => void): Promise<MutationRecord[]> {
  const records: MutationRecord[] = []
  const observer = new MutationObserver((list) => records.push(...list))
  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  })
  fn()
  await Promise.resolve()
  records.push(...observer.takeRecords())
  observer.disconnect()
  return records
}

const list = (keys: (string | number)[]): VNode =>
  h(
    'svg',
    null,
    h(
      'g',
      null,
      keys.map((k) => h('rect', { key: k, 'data-k': k })),
    ),
  )

const rects = (): Element[] => Array.from(container.querySelectorAll('rect'))

describe('render() mount', () => {
  test('creates svg elements in the svg namespace', () => {
    const el = render(container, h('svg', { viewBox: '0 0 10 10' }, h('g', null, h('path'))))
    expect(el?.namespaceURI).toBe(SVG_NS)
    expect(container.querySelector('path')?.namespaceURI).toBe(SVG_NS)
    expect(el?.getAttribute('viewBox')).toBe('0 0 10 10')
  })

  test('renders foreignObject children as html', () => {
    render(container, h('svg', null, h('foreignObject', null, h('div', { class: 'tip' }))))
    expect(container.querySelector('foreignObject')?.namespaceURI).toBe(SVG_NS)
    expect(container.querySelector('.tip')?.namespaceURI).toBe(HTML_NS)
  })

  test('renders html trees in the html namespace', () => {
    const el = render(container, h('div', null, h('span', null, 'x')))
    expect(el?.namespaceURI).toBe(HTML_NS)
  })

  test('matches the string renderer output', () => {
    const tree = h(
      'svg',
      { class: 'tc-chart', viewBox: '0 0 100 50' },
      h('title', null, 'A & B'),
      h('g', { class: 'tc-series' }, h('path', { d: 'M0 0L10 10' }), h('text', { x: 1 }, 'Jan', 2)),
    )
    const el = render(container, tree)
    const ssr = document.createElement('div')
    ssr.innerHTML = renderToString(tree, { xmlns: false })
    expect(el?.outerHTML).toBe(ssr.innerHTML)
  })

  test('skips event handlers and invalid names', () => {
    render(container, h('svg', { onclick: 'x()', 'bad"name': 1, id: 'ok' }, h('<x>'), h('g')))
    expect(container.innerHTML).toBe('<svg id="ok"><g></g></svg>')
  })

  test('keeps other content of the container', () => {
    const tooltip = document.createElement('div')
    container.appendChild(tooltip)
    render(container, h('svg'))
    expect(container.firstChild).toBe(tooltip)
    expect(container.childNodes).toHaveLength(2)
  })
})

describe('render() patch', () => {
  test('reuses the root and updates only changed attributes', async () => {
    const first = render(container, h('svg', { width: 100, height: 50, class: 'a' }))
    const records = await mutations(() => {
      const second = render(container, h('svg', { width: 200, height: 50 }))
      expect(second).toBe(first)
    })
    expect(records.map((r) => r.attributeName).sort()).toEqual(['class', 'width'])
    expect(first?.getAttribute('width')).toBe('200')
    expect(first?.hasAttribute('class')).toBe(false)
  })

  test('produces no mutations when nothing changed', async () => {
    const tree = () =>
      h('svg', { width: 1 }, h('g', null, h('text', null, 'a'), h('path', { d: 'M0 0' })))
    render(container, tree())
    expect(await mutations(() => render(container, tree()))).toHaveLength(0)
  })

  test('updates text in place', async () => {
    render(container, h('svg', null, h('text', null, 'Jan')))
    const node = container.querySelector('text')?.firstChild
    const records = await mutations(() => render(container, h('svg', null, h('text', null, 'Feb'))))
    expect(container.querySelector('text')?.firstChild).toBe(node)
    expect(node?.textContent).toBe('Feb')
    expect(records).toHaveLength(1)
    expect(records[0]?.type).toBe('characterData')
  })

  test('skips subtrees when given the same vnode object', async () => {
    const stat = h('g', { class: 'static' }, h('path'))
    render(container, h('svg', null, stat))
    // Mutate the DOM behind the renderer's back: an identical vnode must not touch it.
    container.querySelector('.static')?.setAttribute('data-x', '1')
    render(container, h('svg', null, stat))
    expect(container.querySelector('.static')?.getAttribute('data-x')).toBe('1')
  })

  test('replaces an element when its tag changes', () => {
    render(container, h('svg', null, h('rect')))
    render(container, h('svg', null, h('circle')))
    expect(container.innerHTML).toBe('<svg><circle></circle></svg>')
  })

  test('replaces the root when its tag changes', () => {
    const first = render(container, h('svg'))
    const second = render(container, h('div'))
    expect(second).not.toBe(first)
    expect(container.innerHTML).toBe('<div></div>')
  })

  test('grows and shrinks unkeyed children while reusing nodes', () => {
    const tree = (n: number) =>
      h(
        'svg',
        null,
        Array.from({ length: n }, (_, i) => h('line', { y1: i })),
      )
    render(container, tree(2))
    const [a, b] = Array.from(container.querySelectorAll('line'))
    render(container, tree(4))
    const lines = Array.from(container.querySelectorAll('line'))
    expect(lines).toHaveLength(4)
    expect(lines[0]).toBe(a)
    expect(lines[1]).toBe(b)
    render(container, tree(1))
    expect(Array.from(container.querySelectorAll('line'))).toEqual([a])
  })

  test('removes nodes it did not render', () => {
    render(container, h('svg', null, h('g')))
    container.querySelector('svg')?.appendChild(document.createElementNS(SVG_NS, 'circle'))
    render(container, h('svg', null, h('g')))
    expect(container.innerHTML).toBe('<svg><g></g></svg>')
  })

  test('unmounts with null', () => {
    render(container, h('svg'))
    expect(render(container, null)).toBeNull()
    expect(container.innerHTML).toBe('')
    expect(render(container, h('svg'))?.tagName).toBe('svg')
  })
})

describe('render() keyed children', () => {
  test('keeps element identity when reordering', () => {
    render(container, list([1, 2, 3, 4]))
    const [e1, e2, e3, e4] = rects()
    render(container, list([4, 2, 1, 3]))
    expect(rects()).toEqual([e4, e2, e1, e3])
  })

  test('removing an item does not move the others', async () => {
    render(container, list(['a', 'b', 'c']))
    const [a, , c] = rects()
    const records = await mutations(() => render(container, list(['a', 'c'])))
    expect(rects()).toEqual([a, c])
    const added = records.flatMap((r) => Array.from(r.addedNodes))
    const removed = records.flatMap((r) => Array.from(r.removedNodes))
    expect(added).toHaveLength(0)
    expect(removed).toHaveLength(1)
  })

  test('inserting an item only adds that item', async () => {
    render(container, list(['a', 'c']))
    const [a, c] = rects()
    const records = await mutations(() => render(container, list(['a', 'b', 'c'])))
    const [na, nb, nc] = rects()
    expect(na).toBe(a)
    expect(nc).toBe(c)
    const added = records.flatMap((r) => Array.from(r.addedNodes))
    expect(added).toEqual([nb])
  })

  test('recreates a keyed node when its tag changes', () => {
    render(container, h('svg', null, h('rect', { key: 'x' })))
    render(container, h('svg', null, h('circle', { key: 'x' })))
    expect(container.innerHTML).toBe('<svg><circle></circle></svg>')
  })

  test('handles mixed keyed and unkeyed children', () => {
    render(
      container,
      h('svg', null, h('title', null, 'T'), h('g', { key: 'a' }), h('g', { key: 'b' })),
    )
    const title = container.querySelector('title')
    const [ga, gb] = Array.from(container.querySelectorAll('g'))
    render(
      container,
      h('svg', null, h('title', null, 'T2'), h('g', { key: 'b' }), h('g', { key: 'a' })),
    )
    expect(container.querySelector('title')).toBe(title)
    expect(Array.from(container.querySelectorAll('g'))).toEqual([gb, ga])
    expect(title?.textContent).toBe('T2')
  })

  test('tolerates duplicate keys', () => {
    render(container, list([1, 1, 2]))
    render(container, list([2, 1, 1]))
    expect(rects().map((r) => r.getAttribute('data-k'))).toEqual(['2', '1', '1'])
  })
})
