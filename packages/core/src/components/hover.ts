import type { Hit } from '../interaction.ts'
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

/**
 * Hover marks drawn below the series: a band behind the hovered category of
 * band charts (bars), or a vertical crosshair for point charts (lines).
 */
export function hoverUnderlay(hit: Hit, crosshair = true): VNode {
  const { area } = hit
  return h(
    'g',
    { class: 'tc-hover', 'aria-hidden': 'true' },
    hit.mark
      ? null
      : hit.band
        ? h('rect', {
            class: 'tc-hover-band',
            x: round(hit.band.x),
            y: round(hit.band.y),
            width: round(hit.band.width),
            height: round(hit.band.height),
          })
        : crosshair &&
          h(
            'line',
            hit.guide
              ? {
                  class: 'tc-crosshair',
                  x1: round(hit.guide.x1),
                  x2: round(hit.guide.x2),
                  y1: round(hit.guide.y1),
                  y2: round(hit.guide.y2),
                }
              : {
                  class: 'tc-crosshair',
                  x1: round(hit.x),
                  x2: round(hit.x),
                  y1: round(area.y),
                  y2: round(area.y + area.height),
                },
          ),
  )
}

/**
 * Hover marks drawn above the series: the hit's own mark (pie slices), or
 * an active dot on every point of point charts (of the series' `shape`, if given).
 */
export function hoverOverlay(
  hit: Hit,
  radius = 4,
  shape?: (slot: number, x: number, y: number, r: number) => string,
): VNode {
  const { mark } = hit
  if (mark) {
    const item = hit.items.find((i) => i.seriesIndex === hit.seriesIndex) ?? hit.items[0]
    return h(
      'g',
      { class: 'tc-hover', 'aria-hidden': 'true' },
      item &&
        seriesGroup(
          item.seriesIndex,
          item.color,
          h('path', {
            class: 'tc-hover-mark',
            d: mark.d,
            style: `transform:translate(${round(mark.x)}px,${round(mark.y)}px)`,
          }),
        ),
    )
  }
  return h(
    'g',
    { class: 'tc-hover', 'aria-hidden': 'true' },
    !hit.band &&
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
