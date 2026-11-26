#!/usr/bin/env node
// Builds the screenshot pages, serves the build with Vite's preview server
// and captures every page's #screenshot frame (1024×768: gradient backdrop,
// card and logo) in light and dark, at 1x and @2x: four PNG files per page,
// in captures/.
//
// Only the @2x picture is rasterized by the browser; the 1x file is that
// picture downscaled with a Lanczos filter. Chromium snaps hairlines (grid
// lines, borders) to whole pixels on a 1x surface; a supersampled 1x keeps
// their weight and gives text a smoother edge.
//
// `pnpm screenshots` captures every page, `pnpm screenshots line donut` only
// the named ones.
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from '@playwright/test'
import sharp from 'sharp'
import { build, preview } from 'vite'

type Theme = 'light' | 'dark'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pagesDir = path.join(root, 'src/pages')
const outDir = path.join(root, 'captures')
const configFile = path.join(root, 'vite.config.ts')

const PORT = Number(process.env.CAPTURE_PORT ?? 4020)

function discoverSlugs(): string[] {
  const all = readdirSync(pagesDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => file.replace(/\.ts$/, ''))
    .sort()
  const wanted = process.argv.slice(2).filter((arg) => arg !== '--')
  const unknown = wanted.filter((slug) => !all.includes(slug))
  if (unknown.length > 0) {
    console.error(`No such page: ${unknown.join(', ')}. Pages: ${all.join(', ')}`)
    process.exit(1)
  }
  return wanted.length > 0 ? all.filter((slug) => wanted.includes(slug)) : all
}

function filenameFor(slug: string, theme: Theme, scale: 1 | 2): string {
  return `${slug}${theme === 'dark' ? '-dark' : ''}${scale === 2 ? '@2x' : ''}.png`
}

async function captureOne(page: Page, baseUrl: string, slug: string, theme: Theme): Promise<void> {
  await page.goto(`${baseUrl}/shot.html?page=${slug}&theme=${theme}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.documentElement.dataset.screenshotReady === 'true', {
    timeout: 15_000,
  })
  const error = await page.evaluate(() => document.documentElement.dataset.screenshotError)
  if (error) throw new Error(`${slug}: ${error}`)

  const frame = page.locator('#screenshot')
  const box = await frame.boundingBox()
  if (!box) throw new Error(`${slug}: the #screenshot frame is not on the page`)
  const width = Math.round(box.width)
  const height = Math.round(box.height)

  const raster = await frame.screenshot()
  for (const scale of [2, 1] as const) {
    const filename = filenameFor(slug, theme, scale)
    await sharp(raster)
      .resize(width * scale, height * scale, { kernel: 'lanczos3' })
      .png()
      .toFile(path.join(outDir, filename))
    console.log(`  ✓ ${filename}`)
  }
}

async function main(): Promise<void> {
  const slugs = discoverSlugs()
  if (slugs.length === 0) {
    console.error('No pages found to capture.')
    process.exit(1)
  }

  await build({ configFile, logLevel: 'warn' })
  if (!existsSync(path.join(root, 'dist/shot.html'))) throw new Error('The build has no shot.html')
  mkdirSync(outDir, { recursive: true })

  const server = await preview({
    configFile,
    logLevel: 'warn',
    preview: { port: PORT, strictPort: true, host: '127.0.0.1' },
  })
  const baseUrl = `http://127.0.0.1:${PORT}`

  const browser = await chromium.launch()
  try {
    // The frame sits centered in the viewport, on whole pixels.
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
      locale: 'en-US',
      timezoneId: 'UTC',
    })
    for (const slug of slugs) {
      console.log(slug)
      await captureOne(page, baseUrl, slug, 'light')
      await captureOne(page, baseUrl, slug, 'dark')
    }
    console.log(
      `\n${slugs.length * 4} screenshots written to ${path.relative(path.join(root, '../..'), outDir)}/`,
    )
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
