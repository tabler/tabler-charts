/** A playground demo: renders a chart into `chart` and optional inputs into `controls`. */
export interface Demo {
  id: string
  title: string
  description: string
  mount(chart: HTMLElement, controls: DemoControls): void
}

/** Small helpers for building demo controls. */
export interface DemoControls {
  button(label: string, onClick: () => void): void
  select<T extends string>(
    label: string,
    options: readonly T[],
    value: T,
    onChange: (value: T) => void,
  ): void
  color(label: string, value: string, onChange: (value: string) => void): void
  /** A live text readout; returns a setter. */
  output(label: string): (text: string) => void
  range(
    label: string,
    options: { min: number; max: number; step: number; value: number },
    onChange: (value: number) => void,
  ): void
}

export function createControls(root: HTMLElement): DemoControls {
  const control = (label: string, input: HTMLElement) => {
    const wrap = document.createElement('label')
    wrap.className = 'control'
    wrap.append(label, input)
    root.append(wrap)
  }

  return {
    button(label, onClick) {
      const wrap = document.createElement('span')
      wrap.className = 'control'
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'control-input'
      button.textContent = label
      button.addEventListener('click', onClick)
      wrap.append(button)
      root.append(wrap)
    },
    select(label, options, value, onChange) {
      const select = document.createElement('select')
      select.className = 'control-input'
      for (const option of options) select.add(new Option(option, option, false, option === value))
      select.addEventListener('change', () => onChange(select.value as (typeof options)[number]))
      control(label, select)
    },
    color(label, value, onChange) {
      const input = document.createElement('input')
      input.type = 'color'
      input.value = value
      input.addEventListener('input', () => onChange(input.value))
      control(label, input)
    },
    output(label) {
      const out = document.createElement('output')
      out.className = 'control-output'
      out.textContent = '—'
      const wrap = document.createElement('span')
      wrap.className = 'control control-readout'
      wrap.append(`${label}: `, out)
      root.append(wrap)
      return (text) => {
        out.textContent = text || '—'
      }
    },
    range(label, { min, max, step, value }, onChange) {
      const input = document.createElement('input')
      input.type = 'range'
      Object.assign(input, { min, max, step, value })
      input.addEventListener('input', () => onChange(Number(input.value)))
      control(label, input)
    },
  }
}

/**
 * Keep an iframe as tall as its content, whatever fonts and charts make of
 * it. The content is the page's first element, measured to its bottom edge:
 * the body itself may grow with the frame (min-height: 100vh), which would
 * never settle.
 */
export function fitFrame(frame: HTMLIFrameElement, margin = 16): void {
  const content = frame.contentDocument?.body.firstElementChild
  if (!content) return
  const fit = () => {
    frame.style.height = `${Math.ceil(content.getBoundingClientRect().bottom + margin)}px`
  }
  new ResizeObserver(fit).observe(content)
  fit()
}
