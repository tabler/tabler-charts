// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { arcPathStable } from '../shapes/arc.ts'
import { arcData, sweep } from './sweep.ts'

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
const attrs = (startAngle: number, endAngle: number) => ({
  d: arcPathStable(arc(startAngle, endAngle)),
  'data-arc': arcData(arc(startAngle, endAngle)),
})
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
    const from = attrs(0, 1)
    const to = attrs(2, 4.5)
    const el = path(from.d)
    expect(sweep(el, from, to)).toBe(true)
    tick(0)
    expect(el.getAttribute('d')).toBe(from.d)
    tick(200)
    // Ease out: 87.5% of the way at half the time.
    expect(el.getAttribute('d')).toBe(arcPathStable(arc(1.75, 4.0625)))
    // A slice in between is still a slice of the ring: nothing bends inside it.
    expect(reach(el.getAttribute('d') as string)).toBeCloseTo(100, 1)
    tick(400)
    expect(el.getAttribute('d')).toBe(to.d)
    expect(frames).toHaveLength(0)
  })

  test('an interrupted sweep continues from where the arc is', () => {
    const from = attrs(0, 1)
    const el = path(from.d)
    sweep(el, from, attrs(2, 4.5))
    tick(0)
    tick(200)
    const back = attrs(0, 1)
    expect(sweep(el, attrs(2, 4.5), back)).toBe(true)
    tick(200)
    expect(el.getAttribute('d')).toBe(arcPathStable(arc(1.75, 4.0625)))
    tick(600)
    expect(el.getAttribute('d')).toBe(back.d)
  })

  test('leaves paths without an arc, and charts without transitions, to the caller', () => {
    const from = attrs(0, 1)
    const to = attrs(2, 4.5)
    const el = path(from.d)
    expect(sweep(el, { d: from.d }, to)).toBe(false)
    expect(sweep(el, from, { d: to.d })).toBe(false)
    duration = '0s'
    expect(sweep(el, from, to)).toBe(false)
    duration = ''
    expect(sweep(el, from, to)).toBe(false)
    expect(frames).toHaveLength(0)
  })

  test('a sweep that is running stops when the path is set without one', () => {
    const from = attrs(0, 1)
    const el = path(from.d)
    sweep(el, from, attrs(2, 4.5))
    duration = '0s'
    expect(sweep(el, attrs(2, 4.5), attrs(3, 4))).toBe(false)
    el.setAttribute('d', 'M0,0')
    tick(200)
    expect(el.getAttribute('d')).toBe('M0,0')
  })
})
