/** The Docs page: a short guide with a few live charts between the code blocks. */
import '@tabler/charts/style.css'
import './site.css'
import { bar, Chart, donut, line, sparkline } from '@tabler/charts'
import { setupThemeSwitch } from './theme.ts'

setupThemeSwitch()
document.querySelector('.site-nav a[href="/docs.html"]')?.setAttribute('aria-current', 'page')

// -- Copy buttons on every code block -------------------------------------------

for (const pre of document.querySelectorAll<HTMLPreElement>('.docs-body pre')) {
  const code = pre.textContent ?? ''
  const copy = document.createElement('button')
  copy.type = 'button'
  copy.className = 'docs-copy'
  copy.textContent = 'Copy'
  copy.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(code)
    copy.textContent = 'Copied'
    setTimeout(() => {
      copy.textContent = 'Copy'
    }, 1500)
  })
  pre.append(copy)
}

// -- The current section in the table of contents -------------------------------

const toc = [...document.querySelectorAll<HTMLAnchorElement>('.docs-toc a')]
const sections = toc
  .map((link) => document.getElementById(link.hash.slice(1)))
  .filter((el): el is HTMLElement => el !== null)
const markCurrent = () => {
  const line = window.scrollY + 120
  let current = sections[0]
  for (const section of sections) if (section.offsetTop <= line) current = section
  for (const link of toc) {
    if (link.hash === `#${current?.id}`) link.setAttribute('aria-current', 'true')
    else link.removeAttribute('aria-current')
  }
}
markCurrent()
window.addEventListener('scroll', markCurrent, { passive: true })

// -- Live charts ----------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

new Chart('#quick-start-chart', {
  type: line,
  data: {
    labels: MONTHS,
    series: [
      { name: 'Revenue', values: [42, 51, 47, 63, 58, 71] },
      { name: 'Costs', values: [31, 35, null, 40, 38, 44] },
    ],
  },
  y: { format: { style: 'currency', currency: 'USD' } },
  locale: 'en-US',
  aspectRatio: 2.5,
})

new Chart('#types-bar', {
  type: bar,
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: 'North', values: [42, 51, 47, 63] },
      { name: 'South', values: [31, 35, 28, 40] },
      { name: 'Target', values: [70, 80, 85, 100], type: 'line' },
    ],
  },
  stacked: true,
  radius: 3,
  legend: false,
  locale: 'en-US',
  aspectRatio: 1.6,
})

new Chart('#types-donut', {
  type: donut,
  data: [
    { name: 'Direct', value: 820 },
    { name: 'Search', value: 540 },
    { name: 'Social', value: 310 },
    { name: 'Email', value: 150 },
  ],
  legend: false,
  locale: 'en-US',
  aspectRatio: 1.6,
})

new Chart('#types-sparkline', {
  type: sparkline,
  data: [3, 5, 4, 7, 6, 9, 8, 12, 10, 13, 11, 15],
  variant: 'area',
  name: 'Visitors',
  aspectRatio: 1.6,
})

// Updating a chart: new data morphs in place, a new type morphs the marks.
const rnd = (n: number, max: number) =>
  Array.from({ length: n }, () => Math.round(10 + Math.random() * max))
const updateData = () => ({
  labels: MONTHS,
  series: [
    { name: 'Visitors', values: rnd(6, 90) },
    { name: 'Sign-ups', values: rnd(6, 40) },
  ],
})
const update = new Chart('#update-chart', {
  type: line,
  data: updateData(),
  curve: 'monotone',
  points: 'last',
  locale: 'en-US',
  aspectRatio: 2.5,
})
let isBar = false
document
  .getElementById('update-data')
  ?.addEventListener('click', () => update.setData(updateData()))
document.getElementById('update-type')?.addEventListener('click', () => {
  isBar = !isBar
  update.update({ type: isBar ? bar : line })
})

new Chart('#theming-chart', {
  type: line,
  data: {
    labels: MONTHS,
    series: [
      { name: 'Revenue', values: [42, 51, 47, 63, 58, 71] },
      { name: 'Costs', values: [31, 35, 33, 40, 38, 44] },
    ],
  },
  points: 'all',
  locale: 'en-US',
  aspectRatio: 2.5,
})
