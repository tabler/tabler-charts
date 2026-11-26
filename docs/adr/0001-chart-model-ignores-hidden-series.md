# The chart model does not know the hidden series

A chart type's `prepare()` works out its chart model from the options alone. It never sees which legend entries are hidden. The legend reads the model, and the hidden series are only known once the legend exists, so a model that depended on them would be circular. Hiding a series therefore filters the model in `render()` and `table()`, and the model is not worked out again. One consequence is that the slices grouped into "Others" (`maxSlices` in `pie`, `donut` and `percentageBar`) are fixed per config. Hiding a slice leaves an empty place and does not promote another slice out of the rest, so the legend stays stable while you toggle entries.

## Considered Options

- **Regroup when a series is hidden** (the model would depend on `hidden`). Rejected because the legend entries would change as you click them, and every toggle would work the model out again.
