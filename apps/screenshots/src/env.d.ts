// Side-effect stylesheet imports and asset URLs handled by Vite.
declare module '*.css'
declare module '*.svg' {
  const url: string
  export default url
}

// Vite's import.meta.glob, as these pages use it.
interface ImportMeta {
  glob<T>(pattern: string, options?: { eager?: false }): Record<string, () => Promise<T>>
}
