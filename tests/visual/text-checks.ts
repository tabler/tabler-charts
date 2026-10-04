/**
 * Label checks shared by the specs, run inside the page (installed with
 * page.addInitScript(installTextChecks) as window.__tcTextIssues): every
 * text of a chart inside its svg, and none on top of another of its kind.
 */
export function installTextChecks(): void {
  ;(window as unknown as { __tcTextIssues: (svg: Element) => string[] }).__tcTextIssues = (
    svg: Element,
  ) => {
    const issues: string[] = []
    const frame = svg.getBoundingClientRect()
    // Some engines (Firefox) pad every text box by a constant: w(a) + w(b) - w(ab).
    const probe = (value: string) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('class', 'tc-tick-label')
      text.textContent = value
      svg.append(text)
      const width = text.getBoundingClientRect().width
      text.remove()
      return width
    }
    const pad = Math.max(0, (probe('Ab') + probe('cd') - probe('Abcd')) / 2)
    const box = (text: Element) => {
      const r = text.getBoundingClientRect()
      return new DOMRect(r.x + pad, r.y, Math.max(0, r.width - pad * 2), r.height)
    }
    const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent)
    const kinds = new Map<string, DOMRect[]>()
    for (const text of texts) {
      const r = box(text)
      if (!r.width) continue
      const out = Math.max(
        frame.left - r.left,
        r.right - frame.right,
        frame.top - r.top,
        r.bottom - frame.bottom,
      )
      if (out > 1.5) issues.push(`"${text.textContent}" ${Math.round(out)} px outside`)
      const kind =
        text.closest('.tc-axis')?.getAttribute('class') ?? text.getAttribute('class') ?? ''
      if (/gauge|pie/.test(kind)) continue
      const others = kinds.get(kind) ?? []
      // Engines differ in how tall a text box is (Firefox takes the whole line):
      // touching boxes are fine, sharing a third of their height is not.
      const overlaps = (o: DOMRect) =>
        Math.min(o.right, r.right) - Math.max(o.left, r.left) > 1 &&
        Math.min(o.bottom, r.bottom) - Math.max(o.top, r.top) > Math.min(o.height, r.height) * 0.3
      if (others.some(overlaps)) {
        issues.push(`"${text.textContent}" overlaps a label`)
      }
      kinds.set(kind, [...others, r])
    }
    return issues
  }
}
