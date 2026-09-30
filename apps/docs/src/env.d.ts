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
