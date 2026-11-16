// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { arcNode, sweep } from './sweep.ts'

/** Frames requested so far, run by hand at chosen times. */
let frames: FrameRequestCallback[] = []
let now = 0

/** Run the pending frames at `time` ms. */
function tick(time: number) {
  now = time
  const pending = frames
  frames = []
  for (const frame of pending) frame(time)
}

const arc = (startAngle: number, endAngle: number) => ({
  innerRadius: 60,
  outerRadius: 100,
  startAngle,
  endAngle,
  padAngle: 0.02,
  cornerRadius: 4,
})
const node = (startAngle: number, endAngle: number) =>
  arcNode('tc-slice', arc(startAngle, endAngle))
const d = (startAngle: number, endAngle: number) => String(node(startAngle, endAngle).attrs.d)
const path = (d: string) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', d)
  return el
}
/** Farthest any point of the path lies from the center. */
const reach = (d: string) => {
  const points = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)(?=[A-Z]|$)/g)]
  return Math.max(...points.map((p) => Math.hypot(Number(p[1]), Number(p[2]))))
}

let duration = '0.4s'

beforeEach(() => {
  frames = []
  now = 0
  duration = '0.4s'
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames[id - 1] = () => {}
  })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () => ({ transitionDuration: duration }) as CSSStyleDeclaration,
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sweep()', () => {
  test('draws the arcs in between, on the ring', () => {
    const el = path(d(0, 1))
    // The attributes left to patch: all of them, but the path as it is.
    expect(sweep(el, node(0, 1), node(2, 4.5))).toEqual({ class: 'tc-slice', d: d(0, 1) })
    tick(0)
    expect(el.getAttribute('d')).toBe(d(0, 1))
    tick(200)
    // Ease out: 87.5% of the way at half the time.
    expect(el.getAttribute('d')).toBe(d(1.75, 4.0625))
    // A slice in between is still a slice of the ring: nothing bends inside it.
    expect(reach(el.getAttribute('d') as string)).toBeCloseTo(100, 1)
    tick(400)
    expect(el.getAttribute('d')).toBe(d(2, 4.5))
    expect(frames).toHaveLength(0)
  })

  test('an interrupted sweep continues from where the arc is', () => {
    const el = path(d(0, 1))
    sweep(el, node(0, 1), node(2, 4.5))
    tick(0)
    tick(200)
    expect(sweep(el, node(2, 4.5), node(0, 1))).toBeDefined()
    tick(200)
    expect(el.getAttribute('d')).toBe(d(1.75, 4.0625))
    tick(600)
    expect(el.getAttribute('d')).toBe(d(0, 1))
  })

  test('leaves other paths, and charts without transitions, to the caller', () => {
    const el = path(d(0, 1))
    const plain = (node: ReturnType<typeof arcNode>) => ({ ...node, arc: undefined })
    // Not an arc, no arc to come from, the same path.
    expect(sweep(el, node(0, 1), plain(node(2, 4.5)))).toBeUndefined()
    expect(sweep(el, plain(node(0, 1)), node(2, 4.5))).toBeUndefined()
    expect(sweep(el, node(0, 1), node(0, 1))).toBeUndefined()
    duration = '0s'
    expect(sweep(el, node(0, 1), node(2, 4.5))).toBeUndefined()
    duration = ''
    expect(sweep(el, node(0, 1), node(2, 4.5))).toBeUndefined()
    expect(frames).toHaveLength(0)
  })

  test('a sweep that is running stops when the path is set without one', () => {
    const el = path(d(0, 1))
    sweep(el, node(0, 1), node(2, 4.5))
    duration = '0s'
    expect(sweep(el, node(2, 4.5), node(3, 4))).toBeUndefined()
    el.setAttribute('d', 'M0,0')
    tick(200)
    expect(el.getAttribute('d')).toBe('M0,0')
  })
})
