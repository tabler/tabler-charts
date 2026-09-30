import { defineConfig } from 'tsdown'
import { baseConfig } from '../../tsdown.config.base.ts'

export default defineConfig({
  ...baseConfig,
  entry: ['src/index.ts'],
  // The components use hooks: mark the module as client code for React Server Components.
  outputOptions: { banner: "'use client';" },
})
