import { describe, expect, test } from 'vitest'
import { h } from '../vnode.ts'
import { escapeAttr, escapeText, renderToString } from './string.ts'

describe('renderToString()', () => {
  test('renders empty elements as self-closing', () => {
    expect(renderToString(h('path', { d: 'M0 0L10 10' }))).toBe('<path d="M0 0L10 10"/>')
  })

  test('renders nested children and text', () => {
    const node = h('g', { class: 'tc-axis' }, h('text', { x: 4 }, 'Jan'), h('line'))
    expect(renderToString(node)).toBe('<g class="tc-axis"><text x="4">Jan</text><line/></g>')
  })

  test('closes empty html elements explicitly and void elements without a closing tag', () => {
    expect(renderToString(h('div', null, h('span', { class: 'x' }), h('br')))).toBe(
      '<div><span class="x"></span><br></div>',
    )
  })

  test('treats svg fragments as svg and can force the namespace', () => {
    expect(renderToString(h('g', null, h('path')))).toBe('<g><path/></g>')
    expect(renderToString(h('g', null, h('path')), { namespace: 'html' })).toBe(
      '<g><path></path></g>',
    )
    expect(renderToString(h('div', null, h('i')), { namespace: 'svg' })).toBe('<div><i/></div>')
  })

  test('self-closes inside svg but not inside foreignObject', () => {
    const node = h('svg', null, h('g'), h('foreignObject', null, h('div'), h('svg', null, h('g'))))
    expect(renderToString(node, { xmlns: false })).toBe(
      '<svg><g/><foreignObject><div></div><svg><g/></svg></foreignObject></svg>',
    )
  })

  test('renders a bare text node', () => {
    expect(renderToString('a < b')).toBe('a &lt; b')
  })

  test('adds xmlns to a root svg', () => {
    expect(renderToString(h('svg', { viewBox: '0 0 10 10' }))).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>',
    )
  })

  test('keeps an existing xmlns and can skip it', () => {
    const svg = h('svg', { xmlns: 'custom' })
    expect(renderToString(svg)).toBe('<svg xmlns="custom"/>')
    expect(renderToString(h('svg'), { xmlns: false })).toBe('<svg/>')
  })

  test('adds xmlns only to the root, not to nested svg', () => {
    const node = h('svg', null, h('svg'))
    expect(renderToString(node)).toBe('<svg xmlns="http://www.w3.org/2000/svg"><svg/></svg>')
  })

  test('escapes text and attribute values', () => {
    const node = h('text', { 'aria-label': 'Q1 "best" <3 & more' }, '<script>alert(1)</script>')
    expect(renderToString(node)).toBe(
      '<text aria-label="Q1 &quot;best&quot; &lt;3 &amp; more">&lt;script&gt;alert(1)&lt;/script&gt;</text>',
    )
  })

  test('drops event handler attributes', () => {
    expect(renderToString(h('rect', { onclick: 'x()', OnLoad: 'y()', opacity: 1 }))).toBe(
      '<rect opacity="1"/>',
    )
  })

  test('drops invalid attribute and tag names', () => {
    expect(renderToString(h('g', { 'x"><script': '1', 'data-ok': 'y' }))).toBe('<g data-ok="y"/>')
    expect(renderToString(h('g', null, h('<script>'), h('path')))).toBe('<g><path/></g>')
  })

  test('renders a small chart tree', () => {
    const chart = h(
      'svg',
      { class: 'tc-chart', viewBox: '0 0 200 100', role: 'img', 'aria-labelledby': 'tc-title' },
      h('title', { id: 'tc-title' }, 'Sales & returns'),
      h(
        'g',
        { class: 'tc-grid' },
        [0, 50, 100].map((y) => h('line', { key: y, x1: 0, x2: 200, y1: y, y2: y })),
      ),
      h(
        'g',
        {
          class: ['tc-series', 'tc-series-0'],
          style: { '--tc-series-color': 'var(--tc-color-1)' },
        },
        h('path', { class: 'tc-line', d: 'M0 80L100 20L200 50', fill: 'none' }),
      ),
    )
    expect(renderToString(chart)).toMatchSnapshot()
  })
})

describe('escapeText()', () => {
  test('returns the same string when nothing needs escaping', () => {
    expect(escapeText('plain "text"')).toBe('plain "text"')
  })

  test('escapes repeatedly without regex state leaking between calls', () => {
    expect(escapeText('a&b')).toBe('a&amp;b')
    expect(escapeText('a&b')).toBe('a&amp;b')
  })
})

describe('escapeAttr()', () => {
  test('escapes quotes', () => {
    expect(escapeAttr('"x"')).toBe('&quot;x&quot;')
  })
})
