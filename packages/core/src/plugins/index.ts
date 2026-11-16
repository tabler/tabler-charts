import type { ChartPlugin } from '../plugin.ts'
import { download } from './download.ts'
import { highlight } from './highlight.ts'
import { keyboard } from './keyboard.ts'
import { legend } from './legend.ts'
import { pointer } from './pointer.ts'
import { sync } from './sync.ts'
import { dataTable } from './table.ts'
import { tooltip } from './tooltip.ts'

export { dataTable, download, highlight, keyboard, legend, pointer, sync, tooltip }

/** The built-in plugins installed by the default `Chart` from `@tabler/charts`. */
export function defaultPlugins(): ChartPlugin[] {
  return [highlight(), legend(), tooltip(), dataTable(), keyboard(), sync(), download()]
}
