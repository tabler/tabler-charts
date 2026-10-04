/**
 * Batches work from all charts into a single animation frame. Scheduling the
 * same key twice before the flush runs its latest task once.
 */

const queue = /* @__PURE__ */ new Map<object, () => void>()
let pending = false

const requestFrame = (callback: () => void): void => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(callback)
  else queueMicrotask(callback)
}

/**
 * Run a task; an error it throws is reported on its own (as an uncaught
 * error, in the console and to `window.onerror`) instead of stopping the
 * tasks of other charts in the same frame.
 */
export function run(task: () => void): void {
  try {
    task()
  } catch (error) {
    setTimeout(() => {
      throw error
    })
  }
}

/** Run `task` in the next frame, replacing any task already queued for `key`. */
export function schedule(key: object, task: () => void): void {
  queue.set(key, task)
  if (!pending) {
    pending = true
    requestFrame(flush)
  }
}

/** Work `flush()` also runs: the idle queue (`idle.ts`), once something uses it. */
export const flushHooks: { idle?: () => number } = {}

/** Drop the task queued for `key`, if any. */
export function cancel(key: object): void {
  queue.delete(key)
}

/**
 * Run queued tasks now, idle ones too; returns how many ran. Tasks queued
 * meanwhile run too, but each key only once: a task queued again after it
 * ran (a chart updated from its own `render` handler) waits for the next
 * frame, instead of looping in this one and freezing the page.
 */
export function flush(): number {
  pending = false
  let count = 0
  const ran = new Set<object>()
  const later = new Map<object, () => void>()
  // Idle work can schedule frame work in turn.
  do {
    // (A Map also visits what is added while it is walked: tasks queued meanwhile.)
    for (const [key, task] of queue) {
      queue.delete(key)
      if (ran.has(key)) later.set(key, task)
      else {
        ran.add(key)
        run(task)
        count++
      }
    }
    count += flushHooks.idle?.() ?? 0
  } while (queue.size > 0)
  for (const [key, task] of later) schedule(key, task)
  return count
}
