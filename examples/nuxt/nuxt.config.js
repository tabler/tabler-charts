export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  css: ['@tabler/charts/style.css', '~/page.css'],
  telemetry: false,
  devtools: { enabled: false },
  app: { head: { title: 'Tabler Charts — Nuxt SSR' } },
})
