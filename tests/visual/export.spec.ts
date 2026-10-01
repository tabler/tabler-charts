import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'

/**
 * Export through the playground's export demo: the downloaded SVG must look
 * like the chart on its own (no stylesheet), and images come at 2×.
 */

async function open(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((mode) => localStorage.setItem('tc-docs-theme', mode), theme)
  await page.goto('/#export')
  await page.locator('#export svg.tc-chart').waitFor()
  await page.evaluate(() => document.fonts.ready)
}

async function download(page: Page, format: string): Promise<Buffer> {
  await page.locator('#export select').first().selectOption(format)
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#export button', { hasText: 'Download' }).click(),
  ])
  expect(file.suggestedFilename()).toBe(`Revenue and costs.${format === 'jpeg' ? 'jpg' : format}`)
  return readFile((await file.path()) as string)
}

for (const theme of ['light', 'dark'] as const) {
  test(`the exported svg stands on its own, ${theme}`, async ({ page, browser }) => {
    await open(page, theme)
    const svg = (await download(page, 'svg')).toString()
    expect(svg).toMatch(/^<svg [^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    expect(svg).not.toContain('tc-hover')
    // Rendered in a blank page: no stylesheet, no custom properties.
    const blank = await browser.newPage({ viewport: { width: 1024, height: 600 } })
    await blank.setContent(`<body style="margin:0">${svg}</body>`)
    await expect(blank.locator('svg')).toHaveScreenshot(`export-svg-${theme}.png`)
    await blank.close()
  })
}

test('images are drawn at twice the chart size', async ({ page }) => {
  await open(page, 'light')
  const box = await page.locator('#export svg.tc-chart').boundingBox()
  const png = await download(page, 'png')
  // PNG header: width and height as big-endian integers at bytes 16 and 20.
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect(png.readUInt32BE(16)).toBe(Math.round((box?.width ?? 0) * 2))
  expect(png.readUInt32BE(20)).toBeGreaterThan(Math.round((box?.height ?? 0) * 2))
  const jpeg = await download(page, 'jpeg')
  expect(jpeg[0]).toBe(0xff)
  expect(jpeg[1]).toBe(0xd8)
})
