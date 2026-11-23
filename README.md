<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-white.svg">
    <img src="docs/images/logo.svg" alt="Tabler Charts" width="280">
  </picture>
</p>

# Tabler Charts

Zero-dependency charts that render plain SVG and are styled entirely with CSS.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/og-image-dark.png">
    <img src="docs/images/og-image.png" alt="Tabler Charts: charts styled entirely with CSS" width="800">
  </picture>
</p>

> 🚧 **Pre-release.** The packages are not on npm yet and the API may still change.

```js
import { Chart, line } from '@tabler/charts'
import '@tabler/charts/style.css'

new Chart('#visitors', {
  type: line,
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    series: [
      { name: 'Visitors', values: [320, 410, 380, 520, 610] },
      { name: 'Sign-ups', values: [24, 31, 29, 40, 52] },
    ],
  },
})
```

## Why

- **Small.** No runtime dependencies, and every chart type, plugin and feature is tree-shakeable: a line chart with the core is about 11 KB gzipped.
- **Plain SVG.** The same render tree goes to the DOM and to a string, so charts render on the server and the browser takes the markup over without re-creating it.
- **Styled with CSS.** Semantic `.tc-*` classes and `--tc-*` custom properties for colors, sizes, fonts and timing. Dark mode follows `prefers-color-scheme` or `data-theme`.
- **Accessible.** An accessible name and a data table for screen readers on every chart, keyboard navigation, reduced motion, forced colors, and a colorblind-checked palette.
- **Smooth.** Marks keep their DOM nodes between renders, so new data and resizes animate with CSS transitions.
- **For any stack.** Adapters for React, Vue, Bootstrap / Tabler and a `<tabler-chart>` Web Component.

## Chart types

`line` · `area` · `bar` (grouped, stacked, 100%, horizontal, mixed with lines) · `pie` / `donut` · `gauge` · `radar` · `sankey` · `parliament` · `percentageBar` · `treemap` · `funnel` · `scatter` / bubble · `heatmap` · `calendar` · `map` · `candlestick` · `sparkline` (including tristate)

Plus annotations (target lines and bands), time and log axes, LTTB decimation for long series, and export to SVG, PNG, JPEG or WebP (also as a download menu on the chart).

## Packages

| Package | What it is |
| --- | --- |
| [`@tabler/charts`](packages/core) | The engine, every chart type, the plugins and the stylesheet |
| [`@tabler/charts-react`](packages/react) | React components (`<LineChart>` …) and `useChart()`, with SSR |
| [`@tabler/charts-vue`](packages/vue) | Vue 3 components and `useChart()`, with SSR (Nuxt) |
| [`@tabler/charts-elements`](packages/elements) | The `<tabler-chart>` Web Component, light or shadow DOM, plus a CDN build |
| [`@tabler/charts-bootstrap`](packages/bootstrap) | Bootstrap 5.3 and Tabler theme mapping (CSS / SCSS) and a `data-tc-*` data API, plus a CDN build |

## Repository

```
packages/   the five packages above
apps/docs/  the playground (every chart type and option, both themes) and the examples page (~100 charts of real data)
examples/   SSR examples for Next.js, Nuxt and Astro
tests/      Playwright visual, accessibility (axe) and export tests
docs/       PLAN.md: architecture and roadmap
```

## Development

Requires Node.js 20 or newer and pnpm.

```bash
pnpm install
pnpm docs:dev    # the playground on http://localhost:5173
pnpm check       # lint, typecheck, build, unit tests, package checks, size budgets
```

Other scripts:

| Script | What it does |
| --- | --- |
| `pnpm build` | Build every package |
| `pnpm test` | Unit tests (Vitest), including fuzzers and SSR/DOM agreement |
| `pnpm size` | Bundle typical imports and check them against the budgets in `bundlewatch.config.cjs` |
| `pnpm visual` | Playwright visual, axe and export tests against the built playground |
| `pnpm examples:build` | Build the Next.js, Nuxt and Astro examples |

Visual baselines are made on Linux in CI: run the **Visual** workflow with *update snapshots* and commit the `visual-baselines` artifact. Pushes and pull requests compare in Chromium only, without the leak checks; run the workflow with *full* for Firefox, WebKit and the leak checks too.

### Releasing

Versions and releases are driven by [Changesets](https://github.com/changesets/changesets). A pull request that changes a package adds a changeset, a short note of what changed and whether it is a `patch`, `minor` or `major`:

```bash
pnpm changeset
```

The **Changesets** workflow comments on every pull request with its status, and reminds you when one is missing. All five packages share one version (a fixed group in `.changeset/config.json`), so a changeset lists all of them.

On every push to `main`, the **Release** workflow (`.github/workflows/release.yml`) opens or updates the pull request `chore: version packages`, which applies the pending changesets: bumps the versions, writes each package's `CHANGELOG.md` and deletes the changesets. Merging that pull request publishes: the workflow runs `pnpm check`, packs the tarballs (`pnpm pack`, which rewrites the `workspace:^` ranges), publishes them to npm with provenance, and creates the git tags (`@tabler/charts@X.Y.Z`, one per package) and the GitHub releases.

Publishing authenticates with npm [trusted publishing](https://docs.npmjs.com/trusted-publishers): no token and no secret, each package on npmjs.com lists this repository and `release.yml` as its trusted publisher (package settings → Trusted Publisher → GitHub Actions, organization `tabler`, repository `tabler-charts`, workflow `release.yml`).

Pre-releases are a mode: `pnpm changeset pre enter alpha` (committed as `.changeset/pre.json`) makes every version from then on an alpha (`0.1.0-alpha.0`, `alpha.1`, ...) and `pnpm changeset pre exit` ends it; the first full version follows. The repository is in alpha mode until 0.1.0.

## License

MIT
