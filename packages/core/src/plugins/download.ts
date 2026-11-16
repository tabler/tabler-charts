import { feature } from '../features.ts'
import type { ChartPlugin } from '../plugin.ts'
import { render } from '../render/dom.ts'
import { h } from '../vnode.ts'

/** A file format of the download menu. */
export type DownloadFormat = 'png' | 'svg' | 'jpeg' | 'webp'

/** The `download` option as an object. */
export interface DownloadMenuOptions {
  /** Formats offered, in this order. Defaults to `['png', 'svg']`. */
  formats?: readonly DownloadFormat[]
  /** File name without the extension. Defaults to the chart's title, or `chart`. */
  filename?: string
  /** Accessible name of the menu button. Defaults to `'Download'`. */
  label?: string
  /**
   * Background color, `'auto'` for the chart's surface (`--tc-surface`), or
   * `false` for none (transparent). Defaults to `'auto'`.
   */
  background?: string | false
  /** Draw the legend into the file. Defaults to `true`. */
  legend?: boolean
  /** Pixels per chart pixel in images. Defaults to `2`. */
  scale?: number
}

/** The `download` option: on, a list of formats, or the options. */
export type DownloadOption = boolean | readonly DownloadFormat[] | DownloadMenuOptions

const NAMES: Record<DownloadFormat, string> = { png: 'PNG', svg: 'SVG', jpeg: 'JPEG', webp: 'WebP' }
const DEFAULT_FORMATS: readonly DownloadFormat[] = ['png', 'svg']

function resolve(option: DownloadOption): DownloadMenuOptions {
  return option === true
    ? {}
    : Array.isArray(option)
      ? { formats: option }
      : (option as DownloadMenuOptions)
}

/**
 * A download menu in the chart's corner (`.tc-download`): a button that opens
 * a list of file formats, PNG and SVG by default. Shown with the `download`
 * option. The files come from `@tabler/charts/export`, which must be imported
 * (the chart says so otherwise): that way charts without a download never
 * carry the export code.
 */
export function download(): ChartPlugin {
  return {
    name: 'download',
    install(chart) {
      const host = chart.element
      const doc = host.ownerDocument
      let el: HTMLElement | undefined
      let options: DownloadMenuOptions = {}
      // The menu overlays the chart: the container is the positioning context.
      const addedClass = !host.classList.contains('tc-container')

      const toggle = () => el?.querySelector<HTMLElement>('.tc-download-toggle')
      const menu = () => el?.querySelector<HTMLElement>('.tc-download-menu')
      const items = () => Array.from(el?.querySelectorAll<HTMLElement>('.tc-download-item') ?? [])

      const setOpen = (open: boolean) => {
        const list = menu()
        if (!list) return
        list.hidden = !open
        toggle()?.setAttribute('aria-expanded', String(open))
        if (open) doc.addEventListener('pointerdown', onOutside, true)
        else doc.removeEventListener('pointerdown', onOutside, true)
      }
      const isOpen = () => menu()?.hidden === false

      const onOutside = (event: Event) => {
        if (!el?.contains(event.target as Node)) setOpen(false)
      }

      const onClick = (event: Event) => {
        const target = event.target as Element
        if (target.closest('.tc-download-toggle')) {
          setOpen(!isOpen())
          if (isOpen()) items()[0]?.focus()
          return
        }
        const format = target.closest('.tc-download-item')?.getAttribute('data-format')
        if (!format) return
        setOpen(false)
        toggle()?.focus()
        void feature('export')(chart, { ...options, format: format as DownloadFormat })
      }

      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen()) {
          event.preventDefault()
          setOpen(false)
          toggle()?.focus()
          return
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        const list = items()
        if (!list.length) return
        event.preventDefault()
        if (!isOpen()) setOpen(true)
        const at = list.indexOf(doc.activeElement as HTMLElement)
        const step = event.key === 'ArrowDown' ? 1 : -1
        list[(at + step + list.length) % list.length]?.focus()
      }

      // Tabbing out of the menu closes it.
      const onBlur = (event: FocusEvent) => {
        if (!el?.contains(event.relatedTarget as Node)) setOpen(false)
      }

      const remove = () => {
        if (!el) return
        setOpen(false)
        render(el, null)
        el.remove()
        el = undefined
        if (addedClass) host.classList.remove('tc-container')
      }

      return {
        afterRender({ config, changed }) {
          const option = config.download
          if (!option || typeof document === 'undefined') {
            remove()
            return
          }
          // Resizing and hovering change nothing in the menu.
          if (!changed && el?.isConnected) return
          // Fail early, at render, when the export entry is not imported.
          feature('export')
          options = resolve(option)
          const formats = options.formats?.length ? options.formats : DEFAULT_FORMATS
          if (!el) {
            el = doc.createElement('div')
            el.className = 'tc-download'
            el.addEventListener('click', onClick)
            el.addEventListener('keydown', onKey)
            el.addEventListener('focusout', onBlur)
          }
          render(
            el,
            h(
              'div',
              { class: 'tc-download-box' },
              h(
                'button',
                {
                  type: 'button',
                  class: 'tc-download-toggle',
                  'aria-label': options.label ?? 'Download',
                  'aria-haspopup': 'menu',
                  'aria-expanded': 'false',
                },
                h(
                  'svg',
                  {
                    viewBox: '0 0 24 24',
                    width: '16',
                    height: '16',
                    'aria-hidden': 'true',
                    fill: 'none',
                    stroke: 'currentColor',
                    'stroke-width': '2',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                  },
                  h('path', {
                    d: 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12',
                  }),
                ),
              ),
              h(
                'div',
                { class: 'tc-download-menu', role: 'menu', hidden: '' },
                formats.map((format) =>
                  h(
                    'button',
                    {
                      key: format,
                      type: 'button',
                      role: 'menuitem',
                      class: 'tc-download-item',
                      'data-format': format,
                    },
                    NAMES[format] ?? format,
                  ),
                ),
              ),
            ),
          )
          host.classList.add('tc-container')
          if (!el.isConnected) host.appendChild(el)
        },
        destroy: remove,
      }
    },
  }
}
