---
"@tabler/charts": minor
"@tabler/charts-react": minor
"@tabler/charts-vue": minor
"@tabler/charts-elements": minor
"@tabler/charts-bootstrap": minor
---

`labels: true` on pie and donut charts names every slice beside the chart, with its share, in a column on the side the slice is on; a thin line joins each label to its slice. Labels of small neighboring slices are moved apart so none overlap, and the pie gets smaller to leave them room. `labels: { value: 'value' }` writes the values instead of the shares, `{ value: false }` the names alone. A chart too small for the labels is drawn without them. On the core it needs `@tabler/charts/slice-labels`.
