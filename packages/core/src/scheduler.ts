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

/** Run queued tasks now, idle ones too; returns how many ran. Tasks queued meanwhile run too. */
export function flush(): number {
  pending = false
  let count = 0
  while (queue.size > 0) {
    const tasks = Array.from(queue.values())
    queue.clear()
    for (const task of tasks) {
      run(task)
      count++
    }
  }
  count += flushHooks.idle?.() ?? 0
  // Idle work can schedule frame work in turn.
  return queue.size ? count + flush() : count
}
