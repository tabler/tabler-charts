---
"@tabler/charts": minor
---

Add the `rtl` option for right-to-left pages: line, area, bar and candlestick charts put the value axis on the right and run the categories from the right (`x: { reverse: false }` keeps them from the left; `x.reverse` also works on its own). Horizontal bars put the categories on the right and grow to the left. Scatter charts, heatmaps, sparklines and sankey diagrams are mirrored too (scatter takes `x.reverse` as well). `rtl: 'auto'` follows the `direction` of the container. Arrow keys follow the screen, and `<tabler-chart>` takes an `rtl` attribute.
