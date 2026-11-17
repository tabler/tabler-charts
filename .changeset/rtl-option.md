---
"@tabler/charts": minor
---

Add the `rtl` option for right-to-left pages: line, area, bar and candlestick charts put the value axis on the right and run the categories from the right (`x: { reverse: false }` keeps them from the left; `x.reverse` also works on its own). Horizontal bars put the categories on the right and grow to the left. Scatter charts, heatmaps, sparklines and sankey diagrams are mirrored too (scatter takes `x.reverse` as well). `rtl: 'auto'` follows the `direction` of the container. Arrow keys follow the screen, the legend and the tooltip read right to left (the tooltip opens left of the pointer), the download menu moves to the left corner, and `<tabler-chart>` takes an `rtl` attribute. `chart.rtl` tells the resolved direction.
