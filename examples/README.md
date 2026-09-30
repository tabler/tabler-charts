# Server-side rendering examples

Each app renders charts on the server and lets the browser take the SVG over
(or, for Astro's first chart, ships no JavaScript at all). They use the
packages from this repository, so build those first.

```sh
pnpm build                                  # the library packages
pnpm --filter @tabler/charts-example-next build && pnpm --filter @tabler/charts-example-next start
pnpm --filter @tabler/charts-example-nuxt build && pnpm --filter @tabler/charts-example-nuxt start
pnpm --filter @tabler/charts-example-astro build && pnpm --filter @tabler/charts-example-astro start
```

| Example | Package | What it shows |
| --- | --- | --- |
| [`next`](next) | `@tabler/charts-react` | App Router: charts in a Server Component, a Client Component with `onHover` |
| [`nuxt`](nuxt) | `@tabler/charts-vue` | SSR with hydration, `@hover`, reactive data changed in place |
| [`astro`](astro) | `@tabler/charts`, `@tabler/charts-elements` | `chartToString()` as static SVG, and a `<tabler-chart>` island around server-rendered SVG |

Set `locale` explicitly when rendering on the server, so the server and the
browser format numbers the same way.
