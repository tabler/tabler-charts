---
"@tabler/charts": minor
"@tabler/charts-react": minor
"@tabler/charts-vue": minor
"@tabler/charts-elements": minor
"@tabler/charts-bootstrap": minor
---

New `funnel` chart: how many get from one stage of a process to the next. Every stage is a column with its name, its value and its share of the first stage on top, and the shapes step down from each stage to the next in one color that deepens as the funnel narrows (`--tc-funnel-color`). The tooltip adds the share of the previous stage. Options `labels`, `radius`, `format` and `padding`; entry `@tabler/charts/funnel`, `FunnelChart` in React and Vue, type `funnel` in the element and the data API.
