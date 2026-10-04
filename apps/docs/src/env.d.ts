// Side-effect stylesheet imports handled by Vite.
declare module '*.css'

// Stylesheets as strings (for the Bootstrap demo's iframe).
declare module '*?raw' {
  const content: string
  export default content
}
declare module '*?inline' {
  const content: string
  export default content
}

// Vite's import.meta.glob, as the playground uses it (eager, one export).
interface ImportMeta {
  glob<T>(
    pattern: string,
    options: { query?: string; import?: string; eager: true },
  ): Record<string, T>
}
