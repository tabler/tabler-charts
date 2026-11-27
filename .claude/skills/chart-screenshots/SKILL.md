---
name: chart-screenshots
description: >-
  Makes pictures of Tabler Charts with the `apps/screenshots` app: framed PNG
  files in light and dark mode, at 1x and 2x. Use this skill whenever the user
  asks for a screenshot, picture, image or capture of a chart or example in this
  repo, wants a new chart or feature shown in a picture, or asks to add or
  change a page in `apps/screenshots`. Never capture the docs site with an
  ad-hoc Playwright script or the browser pane instead.
---

# Chart screenshots

Every picture comes from one page file in `apps/screenshots/src/pages/`. The capture turns each page into four PNG files in `apps/screenshots/captures/` (not committed): `<name>.png`, `<name>@2x.png`, `<name>-dark.png`, `<name>-dark@2x.png`. The frame is 1024×768.

`apps/screenshots/README.md` describes the app. Read it once before the first page.

## 1. Find or add the page

List `apps/screenshots/src/pages/`. If a page already shows the chart, capture it and stop.

Otherwise add one file. The file name is the name of the pictures: `<chart type>-<what it shows>.ts`, kebab-case, for example `line-catch-up.ts`, `bar-balance.ts`. A page that shows a tooltip is named `tooltip-<type>.ts`.

Pick the source of the chart in this order:

1. **A playground example** (`apps/docs/src/showcase/<group>.ts`): use `fromShowcase`. The data and its source stay in one place.
2. **No example yet, and the chart is worth showing in the playground too**: add the example to the showcase first, then use `fromShowcase`.
3. **A chart only the picture needs**: write the config in the page with `definePage`.

```ts
import { economy } from '../../../docs/src/showcase/economy.ts'
import { fromShowcase } from '../showcase.ts'

export default fromShowcase(economy, 'Five centuries of GDP per capita', {
  subtitle: 'International dollars at purchasing power parity, 1500–2008',
  width: 760,
  colors: { '#a8283a': 'var(--c-red)', '#d9a441': 'var(--c-amber)' },
})
```

The second argument is the example's exact `title`. Renaming an example breaks the page that names it.

## 2. Fit the page to the frame

- **Heading:** `title` says what the chart shows, in a few words. Give a shorter `title` when the example's is a full sentence. `subtitle` carries the unit and the period. The playground's `note` (which names options) is not used.
- **Source:** comes from the example. A `definePage` page with real numbers sets `source`; made-up data leaves it out.
- **Size:** `width` is the card's width, 640 by default, 896 at most. `fromShowcase` sets `aspectRatio: 2`; override it in `config`. The card with its heading and source line has to stay clear of the logo: keep the chart under about 470 px high.
- **Colors:** `fromShowcase` swaps the playground's named colors (`C.blue`, `C.gray`…) for the palette's. Any other hex color in the example stays the same in both modes, so map it in `colors` to a variable from `src/frame.css` (`var(--c-red)`, `var(--c-slate)`, `var(--tc-baseline-color)` for a pale fill). In a `definePage` page use `C` from `src/page.ts`.
- **Too many categories:** a horizontal bar chart keeps every name up to about fourteen rows. For a longer ranking, override `config.data` with a subset and say so in the `subtitle` (see `bar-balance.ts`). Do not shrink the text.
- **Legend:** drop it (`legend: false`) when the chart names its series itself (`endLabels`, pie `labels`).
- **Tooltip:** `hover: { x, y }`, a point of the chart as fractions of its width and height.
- **More than one chart:** `render(body)` instead of `config`; see `dashboard.ts`.

## 3. Capture

From the repository root, name the pages so only they are built:

```sh
pnpm screenshots line-catch-up bar-balance
```

Without names the command captures every page, which takes minutes. It needs a network connection (Inter comes from Google Fonts) and Playwright's Chromium (`pnpm exec playwright install chromium` if it is missing). An unknown page name or example title stops the capture with an error that names it.

## 4. Look at every picture

Read `<name>.png` and `<name>-dark.png` for each page. Check:

- the card does not touch the logo or the frame's edge;
- no axis label is missing because the ticks were thinned;
- no label lies on a line, a bar or another label;
- every series is visible in dark mode (a hex color that was not mapped shows here);
- the chart is not a small shape in a large empty card: raise `aspectRatio` or lower `width`.

Change the page and capture again until both modes pass. A flaw that comes from the library itself, not from the page, is reported to the user, not hidden by the page.

## 5. Finish

- Run `pnpm lint` and `pnpm typecheck`.
- Commit the page file only. `captures/` is ignored by git.
- No changeset: the app is private.
- Tell the user the paths of the pictures, and send the light and dark 1x files when they asked to see them.
