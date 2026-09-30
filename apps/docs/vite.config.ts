import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const core = (path: string) =>
  fileURLToPath(new URL(`../../packages/core/src/${path}`, import.meta.url))
const elements = (path: string) =>
  fileURLToPath(new URL(`../../packages/elements/src/${path}`, import.meta.url))

// Import the library from source: no build step, instant HMR while developing it.
export default defineConfig({
  resolve: {
    alias: [
      { find: '@tabler/charts/style.css', replacement: core('style.css') },
      { find: /^@tabler\/charts\/core$/, replacement: core('core.ts') },
      { find: /^@tabler\/charts$/, replacement: core('index.ts') },
      { find: /^@tabler\/charts-elements$/, replacement: elements('index.ts') },
    ],
  },
  build: {
    target: 'es2022',
  },
})
