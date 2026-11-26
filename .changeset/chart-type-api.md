---
"@tabler/charts": minor
---

**Breaking for custom chart types and plugins that read hits.** Reworked the chart type API:

- `render()` returns `{ content, interaction }` instead of calling `ctx.onHitTest(interaction)`; `onHitTest` is gone from `RenderContext`. A type without interaction can still return its content alone.
- `Hit` names its hover shape in `highlight` (`{ kind: 'crosshair' | 'band' | 'spoke' | 'halo', … }`), replacing `band`, `guide` and `mark`.
- Added `prepare()` to chart types: a chart model worked out once per config that `render()`, `legend()` and `table()` read.
- Added `sweep` to `ChartType`: the arc animation of `pie`, `donut` and `gauge`, installed by the chart instead of `render()`.

To migrate a custom type, replace `ctx.onHitTest(interaction); return content` with `return { content, interaction }`, and `mark: { d, x, y }` with `highlight: { kind: 'halo', d, x, y }` (`band` becomes `{ kind: 'band', … }`, `guide` becomes `{ kind: 'spoke', … }`).
