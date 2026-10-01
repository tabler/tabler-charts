/**
 * Export a rendered chart as a standalone SVG or an image:
 * `import { exportSVG, exportImage, downloadChart } from '@tabler/charts/export'`.
 *
 * Charts are styled by CSS, so the export copies the computed styles of
 * every mark into the SVG: the file looks the same anywhere, without the
 * stylesheet or the page's custom properties. Browser only.
 */
import type { Chart } from './chart.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface ExportOptions {
  /**
   * Background color, `'auto'` for the chart's surface (`--tc-surface`), or
   * `false` for none (transparent). Defaults to `'auto'`.
   */
  background?: string | false
  /** Draw the legend into the image, as the page shows it. Defaults to `true`. */
  legend?: boolean
}

export interface ImageOptions extends ExportOptions {
  /** Image type. Defaults to `'image/png'`. */
  type?: 'image/png' | 'image/jpeg' | 'image/webp'
  /** Pixels per chart pixel. Defaults to `2`. */
  scale?: number
  /** Quality of lossy types, `0…1`. */
  quality?: number
}

export interface DownloadOptions extends ImageOptions {
  /** File name without the extension. Defaults to the chart's title, or `chart`. */
  filename?: string
  /** File format. Defaults to `'png'`. */
  format?: 'svg' | 'png' | 'jpeg' | 'webp'
}

/** A chart, its container, or its root `<svg>`. */
export type ExportTarget = Chart<object> | Element

