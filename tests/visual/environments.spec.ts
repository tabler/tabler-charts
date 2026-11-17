import { expect, test } from '@playwright/test'
import { ENVIRONMENTS } from '../../apps/docs/src/environment-cases.ts'
import { installTextChecks } from './text-checks.ts'

/**
 * Hostile page CSS and unusual containers (environment.html?case=…): the
 * chart must get a size, fit its container without widening the page,
 * keep its labels inside, apart and off the plot, and hovering a bar must highlight that
 * bar with the tooltip next to the pointer (pointer coordinates survive
 * transforms, zoom and scrolling).
 */

for (const item of ENVIRONMENTS) {
  test(`${item.title}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(installTextChecks)
    await page.goto(`/environment.html?case=${item.id}`)
    await page.locator('body[data-ready]').waitFor()
    // Let the resize observer and the next frame settle.
    await page.waitForTimeout(300)
    await page.evaluate(() => new Promise(requestAnimationFrame))

    const layout = await page.evaluate(() => {
      const issues: string[] = []
      const host = document.querySelector('[data-chart]') as HTMLElement
      const svg = host.querySelector(':scope > svg.tc-chart')
      if (!svg) return { issues: ['no chart'] }
      const s = svg.getBoundingClientRect()
      if (s.width < 100 || s.height < 50)
        issues.push(`chart is ${Math.round(s.width)} × ${Math.round(s.height)}`)
      // The content box of the container, in the same (possibly zoomed) pixels.
      const h = host.getBoundingClientRect()
      const style = getComputedStyle(host)
      const scale = h.width / (host.offsetWidth || h.width || 1)
      const left =
        h.left +
        (Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.paddingLeft)) * scale
      const right =
        h.right -
        (Number.parseFloat(style.borderRightWidth) + Number.parseFloat(style.paddingRight)) * scale
      if (s.left < left - 1 || s.right > right + 1) {
        issues.push(
          `chart ${Math.round(s.left)}–${Math.round(s.right)} outside its container ${Math.round(left)}–${Math.round(right)}`,
        )
      }
      if (document.documentElement.scrollWidth > innerWidth + 1) {
        issues.push(`page widened to ${document.documentElement.scrollWidth} px`)
      }
      const check = (window as unknown as { __tcTextIssues: (svg: Element) => string[] })
        .__tcTextIssues
      issues.push(...check(svg))
      // Value labels end before the plot (a page direction must not flip their anchor).
      const plot = svg.querySelector('.tc-grid-y')?.getBoundingClientRect()
      for (const text of svg.querySelectorAll('.tc-axis-left text')) {
        const over = plot ? text.getBoundingClientRect().right - plot.left : 0
        if (over > 1) issues.push(`"${text.textContent}" ${Math.round(over)} px over the plot`)
      }
      return { issues }
    })

    // Hover the North bar of Q4: the tooltip must name Q4 and sit by the pointer.
    const target = page.locator('[data-chart] .tc-series-1 .tc-bar').nth(3)
    const box = await target.boundingBox()
    const hover: string[] = []
    if (!box) hover.push('no Q4 bar')
    else {
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      await page.mouse.move(x, y)
      await page.evaluate(() => new Promise(requestAnimationFrame))
      await page.waitForTimeout(100)
      const tip = page.locator('.tc-tooltip[data-visible]')
      if (!(await tip.count())) hover.push('no tooltip on hover')
      else {
        const title = (await tip.locator('.tc-tooltip-title').textContent())?.trim()
        if (title !== 'Q4') hover.push(`tooltip for "${title}", not Q4`)
        const t = await tip.boundingBox()
        const view = page.viewportSize() ?? { width: 0, height: 0 }
        if (t) {
          if (t.x < -1 || t.y < -1 || t.x + t.width > view.width + 1)
            hover.push('tooltip outside the viewport')
          const dx = Math.max(t.x - x, 0, x - (t.x + t.width))
          const dy = Math.max(t.y - y, 0, y - (t.y + t.height))
          if (Math.hypot(dx, dy) > 140)
            hover.push(`tooltip ${Math.round(Math.hypot(dx, dy))} px from the pointer`)
          // Never cut off by an ancestor that clips its overflow.
          const cut = await page.evaluate(() => {
            const tip = document.querySelector('.tc-tooltip[data-visible]') as HTMLElement
            const t = tip.getBoundingClientRect()
            for (let node = tip.parentElement; node; node = node.parentElement) {
              const style = getComputedStyle(node)
              if (style.overflowX === 'visible' && style.overflowY === 'visible') continue
              const c = node.getBoundingClientRect()
              return (
                t.left < c.left - 1 ||
                t.right > c.right + 1 ||
                t.top < c.top - 1 ||
                t.bottom > c.bottom + 1
              )
            }
            return false
          })
          if (cut) hover.push('tooltip cut off by a clipping parent')
        }
      }
    }
    const report = [...errors, ...layout.issues, ...hover]
    expect(report, report.join('\n')).toEqual([])
  })
}
