/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compileString } from 'sass'

const scssDir = fileURLToPath(new URL('../scss/', import.meta.url))
/** Compile a snippet that loads the package's partials, like an app would. */
const app = (source: string) =>
  compileString(source, {
    loadPaths: [scssDir],
    style: 'expanded',
    silenceDeprecations: ['import'],
  }).css

import { describe, expect, test } from 'vitest'

const scssPath = fileURLToPath(new URL('../scss/_charts.scss', import.meta.url))
const scss = readFileSync(scssPath, 'utf8')
const core = readFileSync(new URL('../../core/src/style.css', import.meta.url), 'utf8')

const compile = (prelude = '') => compileString(`${prelude}\n${scss}`, { style: 'expanded' }).css

/** Declarations of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) return ''
  return css.slice(start, css.indexOf('}', start))
}

/** `--tc-color-N` values (2–8) declared in a block of text. */
const palette = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/--tc-color-([2-8]):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]),
  )

describe('bootstrap mapping', () => {
  test('maps the theme tokens to Bootstrap variables on :root and every [data-bs-theme]', () => {
    const tokens = rule(compile(), ':where(:root, [data-bs-theme])')
    expect(tokens).toContain('--tc-color-1: var(--bs-primary, #2a78d6)')
    expect(tokens).toContain('--tc-surface: var(--bs-body-bg, #fff)')
    expect(tokens).toContain('--tc-text-color: var(--bs-body-color, #0b0b0b)')
    expect(tokens).toContain('--tc-grid-color: var(--bs-border-color-translucent, #e1e0d9)')
    expect(tokens).toContain('--tc-font-family: var(--bs-body-font-family, inherit)')
    // Derived tokens are declared with the mapping, not inherited from :root.
    expect(tokens).toContain('--tc-focus-color: var(--bs-primary, #2a78d6)')
    expect(tokens).toContain('--tc-tooltip-color: var(--bs-body-color, #0b0b0b)')
  })

  test('keeps the validated chart palette for series 2–8, per data-bs-theme', () => {
    const css = compile()
    const light = palette(rule(css, ':where(:root, [data-bs-theme=light])'))
    const dark = palette(rule(css, ':where([data-bs-theme=dark])'))
    // The same values as the core stylesheet's light and dark blocks.
    const coreLight = palette(core.slice(0, core.indexOf('@media (prefers-color-scheme: dark)')))
    const coreDark = palette(core.slice(core.indexOf(':where([data-theme="dark"])')))
    expect(Object.keys(light)).toHaveLength(7)
    expect(light).toEqual(coreLight)
    expect(dark).toEqual(coreDark)
  })

  test('variables can be overridden before the import, including the prefix', () => {
    const css = compile(
      '$tc-prefix: "app-"; $tc-series-1: var(--app-success); $tc-palette-light: (2: #123456);',
    )
    expect(css).toContain(':where(:root, [data-app-theme])')
    expect(css).toContain('--tc-color-1: var(--app-success)')
    expect(css).toContain(':where([data-app-theme=dark])')
    expect(palette(rule(css, ':where(:root, [data-app-theme=light])'))).toEqual({ 2: '#123456' })
  })

  test('the built CSS is the compiled SCSS, minified with the banner', () => {
    const built = readFileSync(new URL('../dist/bootstrap.css', import.meta.url), 'utf8')
    expect(built.startsWith('/*! @tabler/charts-bootstrap | MIT */')).toBe(true)
    expect(built).toContain(':where(:root,[data-bs-theme]){--tc-color-1:var(--bs-primary,#2a78d6)')
    expect(built).toContain(':where([data-bs-theme=dark]){--tc-color-2:#d95926')
  })

  describe('Tabler preset', () => {
    const tabler = app('@use "tabler";')

    test('reads --tblr-* variables, keeps data-bs-theme and scopes the theme options', () => {
      const scopes =
        ':where(:root, [data-bs-theme], [data-bs-theme-primary], [data-bs-theme-base], [data-bs-theme-font], [data-bs-theme-radius])'
      const tokens = rule(tabler, scopes)
      expect(tokens).toContain('--tc-color-1: var(--tblr-primary, #066fd1)')
      // Charts sit on cards: the surface is Tabler's card background.
      expect(tokens).toContain('--tc-surface: var(--tblr-bg-surface, #fff)')
      expect(tokens).toContain('--tc-tooltip-bg: var(--tblr-bg-surface, #fff)')
      expect(tokens).toContain('--tc-text-muted: var(--tblr-secondary, #6f6e69)')
      expect(tokens).toContain('--tc-grid-color: var(--tblr-border-color-translucent, #e1e0d9)')
      expect(tokens).toContain('--tc-font-family: var(--tblr-body-font-family, inherit)')
      expect(tabler).not.toContain('--bs-')
      expect(palette(rule(tabler, ':where([data-bs-theme=dark])'))).toEqual(
        palette(rule(compile(), ':where([data-bs-theme=dark])')),
      )
    })

    test('can be configured with @use … with, or with variables before @import', () => {
      const used = app('@use "tabler" with ($tc-series-1: var(--tblr-green));')
      expect(used).toContain('--tc-color-1: var(--tblr-green)')
      expect(used).toContain('--tc-surface: var(--tblr-bg-surface, #fff)')
      const imported = app('$tc-series-1: var(--tblr-red); @import "tabler";')
      expect(imported).toContain('--tc-color-1: var(--tblr-red)')
      expect(imported).toContain('--tc-text-muted: var(--tblr-secondary, #6f6e69)')
    })

    test('the built tabler.css is the compiled preset', () => {
      const built = readFileSync(new URL('../dist/tabler.css', import.meta.url), 'utf8')
      expect(built.startsWith('/*! @tabler/charts-bootstrap, Tabler preset | MIT */')).toBe(true)
      expect(built).toContain('--tc-color-1:var(--tblr-primary,#066fd1)')
      expect(built).toContain(':where([data-bs-theme=dark]){--tc-color-2:#d95926')
    })
  })
})
