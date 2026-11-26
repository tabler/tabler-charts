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

**Others**:
The one slice or segment that groups the smallest parts past `maxSlices`, last and in the "other" color.
_Avoid_: rest, remainder

**Marker**:
The shape a series' point is drawn as, by its color slot, when point shapes are on (`shapes`, or `patterns: true`).
_Avoid_: symbol, point shape (for the drawn thing)
