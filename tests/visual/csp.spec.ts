import { expect, type Page, test } from '@playwright/test'

/**
 * A strict Content Security Policy: `style-src 'self'` (no 'unsafe-inline')
 * blocks style attributes in markup and set with setAttribute, and <style>
 * elements without a nonce. The charts must render, interact and keep their
 * colors and layout without tripping it (styles set through the CSSOM and
 * constructable stylesheets are allowed).
 *
 * Server-rendered markup is the exception: its style attributes are blocked
 * as the page parses them (and reported), then set again by hydration. The
 * React and Vue components always start from that markup, so their demos
 * may report, but every style must end up applied.
 */

/** Demos whose charts start from server-rendered markup. */
const PRERENDERED = ['react', 'vue']

const POLICY =
  "default-src 'self'; style-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'"

async function open(page: Page, path: string): Promise<string[]> {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/*', async (route) => {
    const response = await route.fetch()
    const type = response.headers()['content-type'] ?? ''
    if (!type.includes('text/html')) return route.fulfill({ response })
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': POLICY },
    })
  })
  await page.addInitScript((prerendered: string[]) => {
    const found: string[] = []
    ;(window as unknown as { __csp: string[] }).__csp = found
    document.addEventListener(
      'securitypolicyviolation',
      (event) => {
        const el = event.target instanceof Element ? event.target : null
        if (prerendered.includes(el?.closest('section')?.id ?? '')) return
        const where = el
          ? `${el.localName}${el.getAttribute('class') ? `.${el.getAttribute('class')?.split(' ')[0]}` : ''}`
          : String(event.target)
        found.push(`${event.violatedDirective} ${where}: ${event.sample.slice(0, 60)}`)
      },
      true,
    )
  }, PRERENDERED)
  await page.goto(path)
  return errors
}

const violations = (page: Page) =>
  page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)

for (const path of ['/', '/cases.html', '/examples.html']) {
  test(`charts render under a strict CSP: ${path}`, async ({ page }) => {
    const errors = await open(page, path)
    await page.locator('svg.tc-chart').first().waitFor()
    await page.waitForTimeout(500)
    // Hover the first chart: the tooltip and highlight styles must pass too.
    const box = await page.locator('svg.tc-chart').first().boundingBox()
    if (box) await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5)
    await page.waitForTimeout(100)
    const found = [...new Set(await violations(page))]
    // A blocked style attribute is present but empty in the CSSOM.
    const unstyled = await page.evaluate(() => {
      const out = new Set<string>()
      for (const el of document.querySelectorAll<SVGElement | HTMLElement>(
        '.tc-chart [style], .tc-container [style]',
      )) {
        if (el.getAttribute('style')?.trim() && el.style.length === 0) {
          out.add(`${el.localName}.${el.getAttribute('class')?.split(' ')[0]} unstyled`)
        }
      }
      return [...out]
    })
    const report = [...errors, ...found, ...unstyled]
    expect(report, report.join('\n')).toEqual([])
  })
}
