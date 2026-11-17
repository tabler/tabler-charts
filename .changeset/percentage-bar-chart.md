---
"@tabler/charts": minor
"@tabler/charts-react": minor
"@tabler/charts-vue": minor
"@tabler/charts-elements": minor
"@tabler/charts-bootstrap": minor
---

New `percentageBar` chart: parts of a whole as segments of one horizontal bar, each as wide as its share (a donut's ring unrolled, for a strip under a number). The chart is a strip 16 pixels tall unless `height` or `aspectRatio` is set. Options `order` (`'size'` puts the largest first), `maxSlices` (9 by default, `0` never groups: with more entries, the smallest are grouped into one segment named by `othersLabel`), `gap`, `radius`, `format` and `padding`; entry `@tabler/charts/percentage-bar`, `PercentageBarChart` in React and Vue, type `percentage-bar` in the element and the data API.
