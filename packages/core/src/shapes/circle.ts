/** SVG path of a circle of radius `r` around the origin (a path, so it can be a hover mark). */
export const circlePath = (r: number): string =>
  `M${r},0A${r},${r},0,1,1,${-r},0A${r},${r},0,1,1,${r},0Z`
