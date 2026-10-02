// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/** Frames requested so far, run by hand at chosen times. */
let frames: FrameRequestCallback[] = []
let now = 0

function stubBrowser(options: { native: boolean; property?: string; duration?: string }) {
  vi.stubGlobal('CSS', { supports: () => options.native })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames[id - 1] = () => {}
  })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        transitionProperty: options.property ?? 'd',
        transitionDuration: options.duration ?? '0.4s',
        transitionDelay: '0s',
      }) as CSSStyleDeclaration,
  )
}

/** Run the pending frames at `time` ms. */
function tick(time: number) {
  now = time
  const pending = frames
  frames = []
  for (const frame of pending) frame(time)
}

async function load() {
  vi.resetModules()
  return (await import('./morph.ts')).morph
}

const path = (d: string) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', d)
  return el
}

beforeEach(() => {
  frames = []
  now = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('morph()', () => {
  test('interpolates the numbers of the path over the transition', async () => {
    stubBrowser({ native: false })
    const morph = await load()
    const el = path('M0,100V50Z')
    expect(morph(el, 'M0,100V50Z', 'M10,100V10Z')).toBe(true)
    tick(0)
    expect(el.getAttribute('d')).toBe('M0,100V50Z')
    tick(200) // halfway in time, 1 - 0.5³ = 87.5% of the way
    expect(el.getAttribute('d')).toBe('M8.75,100V15Z')
    tick(400)
    expect(el.getAttribute('d')).toBe('M10,100V10Z')
    expect(frames).toHaveLength(0)
  })

  test('an interrupted morph continues from where the path is', async () => {
    stubBrowser({ native: false })
    const morph = await load()
    const el = path('M0,0')
    morph(el, 'M0,0', 'M100,0')
    tick(0)
    tick(200) // at 87.5
    now = 200
    morph(el, 'M100,0', 'M0,0')
    tick(200)
    expect(el.getAttribute('d')).toBe('M87.5,0')
    tick(400) // halfway back in time: 87.5 × 0.125
    expect(el.getAttribute('d')).toBe('M10.94,0')
  })

  test('leaves the attribute to the caller when it should not animate', async () => {
    // A browser that transitions d in CSS.
    stubBrowser({ native: true })
    expect((await load())(path('M0,0'), 'M0,0', 'M1,1')).toBe(false)
    vi.restoreAllMocks()
    // No d transition, or a zero duration (static, resizing, reduced motion).
    stubBrowser({ native: false, property: 'opacity' })
    const morph = await load()
    expect(morph(path('M0,0'), 'M0,0', 'M1,1')).toBe(false)
    vi.restoreAllMocks()
    stubBrowser({ native: false, duration: '0s' })
    expect((await load())(path('M0,0'), 'M0,0', 'M1,1')).toBe(false)
  })

  test('a path whose commands change jumps, cancelling a running morph', async () => {
    stubBrowser({ native: false })
    const morph = await load()
    const el = path('M0,0L1,1')
    morph(el, 'M0,0L1,1', 'M5,5L6,6')
    tick(0)
    expect(morph(el, 'M5,5L6,6', 'M0,0L1,1L2,2')).toBe(false)
    tick(400)
    // The cancelled morph no longer writes the attribute.
    expect(el.getAttribute('d')).toBe('M0,0L1,1')
  })
})
