# Tabler Charts

A dependency-free SVG charting library: a chart is worked out from its options and size as a tree of nodes, then written as a string or mounted in the page.

## Language

**Chart type**:
One kind of chart (line, pie, funnel…), including ones users write themselves; it turns options into chart content.
_Avoid_: chart plugin, renderer

**Chart model**:
What a chart type works out from its options alone, before any size or hidden series are known: the grouped, sorted, cleaned data its legend, table and rendering all read.
_Avoid_: prepared data, state

**Render result**:
What a chart type produces for one size: the chart content, and how it answers pointer and keyboard interaction.
_Avoid_: layout, output

**Hit**:
What lies under the pointer or keyboard focus: a category, its values in every series, and where it sits.
_Avoid_: hover data, point

**Anchor**:
The position of a hit's category in the chart, where a tooltip points.
_Avoid_: tooltip position

**Highlight**:
The one shape drawn to mark a hit — a crosshair, a band, a radar spoke or a halo around a slice.
_Avoid_: hover mark, guide

**Optional feature**:
Code a chart type uses only when an option asks for it (a time axis, a log scale, annotations…), loaded by importing its entry point.
_Avoid_: plugin, extension

**Plot area**:
The rectangle the data is drawn in, inside the axes and the padding.
_Avoid_: inner rect, chart area

**Start side / end side**:
The side a chart is read from (the left, or the right in a right-to-left chart) and the side opposite it; the axis beside the plot sits on the start side.
_Avoid_: mirror image, left/right when the reading direction matters

**Marker**:
The shape a series' point is drawn as, by its color slot, when point shapes are on (`shapes`, or `patterns: true`).
_Avoid_: symbol, point shape (for the drawn thing)
