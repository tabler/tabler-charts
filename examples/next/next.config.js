import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
export default {
  // The chart packages live in the monorepo, outside this app.
  turbopack: { root: fileURLToPath(new URL('../..', import.meta.url)) },
}
