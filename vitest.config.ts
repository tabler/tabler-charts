import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const core = (path: string) =>
  fileURLToPath(new URL(`./packages/core/src/${path}`, import.meta.url))

export default defineConfig({
  resolve: {
    // Adapters test against the core source, so tests need no build first.
    alias: [
      { find: /^@tabler\/charts$/, replacement: core('index.ts') },
      { find: /^@tabler\/charts\/([a-z]+)$/, replacement: core('$1.ts') },
    ],
  },
  test: {
    include: ['packages/*/{src,test}/**/*.test.ts'],
    passWithNoTests: true,
  },
})
