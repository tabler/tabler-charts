import { describe, expect, test } from 'vitest'
import { h, normalizeClass, normalizeStyle } from './vnode.ts'

describe('h()', () => {
  test('creates a node without props or children', () => {
    expect(h('g')).toEqual({ tag: 'g', attrs: {}, children: [], key: undefined })
  })

  test('keeps string and number attributes', () => {
    const node = h('rect', { x: 0, y: 10.5, fill: 'red' })
    expect(node.attrs).toEqual({ x: 0, y: 10.5, fill: 'red' })
  })

  test('omits false, null and undefined attributes, turns true into an empty value', () => {
    const node = h('path', { a: false, b: null, c: undefined, focusable: true })
    expect(node.attrs).toEqual({ focusable: '' })
  })

  test('extracts key from props', () => {
    expect(h('g', { key: 'series-1' }).key).toBe('series-1')
    expect(h('g', { key: 0 }).key).toBe(0)
    expect(h('g', { key: null }).key).toBeUndefined()
    expect(h('g', { key: 'k' }).attrs).toEqual({})
  })

  test('normalizes class and style', () => {
    const node = h('g', {
      class: ['tc-series', false, ['tc-series-0', null]],
      style: { '--tc-color': 'red', opacity: 0.5, hidden: null },
    })
    expect(node.attrs).toEqual({
      class: 'tc-series tc-series-0',
      style: '--tc-color:red;opacity:0.5',
    })
  })

  test('drops empty class and style', () => {
    expect(h('g', { class: [false, ''], style: {} }).attrs).toEqual({})
  })

  test('flattens children and skips booleans, null and undefined', () => {
    const a = h('path')
    const b = h('circle')
    const node = h('g', null, [a, [null, false, [b]]], undefined, true)
    expect(node.children).toEqual([a, b])
  })

  test('converts numbers to text and merges adjacent text', () => {
    const tspan = h('tspan')
    const node = h('text', null, 'Total: ', 1200, '', tspan, 'PLN', ' ', 0)
    expect(node.children).toEqual(['Total: 1200', tspan, 'PLN 0'])
  })
})

describe('normalizeClass()', () => {
  test('returns strings untouched', () => {
    expect(normalizeClass('a b')).toBe('a b')
  })

  test('handles falsy values', () => {
    expect(normalizeClass(undefined)).toBe('')
    expect(normalizeClass([null, false, undefined])).toBe('')
  })
})

describe('normalizeStyle()', () => {
  test('returns strings untouched', () => {
    expect(normalizeStyle('fill:red')).toBe('fill:red')
  })

  test('skips empty values', () => {
    expect(normalizeStyle({ fill: '', stroke: 'blue' })).toBe('stroke:blue')
  })
})
