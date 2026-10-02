import { describe, expect, test } from 'vitest'
import { cancelIdle, scheduleIdle } from './idle.ts'
import { cancel, flush, schedule } from './scheduler.ts'

describe('scheduler', () => {
  test('runs tasks asynchronously, once per key with the latest task', async () => {
    const calls: string[] = []
    const a = {}
    const b = {}
    schedule(a, () => calls.push('a1'))
    schedule(a, () => calls.push('a2'))
    schedule(b, () => calls.push('b'))
    expect(calls).toEqual([])
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls).toEqual(['a2', 'b'])
  })

  test('flush() runs queued tasks synchronously', () => {
    const calls: string[] = []
    schedule({}, () => calls.push('x'))
    expect(flush()).toBe(1)
    expect(calls).toEqual(['x'])
    expect(flush()).toBe(0)
  })

  test('cancel() drops a queued task', () => {
    const key = {}
    let ran = false
    schedule(key, () => {
      ran = true
    })
    cancel(key)
    flush()
    expect(ran).toBe(false)
  })

  test('tasks scheduled while flushing run in the same flush', () => {
    const calls: string[] = []
    schedule({}, () => {
      calls.push('first')
      schedule({}, () => calls.push('second'))
    })
    expect(flush()).toBe(2)
    expect(calls).toEqual(['first', 'second'])
  })

  test('idle tasks run when the browser is idle, or with flush()', async () => {
    const calls: string[] = []
    const key = {}
    scheduleIdle(key, () => calls.push('old'))
    scheduleIdle(key, () => calls.push('idle'))
    expect(calls).toEqual([])
    // Without requestIdleCallback (Node), a timer stands in.
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(calls).toEqual(['idle'])
    scheduleIdle(key, () => calls.push('flushed'))
    flush()
    expect(calls).toEqual(['idle', 'flushed'])
    scheduleIdle(key, () => calls.push('cancelled'))
    cancelIdle(key)
    flush()
    expect(calls).toEqual(['idle', 'flushed'])
  })
})
