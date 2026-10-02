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

/** Run `task` in the next frame, replacing any task already queued for `key`. */
export function schedule(key: object, task: () => void): void {
  queue.set(key, task)
  if (!pending) {
    pending = true
    requestFrame(flush)
  }
}

/** Work that can wait until the browser is idle (hidden data tables). */
const idle = /* @__PURE__ */ new Map<object, () => void>()
let idlePending = false

const requestIdle = (callback: () => void): void => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(callback, { timeout: 1000 })
  else setTimeout(callback, 100)
}

/**
 * Run `task` once the browser is idle (within a second at the latest),
 * replacing any idle task already queued for `key`. `flush()` runs it too.
 */
export function scheduleIdle(key: object, task: () => void): void {
  idle.set(key, task)
  if (!idlePending) {
    idlePending = true
    requestIdle(() => {
      idlePending = false
      drain(idle)
    })
  }
}

/** Drop the tasks queued for `key`, if any. */
export function cancel(key: object): void {
  queue.delete(key)
  idle.delete(key)
}

function drain(tasks: Map<object, () => void>): number {
  let count = 0
  while (tasks.size > 0) {
    const batch = Array.from(tasks.values())
    tasks.clear()
    for (const task of batch) {
      task()
      count++
    }
  }
  return count
}

/** Run queued tasks now, idle ones too; returns how many ran. Tasks queued meanwhile run too. */
export function flush(): number {
  pending = false
  idlePending = false
  let count = drain(queue)
  count += drain(idle)
  // Idle work can schedule frame work in turn.
  if (queue.size > 0) count += flush()
  return count
}
