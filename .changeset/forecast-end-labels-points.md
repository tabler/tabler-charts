---
"@tabler/charts": minor
"@tabler/charts-react": minor
"@tabler/charts-vue": minor
"@tabler/charts-elements": minor
"@tabler/charts-bootstrap": minor
---

Three additions for charts that carry a forecast and read without a legend:

- `series.dashFrom` (line and area charts) dashes a line only from a label on: solid before it, `dash` (`'5 4'` by default) after.
- `endLabels` (line and area charts) names each line at its end, with its last value, beside the plot; labels of lines that end close together are moved apart and joined to their points. On the core it needs `@tabler/charts/end-labels`.
- An annotation with both a single `x` and a single `y` is now a point: a dot at that category and value, with its label beside it. Before, such an annotation drew the line at `y` and ignored `x`.
