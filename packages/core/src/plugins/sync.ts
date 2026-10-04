import type { Chart } from '../chart.ts'
import type { Interaction } from '../interaction.ts'
import type { ChartPlugin } from '../plugin.ts'

/** Charts by `sync` group, held weakly: a chart taken out without destroy() is let go. */
const groups = /* @__PURE__ */ new Map<string, Set<WeakRef<Chart<object>>>>()

/** The index of each category label, per render of a chart. */
const indexes = /* @__PURE__ */ new WeakMap<Interaction, Map<string | number, number>>()

/** Set while a highlight is passed on, so the charts it reaches do not pass it on again. */
let passing = false

/** The index of the category with `label` in a chart's current render, if it has one. */
function indexOf(interaction: Interaction, label: string | number): number | undefined {
  let index = indexes.get(interaction)
  if (!index) {
    index = new Map()
    for (let i = 0; i < interaction.count; i++) {
      const hit = interaction.hitIndex(i)
      if (hit && !index.has(hit.label)) index.set(hit.label, i)
    }
    indexes.set(interaction, index)
  }
  return index.get(label)
}

/**
 * Shared hover across charts: charts with the same `sync` group highlight
 * the category under the pointer in any of them (with its crosshair and
 * tooltip), matched by label, and clear together when it leaves. Keyboard
 * highlights stay in their own chart.
 */
export function sync(): ChartPlugin {
  return {
    name: 'sync',
    install(chart) {
      const self = new WeakRef(chart)
      let group: Set<WeakRef<Chart<object>>> | undefined
      /** Join the group of the current config, leaving the one before. */
      const join = () => {
        const name = chart.config.sync
        const next = name ? (groups.get(name) ?? new Set()) : undefined
        if (next === group) return
        group?.delete(self)
        if (name && next) {
          next.add(self)
          groups.set(name, next)
        }
        group = next
      }
      join()
      const off = chart.on('hover', ({ hit }) => {
        // Only the pointer leads; keyboard highlights and highlights passed on do not.
        if (passing || !group || (hit && chart.highlightSource !== 'pointer')) return
        passing = true
        try {
          for (const ref of group) {
            const other = ref.deref()
            if (!other) group.delete(ref)
            if (!other || other === chart) continue
            const index = hit && other.interaction && indexOf(other.interaction, hit.label)
            if (index === undefined || index === null) other.clearHighlight()
            else other.highlightIndex(index)
          }
        } finally {
          passing = false
        }
      })
      return {
        afterRender: join,
        destroy() {
          off()
          group?.delete(self)
          if (group?.size === 0 && chart.config.sync) groups.delete(chart.config.sync)
        },
      }
    },
  }
}
