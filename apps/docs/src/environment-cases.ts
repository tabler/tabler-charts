/**
 * The environment cases as plain data (no imports), so the Playwright spec
 * can read them in Node too. Rendered by environment.ts.
 */
export interface Environment {
  id: string
  title: string
  /** What should happen. */
  expect: string
  /** Page CSS: resets, frameworks, hostile rules. */
  css?: string
  /** Markup around the chart; the chart renders into `[data-chart]`. */
  html?: string
  /** On <html>: e.g. `dir="rtl"`. */
  root?: Record<string, string>
  /** Something to do after the chart is created (show a hidden container …). */
  after?: (host: HTMLElement) => void | Promise<void>
}

/** Where the chart renders. */
export const CHART = '<div data-chart></div>'

export const ENVIRONMENTS: Environment[] = [
  {
    id: 'tailwind',
    title: 'Tailwind preflight',
    expect:
      'border-box everywhere, svg display:block and max-width:100%, buttons reset: chart and legend unchanged.',
    css: `*,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}
html{line-height:1.5;font-family:ui-sans-serif,system-ui,sans-serif}body{margin:0;line-height:inherit}
img,svg,video,canvas{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}
button,input,select{font:inherit;color:inherit;margin:0;padding:0;background-color:transparent;background-image:none}
button{cursor:pointer}table{border-collapse:collapse;text-indent:0;border-color:inherit}`,
  },
  {
    id: 'bootstrap-reboot',
    title: 'Bootstrap reboot',
    expect:
      'svg vertical-align, table caption at the bottom, th alignment: the chart and its table look right.',
    css: `*,::before,::after{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;font-size:1rem;line-height:1.5}
svg,img{vertical-align:middle}table{caption-side:bottom;border-collapse:collapse}caption{padding:.5rem 0;color:#6c757d;text-align:left}
th{text-align:inherit}button{border-radius:0;margin:0;font-family:inherit;font-size:inherit;line-height:inherit}`,
  },
  {
    id: 'global-transition',
    title: 'Global transition: all 1s',
    expect:
      'The page animates everything slowly; the chart still renders at its size and the tooltip follows the pointer.',
    css: '*{transition:all 1s}',
  },
  {
    id: 'svg-sizing',
    title: 'svg { width: 100%; height: 100px }',
    expect: 'A page rule that sizes every svg: the chart keeps its own proportions.',
    css: 'svg{width:100%;height:100px}',
  },
  {
    id: 'text-size',
    title: 'text { font-size: 20px }',
    expect: 'A page rule on every SVG text: labels must not overlap or leave the chart.',
    css: 'text{font-size:20px}',
  },
  {
    id: 'letter-spacing',
    title: 'Letter spacing and uppercase on the body',
    expect: 'Inherited text styles: labels stay apart and inside.',
    css: 'body{letter-spacing:.15em;text-transform:uppercase;word-spacing:.5em}',
  },
  {
    id: 'line-height',
    title: 'line-height: 0 on the body',
    expect: 'The legend and tooltip keep readable lines.',
    css: 'body{line-height:0}',
  },
  {
    id: 'rtl',
    title: 'Right-to-left page',
    expect:
      'dir="rtl": the plot stays left to right, labels inside, the legend may flow right to left.',
    root: { dir: 'rtl' },
  },
  {
    id: 'large-root-font',
    title: 'html { font-size: 24px }',
    expect: 'A large rem base: the chart uses its own font size.',
    css: 'html{font-size:24px}',
  },
  {
    id: 'hidden-at-start',
    title: 'Hidden when created',
    expect:
      'display:none at first (width 0), shown 200 ms later: the chart fills the container then.',
    html: `<div id="tab" style="display:none">${CHART}</div>`,
    after: () =>
      new Promise((resolve) =>
        setTimeout(() => {
          ;(document.getElementById('tab') as HTMLElement).style.display = 'block'
          resolve()
        }, 200),
      ),
  },
  {
    id: 'details',
    title: 'Inside a closed <details>',
    expect: 'Opened 200 ms later: the chart sizes itself.',
    html: `<details id="more"><summary>More</summary>${CHART}</details>`,
    after: () =>
      new Promise((resolve) =>
        setTimeout(() => {
          ;(document.getElementById('more') as HTMLDetailsElement).open = true
          resolve()
        }, 200),
      ),
  },
  {
    id: 'flex',
    title: 'Flex row without min-width: 0',
    expect: 'Beside a 200 px sidebar: the chart shrinks with the page instead of pushing it wider.',
    html: `<div style="display:flex;gap:16px"><aside style="flex:0 0 200px;background:#eee">Sidebar</aside><main style="flex:1">${CHART}</main></div>`,
  },
  {
    id: 'grid',
    title: 'Grid with 1fr columns',
    expect: 'Two equal columns: the chart fits its column.',
    html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div>${CHART}</div><div style="background:#eee">Other</div></div>`,
  },
  {
    id: 'scaled',
    title: 'Parent with transform: scale(0.75)',
    expect: 'Hovering a bar still highlights that bar: pointer coordinates follow the transform.',
    html: `<div style="transform:scale(.75);transform-origin:0 0;width:133%">${CHART}</div>`,
  },
  {
    id: 'zoom',
    title: 'Parent with zoom: 1.5',
    expect: 'CSS zoom: hovering a bar highlights that bar.',
    html: `<div style="zoom:1.5;width:66%">${CHART}</div>`,
  },
  {
    id: 'padding-border',
    title: 'Container with padding and a thick border',
    expect: 'The chart fills the content box, not the border box.',
    html: '<div data-chart style="padding:24px;border:12px solid #ddd;box-sizing:border-box"></div>',
  },
  {
    id: 'scroll-container',
    title: 'Inside a scrolled container',
    expect:
      'Scrolled 300 px down: the tooltip appears next to the pointer, not offset by the scroll.',
    html: `<div id="scroller" style="height:340px;overflow:auto;border:1px solid #ddd"><div style="height:300px"></div>${CHART}<div style="height:300px"></div></div>`,
    after: () => {
      ;(document.getElementById('scroller') as HTMLElement).scrollTop = 300
    },
  },
  {
    id: 'overflow-hidden',
    title: 'Inside overflow: hidden, near its edge',
    expect: 'A narrow clipping parent: the tooltip stays inside the chart instead of being cut.',
    html: `<div style="overflow:hidden;width:360px;border:1px solid #ddd">${CHART}</div>`,
  },
  {
    id: 'table-cell',
    title: 'Inside a table cell',
    expect:
      'Auto table layout: the chart takes the cell width and does not grow the table forever.',
    html: `<table style="width:100%"><tr><td style="width:50%">Label</td><td>${CHART}</td></tr></table>`,
  },
  {
    id: 'inline-span',
    title: 'Inside an inline <span>',
    expect: 'A chart in inline content: it still gets a width.',
    html: `<p>Text before <span>${CHART}</span> text after.</p>`,
  },
]
