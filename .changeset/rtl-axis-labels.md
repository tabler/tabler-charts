---
"@tabler/charts": patch
---

Fix axis labels overlapping the plot on right-to-left pages: the chart no longer inherits the page's `direction`, which flipped `text-anchor`.
