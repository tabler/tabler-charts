import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { pageStyles, shadowStyles } from './packages/elements/scripts/styles.mjs'

const core = (path: string) =>
  fileURLToPath(new URL(`./packages/core/src/${path}`, import.meta.url))

export default defineConfig({
  // Stylesheets the element builds inline (see packages/elements/tsdown.config.ts).
  define: {
    __TC_SHADOW_STYLES__: JSON.stringify(shadowStyles()),
    __TC_PAGE_STYLES__: JSON.stringify(pageStyles()),
  },
  resolve: {
    // Adapters test against the core source, so tests need no build first.
    alias: [
      { find: /^@tabler\/charts$/, replacement: core('index.ts') },
      { find: /^@tabler\/charts\/([a-z]+)$/, replacement: core('$1.ts') },
    ],
  },
  test: {
    include: ['packages/*/{src,test}/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
})
