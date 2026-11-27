# @tabler/charts-elements

## 0.4.0

### Minor Changes

- 7e4f979: Three additions for charts that carry a forecast and read without a legend:
  
  - `series.dashFrom` (line and area charts) dashes a line only from a label on: solid before it, `dash` (`'5 4'` by default) after.
  - `endLabels` (line and area charts) names each line at its end, with its last value, beside the plot; labels of lines that end close together are moved apart and joined to their points. On the core it needs `@tabler/charts/end-labels`.
  - An annotation with both a single `x` and a single `y` is now a point: a dot at that category and value, with its label beside it. Before, such an annotation drew the line at `y` and ignored `x`.
- b656e49: `labels: true` on pie and donut charts names every slice beside the chart, with its share, in a column on the side the slice is on; a thin line joins each label to its slice. Labels of small neighboring slices are moved apart so none overlap, and the pie gets smaller to leave them room. `labels: { value: 'value' }` writes the values instead of the shares, `{ value: false }` the names alone. A chart too small for the labels is drawn without them. On the core it needs `@tabler/charts/slice-labels`.
- d531942: `x.rotate: true` turns the category labels below a line, area or vertical bar chart 90°, reading bottom to top, so that a chart with many or long categories keeps a label on every one instead of dropping some. The plot leaves room for the longest label. It does nothing on a time axis or in horizontal bars.

### Patch Changes

- Updated dependencies [7e4f979]
- Updated dependencies [b656e49]
- Updated dependencies [1a214e2]
- Updated dependencies [d531942]
  - @tabler/charts@0.4.0

## 0.3.0

### Minor Changes

- 0f5373f: Added `calendar` chart type that shows one value per day as a grid of weeks.
- 3c7ce79: Added `funnel` chart type that shows how many get from each stage of a process to the next.
- ca83f3e: Added `map` chart type that shades the regions of a map by value, with markers, lines, zoom and region selection, and the `world` map in `@tabler/charts/maps/world`.

### Patch Changes

- 47d6eb4: Updated `Chart` and `useChart()` to take an `HTMLElement` target, so `chart.element` is typed as `HTMLElement`.
- Updated dependencies [67c0307]
- Updated dependencies [0f5373f]
- Updated dependencies [f818a64]
- Updated dependencies [f6a94b1]
- Updated dependencies [3c7ce79]
- Updated dependencies [47d6eb4]
- Updated dependencies [9437acd]
- Updated dependencies [ca83f3e]
- Updated dependencies [a07f7dd]
- Updated dependencies [48178cb]
- Updated dependencies [5f117d0]
- Updated dependencies [60448d5]
- Updated dependencies [2d57d21]
  - @tabler/charts@0.3.0

## 0.2.0

### Minor Changes

- d664260: Added `percentageBar` chart type that shows parts of a whole as segments of one horizontal bar.
- e8c4b2a: Added `rtl` option that mirrors charts, legend, tooltip and download menu for right-to-left pages.
- fc08c1c: Added `treemap` chart type that shows parts of a whole as tiles, with `children` entries for groups.

### Patch Changes

- Updated dependencies [d664260]
- Updated dependencies [c7de5e8]
- Updated dependencies [4d22484]
- Updated dependencies [e8c4b2a]
- Updated dependencies [fc08c1c]
  - @tabler/charts@0.2.0

## 0.1.0

### Minor Changes

- 30ca18c: Tooltips are dark by default: a dark box with light text, in light and dark mode alike, reading Tabler's `--tblr-dark` (or `--tblr-tooltip-bg` in the Bootstrap preset) when present. The previous white tooltip is back with `tooltip: { theme: 'light' }`, `tooltip="light"` on the element and `data-tc-tooltip="light"` in the data API. New `--tc-tooltip-light-*` tokens tune the light variant, `--tc-tooltip-muted` the secondary text; the download menu no longer shares the tooltip colors.
- fff1c36: New `parliament` chart: election results as a hemicycle, a dot per seat on concentric benches, each party a wedge of them in data order from the left, with the number of seats in the middle. Options `total` (vacant seats), `rows`, `angle` (`360` for a full ring), `startAngle`, `innerRadius`, `gap`, `format`, `center` and `padding`; entry `@tabler/charts/parliament`, `ParliamentChart` in React and Vue, type `parliament` in the element and the data API.

### Patch Changes

- Updated dependencies [30ca18c]
- Updated dependencies [fff1c36]
  - @tabler/charts@0.1.0
