import type { Highlight, Hit } from '../interaction.ts'
import { round } from '../layout.ts'
import { h, type VNode } from '../vnode.ts'

/** Series wrapper so hover marks pick up the series color from CSS. */
function seriesGroup(seriesIndex: number, color: string | undefined, child: VNode): VNode {
  return h(
    'g',
    {
      key: seriesIndex,
      class: ['tc-series', `tc-series-${seriesIndex + 1}`],
      style: { '--tc-series-color': color },
    },
    child,
  )
}

/** A halo around the hit, in the color of its series. */
function halo(hit: Hit, mark: Extract<Highlight, { kind: 'halo' }>): VNode | undefined {
  const item = hit.items.find((i) => i.seriesIndex === hit.seriesIndex) ?? hit.items[0]
  return (
    item &&
    seriesGroup(
      item.seriesIndex,
      item.color,
      h('path', {
        class: 'tc-hover-mark',
        d: mark.d,
        style: `transform:translate(${round(mark.x ?? 0)}px,${round(mark.y ?? 0)}px)`,
      }),
    )
  )
}

/**
 * Hover marks drawn below the series: the band behind the hovered category
 * (bars), a crosshair through it (point charts; a spoke in radars), or a
 * halo that asks to stay `under` the chart (sankey flows).
 */
export function hoverUnderlay(hit: Hit, crosshair = true): VNode {
  const { area, highlight: mark = { kind: 'crosshair' } } = hit
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    crosshair &&
    h('line', { class: 'tc-crosshair', x1: round(x1), x2: round(x2), y1: round(y1), y2: round(y2) })
  return h(
    'g',
    { class: 'tc-hover', 'aria-hidden': 'true' },
    mark.kind === 'halo'
      ? mark.under && halo(hit, mark)
      : mark.kind === 'band'
        ? h('rect', {
            class: 'tc-hover-band',
            x: round(mark.x),
            y: round(mark.y),
            width: round(mark.width),
            height: round(mark.height),
          })
        : mark.kind === 'spoke'
          ? line(mark.x1, mark.y1, mark.x2, mark.y2)
          : line(hit.x, area.y, hit.x, area.y + area.height),
  )
}

/**
 * Hover marks drawn above the series: a halo (pie slices), or an active dot
 * on every value of point charts (of the series' `shape`, if given).
 */
export function hoverOverlay(
  hit: Hit,
  radius = 4,
  shape?: (slot: number, x: number, y: number, r: number) => string,
): VNode {
  const mark = hit.highlight
  return h(
    'g',
    { class: 'tc-hover', 'aria-hidden': 'true' },
    mark?.kind === 'halo'
      ? !mark.under && halo(hit, mark)
      : mark?.kind !== 'band' &&
          hit.items.map(
            (item) =>
              item.y !== null &&
              seriesGroup(
                item.seriesIndex,
                item.color,
                shape
                  ? h('path', {
                      class: 'tc-point tc-point-active tc-marker',
                      d: shape(item.seriesIndex, item.x, item.y, radius),
                    })
                  : h('circle', {
                      class: 'tc-point tc-point-active',
                      cx: round(item.x),
                      cy: round(item.y),
                      r: radius,
                    }),
              ),
          ),
  )
}
