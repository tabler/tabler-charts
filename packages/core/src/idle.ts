/**
 * Work that can wait until the browser is idle, such as hidden data tables:
 * it runs in an idle callback (within a second at the latest), or with
 * `flush()`. A module of its own, so charts without such work do not ship it.
 */
import { flushHooks } from './scheduler.ts'

const idle = /* @__PURE__ */ new Map<object, () => void>()
let pending = false

function drain(): number {
  pending = false
  let count = 0
  while (idle.size > 0) {
    const tasks = Array.from(idle.values())
    idle.clear()
    for (const task of tasks) {
      task()
      count++
    }
  }
  return count
}

/** Run `task` once the browser is idle, replacing any idle task already queued for `key`. */
export function scheduleIdle(key: object, task: () => void): void {
  flushHooks.idle = drain
  idle.set(key, task)
  if (pending) return
  pending = true
  if (typeof requestIdleCallback === 'function') requestIdleCallback(drain, { timeout: 1000 })
  else setTimeout(drain, 100)
}

/** Drop the idle task queued for `key`, if any. */
export function cancelIdle(key: object): void {
  idle.delete(key)
}
