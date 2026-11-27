import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const core = (path: string) =>
  fileURLToPath(new URL(`../../packages/core/src/${path}`, import.meta.url))
const page = (name: string) => fileURLToPath(new URL(`./${name}.html`, import.meta.url))

// The library comes from source, as in the playground: a picture shows the
// working tree, with no package build in between.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { port: 3020 },
  resolve: {
    alias: [
      { find: '@tabler/charts/style.css', replacement: core('style.css') },
      { find: /^@tabler\/charts\/maps\/world$/, replacement: core('maps/world.ts') },
      { find: /^@tabler\/charts$/, replacement: core('index.ts') },
    ],
  },
  build: {
    target: 'es2022',
    rollupOptions: { input: { main: page('index'), shot: page('shot') } },
  },
})
