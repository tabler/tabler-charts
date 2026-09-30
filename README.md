# Tabler Charts

Modern, zero-dependency chart library rendering pure SVG, styled entirely with CSS.

> 🚧 Work in progress — not published yet. See [docs/PLAN.md](docs/PLAN.md) for the architecture and roadmap.

## Goals

- **Zero runtime dependencies**, tree-shakeable per chart type
- **Pure SVG** output — same render tree for the DOM and for SSR (`renderToString`)
- **Styled with CSS** — semantic `.tc-*` classes and `--tc-*` custom properties, dark mode out of the box
- **Accessible** — ARIA, keyboard navigation, `prefers-reduced-motion`
- **Framework adapters** — React, Vue, Bootstrap / Tabler and a `<tabler-chart>` Web Component

## Packages (planned)

| Package | Description |
| --- | --- |
| `@tabler/charts` | Core engine, chart types and base stylesheet |
| `@tabler/charts-react` | React components and `useChart()` hook |
| `@tabler/charts-vue` | Vue 3 components |
| `@tabler/charts-bootstrap` | Bootstrap / Tabler theme mapping and data-API |
| `@tabler/charts-elements` | `<tabler-chart>` Web Component |

## Development

Requires Node.js ≥ 20 and pnpm.

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
