---
"@tabler/charts": minor
---

Added a second value axis to line, area and vertical bar charts: series with `axis: 'y2'` are drawn against their own scale, on the right of the plot (on the left in `rtl`). `y2` takes the same options as `y`, `title` included. Its series stay out of stacks, their bars stand beside the stack, and tooltips, value labels and the data table read them in the format of their own axis.
