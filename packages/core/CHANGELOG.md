# @tabler/charts

## 0.4.0

### Minor Changes

- 7e4f979: Three additions for charts that carry a forecast and read without a legend:
  
  - `series.dashFrom` (line and area charts) dashes a line only from a label on: solid before it, `dash` (`'5 4'` by default) after.
  - `endLabels` (line and area charts) names each line at its end, with its last value, beside the plot; labels of lines that end close together are moved apart and joined to their points. On the core it needs `@tabler/charts/end-labels`.
  - An annotation with both a single `x` and a single `y` is now a point: a dot at that category and value, with its label beside it. Before, such an annotation drew the line at `y` and ignored `x`.
- b656e49: `labels: true` on pie and donut charts names every slice beside the chart, with its share, in a column on the side the slice is on; a thin line joins each label to its slice. Labels of small neighboring slices are moved apart so none overlap, and the pie gets smaller to leave them room. `labels: { value: 'value' }` writes the values instead of the shares, `{ value: false }` the names alone. A chart too small for the labels is drawn without them. On the core it needs `@tabler/charts/slice-labels`.
- d531942: `x.rotate: true` turns the category labels below a line, area or vertical bar chart 90°, reading bottom to top, so that a chart with many or long categories keeps a label on every one instead of dropping some. The plot leaves room for the longest label. It does nothing on a time axis or in horizontal bars.

### Patch Changes

- 1a214e2: A point annotation whose label has no room in the plot (a narrow chart, say) now leaves the label out and keeps its dot, instead of drawing the label over the plot's edge and over other labels.

## 0.3.0

### Minor Changes

- f818a64: **Breaking for custom chart types and plugins that read hits.** Reworked the chart type API:
  
  - `render()` returns `{ content, interaction }` instead of calling `ctx.onHitTest(interaction)`; `onHitTest` is gone from `RenderContext`. A type without interaction can still return its content alone.
  - `Hit` names its hover shape in `highlight` (`{ kind: 'crosshair' | 'band' | 'spoke' | 'halo', … }`), replacing `band`, `guide` and `mark`.
  - Added `prepare()` to chart types: a chart model worked out once per config that `render()`, `legend()` and `table()` read.
  - Added `sweep` to `ChartType`: the arc animation of `pie`, `donut` and `gauge`, installed by the chart instead of `render()`.
  
  To migrate a custom type, replace `ctx.onHitTest(interaction); return content` with `return { content, interaction }`, and `mark: { d, x, y }` with `highlight: { kind: 'halo', d, x, y }` (`band` becomes `{ kind: 'band', … }`, `guide` becomes `{ kind: 'spoke', … }`).
- 67c0307: Added `title` to the `x` and `y` axis options. A title stands past the labels of its axis: turned 90° beside a vertical axis (on the right in `rtl`), level below the horizontal one. In horizontal bar charts `x.title` is the one beside the categories and `y.title` goes below the values.
- 0f5373f: Added `calendar` chart type that shows one value per day as a grid of weeks.
- 3c7ce79: Added `funnel` chart type that shows how many get from each stage of a process to the next.
- 9437acd: Added `legend.position` `'left'`, `'right'` and `'auto'`: the legend sits beside the chart with its entries stacked, and the chart takes the remaining width (sides swap in `rtl`). `'auto'` puts it on the right when the chart keeps two thirds of the container, and below it otherwise. Exports draw it where the page shows it, and `data-tc-legend` takes the new positions.
- ca83f3e: Added `map` chart type that shades the regions of a map by value, with markers, lines, zoom and region selection, and the `world` map in `@tabler/charts/maps/world`.
- 5f117d0: Added a second value axis to line, area and vertical bar charts: series with `axis: 'y2'` are drawn against their own scale, on the right of the plot (on the left in `rtl`). `y2` takes the same options as `y`, `title` included. Its series stay out of stacks, their bars stand beside the stack, and tooltips, value labels and the data table read them in the format of their own axis.
- 60448d5: Added `series.valueLabels`: labels one series (`true`) or leaves it out (`false`), whatever the chart's `valueLabels` says. Value labels now carry their series classes (`tc-series tc-series-{n}`).

### Patch Changes

- f6a94b1: Updated `line`, `area`, `radar` and `sparkline` to draw point shapes as they render, and deprecated `shapesStep`.
- 47d6eb4: Updated `Chart` and `useChart()` to take an `HTMLElement` target, so `chart.element` is typed as `HTMLElement`.
- a07f7dd: Updated `rtl` option to mirror the `percentageBar` chart too.
- 48178cb: Fixed the hover highlight of a `sankey` flow covering the node labels drawn on it.
- 2d57d21: Updated legend and tooltip swatch shapes to come from `--tc-shape` set on each entry, instead of a rule per shape in `style.css`.

## 0.2.0

### Minor Changes

- d664260: Added `percentageBar` chart type that shows parts of a whole as segments of one horizontal bar.
- c7de5e8: Added `maxSlices` option to `pie` and `donut` charts; slices past nine are now grouped into `Others` by default.
- e8c4b2a: Added `rtl` option that mirrors charts, legend, tooltip and download menu for right-to-left pages.
- fc08c1c: Added `treemap` chart type that shows parts of a whole as tiles, with `children` entries for groups.

### Patch Changes

- 4d22484: Fixed axis labels overlapping the plot on right-to-left pages.

## 0.1.0

### Minor Changes

- 30ca18c: Tooltips are dark by default: a dark box with light text, in light and dark mode alike, reading Tabler's `--tblr-dark` (or `--tblr-tooltip-bg` in the Bootstrap preset) when present. The previous white tooltip is back with `tooltip: { theme: 'light' }`, `tooltip="light"` on the element and `data-tc-tooltip="light"` in the data API. New `--tc-tooltip-light-*` tokens tune the light variant, `--tc-tooltip-muted` the secondary text; the download menu no longer shares the tooltip colors.
- fff1c36: New `parliament` chart: election results as a hemicycle, a dot per seat on concentric benches, each party a wedge of them in data order from the left, with the number of seats in the middle. Options `total` (vacant seats), `rows`, `angle` (`360` for a full ring), `startAngle`, `innerRadius`, `gap`, `format`, `center` and `padding`; entry `@tabler/charts/parliament`, `ParliamentChart` in React and Vue, type `parliament` in the element and the data API.
