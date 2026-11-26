# Accessibility

Tabler Charts aims for WCAG 2.2 AA. A chart is a picture of data, so the work is making that data reachable without seeing the picture, without a pointer, and without relying on color. This page says what the library does by default, what is left to you, and where the limits are.

## What every chart has

| | Default | Option |
| --- | --- | --- |
| Accessible name | From `title`, else generated from the series names | `title` |
| Description | None | `description` |
| Data table for screen readers | On, visually hidden | `table` |
| Keyboard navigation | On (sparklines opt out) | `keyboard` |
| Reduced motion | Follows `prefers-reduced-motion` | `animate` |
| Forced colors | Supported, with pattern fills | `patterns` |
| Point shapes per series | Off | `shapes` |

These come with the default `Chart` from `@tabler/charts`. The bare `Chart` from `@tabler/charts/core` has no plugins: add `dataTable()` and `keyboard()` yourself, and import `@tabler/charts/patterns` and `@tabler/charts/point-shapes` for those features.

## Screen readers

**Name and description.** The `<svg>` is a `role="img"` with an `aria-label`. With `title` it is the title. Without one the name is generated, for example "line chart: Revenue, Costs" (at most six series names). `description` becomes a `<desc>` that the chart points to with `aria-describedby`. The name is an attribute rather than an svg `<title>`, which browsers would also show as a native tooltip.

**Data table.** Next to the SVG sits an HTML table of the same data: a `<caption>` with the title, column headers with `scope="col"`, row headers with `scope="row"`, and values formatted for the chart's `locale`. It is visually hidden by default; `table: 'visible'` shows it and `table: false` removes it. Series hidden from the legend leave the table too. Tables are cut at 1000 rows (`table: { maxRows }`), and the caption says so ("1,000 of 5,200 rows").

**Decorations.** Grid lines, axis ticks, hover layers and legend swatches are `aria-hidden`. The tooltip is too: what it shows is announced through the live region below instead.

## Keyboard

The chart is one tab stop. Once it has focus:

| Key | Action |
| --- | --- |
| Left / Right | Previous / next category |
| Up / Down | Previous / next series in that category |
| Home / End | First / last category |
| Escape | Clear the highlight |

Each step moves the highlight and the tooltip and is announced through a polite live region ("Tue: Revenue 1,240, Costs 980", or only the focused series). Leaving the chart clears the highlight. Only handled keys are kept from the page, so other keys still scroll it.

- In right-to-left charts the arrows follow the screen: Left moves to the category on the left.
- In a calendar, Left and Right move by weeks and Up and Down by days.
- In synced charts (`sync`), a keyboard highlight stays in its own chart.

**Legend.** Entries that toggle a series are buttons: focusable, operated with Enter or Space, with `aria-pressed` reflecting whether the series is shown.

**Download menu.** The toggle has an `aria-label` (`label` option, "Download" by default), `aria-haspopup="menu"` and `aria-expanded`. Opening it moves focus to the first item, Up and Down walk the items, and Escape closes it and returns focus to the toggle.

**Focus.** The chart, legend entries and menu items show a 2px outline on `:focus-visible`, in `--tc-focus-color` (the first series color by default).

## Color

- **Palette.** The eight series colors are checked for separation under color vision deficiencies, in the light and the dark theme. Axis text meets AA contrast.
- **Never color alone.** The legend, the tooltip and the data table name every series.
- **Point shapes.** `shapes: true` gives the points of line, radar and scatter charts a shape per series (circle, square, triangle, diamond…), matched in the legend and tooltip swatches.
- **Patterns.** `patterns: true` fills bars, areas, slices, rings and bubbles with a pattern per series and gives lines a dash, so series are told apart without color at all (also in grayscale print). Exports keep them.
- **Forced colors.** In Windows High Contrast the chart is drawn in system colors (`CanvasText`, `Canvas`, `GrayText`, `Highlight`). The series colors are gone there, so patterns turn on by themselves (`patterns: 'auto'`, the default).
- **Dark mode** follows `prefers-color-scheme`; `data-theme="dark"` or `"light"` on any ancestor overrides it.

## Motion

`prefers-reduced-motion: reduce` sets the transition durations to zero for charts and tooltips. `animate: false` does the same for one chart.

## What is left to you

- **Set a `title`.** The generated name is in English and only lists series. A title in the page's language says what the chart is about; add a `description` for the takeaway ("Revenue grew 12% over the quarter").
- **Set a `locale`** so values in the table, the tooltip and the announcements are formatted for your readers.
- **Name your series.** Names are what the legend, the table and the announcements read out.
- **Check your own colors.** `series.color` and overridden `--tc-*` tokens are not checked for contrast or colorblind separation. Turn on `shapes` or `patterns` when in doubt.
- **Think before turning things off.** `table: false` and `keyboard: false` take the data away from screen reader and keyboard users. Give them the same data some other way.
- **Sparklines** are not focusable by default. They are meant to sit next to the number they illustrate; make sure that number is in the text.

## Known limits

- Three of the light-theme series colors have less than 3:1 contrast against a white surface. The tooltip and the data table are what carry the values there; use `patterns` or `shapes` if the marks themselves must stand out.
- Marks are not separate focus stops or accessibility nodes. Screen reader users read values from the data table, or from the announcements while walking the chart with the arrow keys.
- The generated chart name and the "… of … rows" note in a cut table's caption are in English.
- `chartToString()` returns the SVG only. The data table and the live region are added when the chart mounts in the browser.

## How it is tested

- **axe-core** (WCAG 2.0, 2.1 and 2.2, levels A and AA) runs in Playwright over the whole playground, every chart type and adapter, in the light and the dark theme, and again with the interactive states showing: an open tooltip, a visible data table, keyboard focus and a hidden series. See [tests/visual/a11y.spec.ts](tests/visual/a11y.spec.ts).
- **Unit tests** cover the table markup, the keyboard walk and its announcements, right-to-left behavior and cleanup. See [packages/core/src/a11y.test.ts](packages/core/src/a11y.test.ts).

```bash
pnpm test      # unit tests
pnpm visual    # Playwright, including the axe audit
```

Automated checks find only part of the problems. Before a release, walk a chart with VoiceOver or NVDA and with the keyboard alone.

## Reporting a problem

Open an issue at [tabler/tabler-charts](https://github.com/tabler/tabler-charts/issues) with the chart type, the browser and the assistive technology, and what you expected to hear or be able to do.
