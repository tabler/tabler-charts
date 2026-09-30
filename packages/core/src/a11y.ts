import type { Hit } from './interaction.ts'
import { h, type VNode } from './vnode.ts'

/** The data behind a chart as text: header cells and one row per category. */
export interface DataTable {
  /** Column headers; the first one labels the row headers (may be empty). */
  columns: string[]
  /** Rows of display text; the first cell of each row is its header. */
  rows: string[][]
}

/**
 * An HTML table of the chart data, for screen readers (visually hidden by
 * default) or as a visible fallback. Every cell is text, escaped by the renderer.
 */
export function tableContent(table: DataTable, caption?: string): VNode {
  const [corner = '', ...headers] = table.columns
  return h(
    'table',
    { class: 'tc-table' },
    caption && h('caption', null, caption),
    h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', { scope: 'col' }, corner),
        headers.map((name, i) => h('th', { key: i, scope: 'col' }, name)),
      ),
    ),
    h(
      'tbody',
      null,
      table.rows.map(([head = '', ...cells], i) =>
        h(
          'tr',
          { key: i },
          h('th', { scope: 'row' }, head),
          cells.map((cell, j) => h('td', { key: j }, cell)),
        ),
      ),
    ),
  )
}

/** Short sentence describing a hit, announced during keyboard navigation. */
export function describeHit(hit: Hit): string {
  const items =
    hit.seriesIndex === undefined
      ? hit.items
      : hit.items.filter((item) => item.seriesIndex === hit.seriesIndex)
  return `${hit.title}: ${items.map((item) => `${item.name} ${item.text}`).join(', ')}`
}
