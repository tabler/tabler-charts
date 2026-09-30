import '@tabler/charts/style.css'
import './page.css'

export const metadata = { title: 'Tabler Charts — Next.js SSR' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
