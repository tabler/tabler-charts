---
"@tabler/charts": minor
---

`pie` and `donut` take `maxSlices`: with more entries than that, the largest keep a slice of their own and the rest is grouped into one slice named by `othersLabel` (`'Others'`), in the color of the slots past the palette. It is 9 by default (the eight palette colors and the rest), so a pie of ten or more entries now draws its smallest ones as one slice; `maxSlices: 0` draws every entry as before.