/** Properties copied from the computed style, with the values they can be left out at. */
const SHAPE: Record<string, string> = {
  fill: 'rgb(0, 0, 0)',
  'fill-opacity': '1',
  stroke: 'none',
  'stroke-width': '1px',
  'stroke-opacity': '1',
  'stroke-dasharray': 'none',
  'stroke-dashoffset': '0px',
  'stroke-linecap': 'butt',
  'stroke-linejoin': 'miter',
  'paint-order': 'normal',
  'shape-rendering': 'auto',
  'vector-effect': 'none',
  opacity: '1',
  visibility: 'visible',
}
const TEXT: Record<string, string> = {
  ...SHAPE,
  'font-family': '',
  'font-size': '',
  'font-weight': '400',
  'font-style': 'normal',
  'font-variant-numeric': 'normal',
  'letter-spacing': 'normal',
}
const STOP: Record<string, string> = { 'stop-color': '', 'stop-opacity': '1' }
const GROUP: Record<string, string> = { opacity: '1' }
const SHAPES = new Set(['path', 'line', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'])

function rootOf(target: ExportTarget): SVGSVGElement {
  const el = 'element' in target && !(target instanceof Element) ? target.element : target
  const svg = el.localName === 'svg' ? el : el.querySelector(':scope > svg.tc-chart')
  if (!svg) throw new Error('@tabler/charts: no rendered chart to export.')
  return svg as SVGSVGElement
}

/** A computed transform as an SVG `transform` attribute, around its origin. */
function transformOf(style: CSSStyleDeclaration): string | undefined {
  const value = style.transform
  if (!value || value === 'none') return undefined
  // Browsers report a matrix; SVG takes the same functions without units.
  const svg = value.replace(/px/g, '')
  if (svg.startsWith('translate')) return svg
  const [ox = 0, oy = 0] = (style.transformOrigin || '0 0').split(' ').map(Number.parseFloat)
  return ox || oy ? `translate(${ox} ${oy}) ${svg} translate(${-ox} ${-oy})` : svg
}

/** Copy the computed look of `live` onto its clone, recursively. */
function inline(live: Element, copy: Element): boolean {
  const style = getComputedStyle(live)
  if (style.display === 'none') return false
  const tag = live.localName
  const props = tag === 'text' ? TEXT : tag === 'stop' ? STOP : SHAPES.has(tag) ? SHAPE : GROUP
  const declarations: string[] = []
  for (const name in props) {
    const value = style.getPropertyValue(name)
    if (value && value !== props[name]) declarations.push(`${name}:${value}`)
  }
  copy.removeAttribute('style')
  if (declarations.length) copy.setAttribute('style', declarations.join(';'))
  const transform = transformOf(style)
  if (transform) copy.setAttribute('transform', transform)

  const liveChildren = Array.from(live.children)
  const copies = Array.from(copy.children)
  liveChildren.forEach((child, i) => {
    const twin = copies[i] as Element
    if (child.classList.contains('tc-hover-layer') || !inline(child, twin)) twin.remove()
  })
  return true
}

/**
 * The legend as the page lays it out: every entry at its place relative to
 * the legend box, with a swatch (hollow when hidden) and its name.
 */
function legendLayer(
  container: Element,
): { svg: Element; height: number; margin: number; bottom: boolean } | undefined {
  const legend = container.querySelector(':scope > .tc-legend')
  const items = legend ? Array.from(legend.querySelectorAll('.tc-legend-item')) : []
  if (!legend || !items.length) return undefined
  const doc = container.ownerDocument
  const box = legend.getBoundingClientRect()
  const g = doc.createElementNS(SVG_NS, 'g')
  for (const item of items) {
    const swatch = item.querySelector('.tc-legend-swatch')
    const name = item.querySelector('.tc-legend-name')
    if (!swatch || !name) continue
    const s = swatch.getBoundingClientRect()
    const n = name.getBoundingClientRect()
    const color = getComputedStyle(swatch).getPropertyValue('--tc-series-color').trim()
    const hidden = item.classList.contains('tc-legend-item-hidden')
    const dot = doc.createElementNS(SVG_NS, 'circle')
    dot.setAttribute('cx', String(round(s.left - box.left + s.width / 2)))
    dot.setAttribute('cy', String(round(s.top - box.top + s.height / 2)))
    dot.setAttribute('r', String(round(s.width / 2 - (hidden ? 0.75 : 0))))
    dot.setAttribute(
      'style',
      hidden ? `fill:none;stroke:${color};stroke-width:1.5px` : `fill:${color}`,
    )
    const text = getComputedStyle(name)
    const label = doc.createElementNS(SVG_NS, 'text')
    label.setAttribute('x', String(round(n.left - box.left)))
    label.setAttribute('y', String(round(n.top - box.top + n.height / 2)))
    label.setAttribute('dy', '0.35em')
    label.setAttribute(
      'style',
      `fill:${text.color};font-family:${text.fontFamily};font-size:${text.fontSize};font-weight:${text.fontWeight}`,
    )
    label.textContent = name.textContent
    g.append(dot, label)
  }
  const bottom = legend.getAttribute('data-position') === 'bottom'
  const margin =
    Number.parseFloat(getComputedStyle(legend)[bottom ? 'marginTop' : 'marginBottom']) || 0
  return { svg: g, height: round(box.height + margin), margin, bottom }
}

const round = (value: number): number => Math.round(value * 100) / 100

/**
 * The chart as a standalone SVG document: the computed styles are inlined,
 * hover marks left out and running animations finished first.
 *
 * ```ts
 * const svg = exportSVG(chart)
 * ```
 */
export function exportSVG(target: ExportTarget, options: ExportOptions = {}): string {
  const svg = rootOf(target)
  // Read the resting state, not a frame in the middle of an entrance or update.
  for (const animation of svg.getAnimations?.({ subtree: true }) ?? []) animation.finish()
  const copy = svg.cloneNode(true) as SVGSVGElement
  inline(svg, copy)
  const doc = svg.ownerDocument
  const width = Number(svg.getAttribute('width'))
  const height = Number(svg.getAttribute('height'))
  copy.setAttribute('xmlns', SVG_NS)
  copy.removeAttribute('class')
  copy.removeAttribute('tabindex')
  copy.removeAttribute('data-resizing')
  copy.removeAttribute('aria-describedby')
  copy.removeAttribute('aria-activedescendant')

  const chartStyle = getComputedStyle(svg)
  const container = svg.parentElement
  const legend = options.legend !== false && container ? legendLayer(container) : undefined
  let total = height
  if (legend) {
    // The chart moves down below a top legend; a bottom one goes under it.
    const wrap = doc.createElementNS(SVG_NS, 'g')
    wrap.append(...Array.from(copy.childNodes))
    if (legend.bottom) {
      legend.svg.setAttribute('transform', `translate(0 ${height + legend.margin})`)
    } else {
      wrap.setAttribute('transform', `translate(0 ${legend.height})`)
    }
    copy.append(wrap, legend.svg)
    total = height + legend.height
  }
  copy.setAttribute('width', String(width))
  copy.setAttribute('height', String(total))
  copy.setAttribute('viewBox', `0 0 ${width} ${total}`)

  // A name for the file itself, besides the aria-label.
  const name = svg.getAttribute('aria-label')
  if (name) {
    const title = doc.createElementNS(SVG_NS, 'title')
    title.textContent = name
    copy.prepend(title)
  }

  const background =
    options.background === undefined || options.background === 'auto'
      ? chartStyle.getPropertyValue('--tc-surface').trim() || undefined
      : options.background || undefined
  if (background) {
    const rect = doc.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('width', '100%')
    rect.setAttribute('height', '100%')
    rect.setAttribute('fill', background)
    copy.insertBefore(rect, copy.querySelector(':scope > title')?.nextSibling ?? copy.firstChild)
  }
  return new XMLSerializer().serializeToString(copy)
}

/**
 * The chart as an image (PNG by default), drawn from `exportSVG()` at
 * `scale` pixels per chart pixel.
 *
 * ```ts
 * const blob = await exportImage(chart, { scale: 3 })
 * ```
 */
export async function exportImage(target: ExportTarget, options: ImageOptions = {}): Promise<Blob> {
  const { type = 'image/png', scale = 2, quality } = options
  const markup = exportSVG(target, {
    ...options,
    // JPEG has no transparency: without a background it would turn black.
    ...(type === 'image/jpeg' && options.background === false ? { background: '#fff' } : {}),
  })
  const doc = rootOf(target).ownerDocument
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  await image.decode()
  const canvas = doc.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('@tabler/charts: no 2d canvas to draw the image.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('@tabler/charts: could not encode.'))),
      type,
      quality,
    )
  })
}

/**
 * Save the chart as a file: PNG by default, or SVG, JPEG or WebP.
 *
 * ```ts
 * button.onclick = () => downloadChart(chart, { format: 'svg', filename: 'sales' })
 * ```
 */
export async function downloadChart(
  target: ExportTarget,
  options: DownloadOptions = {},
): Promise<void> {
  const { format = 'png' } = options
  const svg = rootOf(target)
  const blob =
    format === 'svg'
      ? new Blob([exportSVG(target, options)], { type: 'image/svg+xml' })
      : await exportImage(target, { ...options, type: `image/${format}` })
  const name = (options.filename ?? svg.getAttribute('aria-label') ?? 'chart')
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
  const link = svg.ownerDocument.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${name || 'chart'}.${format === 'jpeg' ? 'jpg' : format}`
  link.click()
  // Give the browser a moment to start the download before the URL goes.
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
