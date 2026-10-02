/**
 * Check every file in bundlewatch.config.cjs against its budget, offline:
 * gzip level 9 and 1 KB = 1024 bytes, as Bundlewatch measures, so the config
 * still works with it. Run after scripts/bundles.mjs (`pnpm size` runs both).
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { gzipSync } from 'node:zlib'

const ROOT = new URL('../', import.meta.url).pathname
const { files } = createRequire(import.meta.url)('../bundlewatch.config.cjs')
const UNITS = { B: 1, KB: 1024, kB: 1024, MB: 1024 ** 2 }

/** A size such as `10.5KB` or `600B`, in bytes. */
function parse(size) {
  const match = String(size).match(/^([\d.]+)\s*(B|KB|kB|MB)?$/)
  if (!match) throw new Error(`Unreadable maxSize "${size}" in bundlewatch.config.cjs`)
  return Number(match[1]) * UNITS[match[2] ?? 'B']
}

const format = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`)

let failed = false
for (const { path, maxSize } of files) {
  let size
  try {
    size = gzipSync(readFileSync(`${ROOT}${path}`), { level: 9 }).length
  } catch {
    failed = true
    console.log(`FAIL ${path.padEnd(58)} missing (build first)`)
    continue
  }
  const ok = size <= parse(maxSize)
  failed ||= !ok
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${path.padEnd(58)} ${format(size).padStart(9)}  (budget ${maxSize})`,
  )
}
if (failed) {
  console.error('\nSize budget exceeded. Raise it in bundlewatch.config.cjs only on purpose.')
  process.exit(1)
}
