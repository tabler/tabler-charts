import type { Hit } from '../interaction.ts'
import { h, type VNode } from '../vnode.ts'

const round = (value: number): number => Math.round(value * 100) / 100

/** Series wrapper so hover marks pick up the series color from CSS. */
function seriesGroup(seriesIndex: number, color: string | undefined, child: VNode): VNode {
  return h(
    'g',
    {
      key: seriesIndex,
      class: ['tc-series', `tc-series-${seriesIndex + 1}`],
      style: color ? `--tc-series-color:${color}` : undefined,
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
    hit.band
      ? h('rect', {
          class: 'tc-hover-band',
          x: round(hit.band.x),
          y: round(area.y),
          width: round(hit.band.width),
          height: round(area.height),
        })
      : crosshair &&
          h('line', {
            class: 'tc-crosshair',
            x1: round(hit.x),
            x2: round(hit.x),
            y1: round(area.y),
            y2: round(area.y + area.height),
          }),
  )
}

/** Hover marks drawn above the series: an active dot on every point of point charts. */
export function hoverOverlay(hit: Hit, radius = 4): VNode {
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
            h('circle', {
              class: 'tc-point tc-point-active',
              cx: round(item.x),
              cy: round(item.y),
              r: radius,
            }),
          ),
      ),
  )
}
