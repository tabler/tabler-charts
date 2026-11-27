/** The list of screenshot pages: every file in `pages/` shows up here by itself. */
import './frame.css'

const list = document.getElementById('pages') as HTMLElement
const names = Object.keys(import.meta.glob('./pages/*.ts'))
  .map((path) => path.replace(/^\.\/pages\//, '').replace(/\.ts$/, ''))
  .sort()

for (const name of names) {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.href = `/shot.html?page=${encodeURIComponent(name)}`
  link.textContent = name.replace(/-/g, ' ')
  item.append(link)
  list.append(item)
}
