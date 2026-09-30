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
    range(label, { min, max, step, value }, onChange) {
      const input = document.createElement('input')
      input.type = 'range'
      Object.assign(input, { min, max, step, value })
      input.addEventListener('input', () => onChange(Number(input.value)))
      control(label, input)
    },
  }
}
