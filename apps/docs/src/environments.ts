/** Every environment case side by side, each in an iframe of its own. */
import './site.css'
import { ENVIRONMENTS } from './environment-cases.ts'
import { setupThemeSwitch } from './theme.ts'

setupThemeSwitch()
const grid = document.getElementById('environments') as HTMLElement
for (const item of ENVIRONMENTS) {
  const card = document.createElement('figure')
  card.className = 'gallery-item'
  const caption = document.createElement('figcaption')
  const strong = document.createElement('strong')
  strong.textContent = item.title
  caption.append(strong, ` ${item.expect}`)
  const frame = document.createElement('iframe')
  frame.src = `/environment.html?case=${item.id}`
  frame.title = item.title
  frame.className = 'environment-frame'
  card.append(caption, frame)
  grid.append(card)
}
document
  .querySelector('.site-nav a[href="/environments.html"]')
  ?.setAttribute('aria-current', 'page')
