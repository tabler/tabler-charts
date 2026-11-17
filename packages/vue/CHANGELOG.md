# @tabler/charts-vue

## 0.1.0

### Minor Changes

- 30ca18c: Tooltips are dark by default: a dark box with light text, in light and dark mode alike, reading Tabler's `--tblr-dark` (or `--tblr-tooltip-bg` in the Bootstrap preset) when present. The previous white tooltip is back with `tooltip: { theme: 'light' }`, `tooltip="light"` on the element and `data-tc-tooltip="light"` in the data API. New `--tc-tooltip-light-*` tokens tune the light variant, `--tc-tooltip-muted` the secondary text; the download menu no longer shares the tooltip colors.
- fff1c36: New `parliament` chart: election results as a hemicycle, a dot per seat on concentric benches, each party a wedge of them in data order from the left, with the number of seats in the middle. Options `total` (vacant seats), `rows`, `angle` (`360` for a full ring), `startAngle`, `innerRadius`, `gap`, `format`, `center` and `padding`; entry `@tabler/charts/parliament`, `ParliamentChart` in React and Vue, type `parliament` in the element and the data API.

### Patch Changes

- Updated dependencies [30ca18c]
- Updated dependencies [fff1c36]
  - @tabler/charts@0.1.0
