# Plan: nowoczesna biblioteka chartów SVG — `@tabler/charts`

## Kontekst
Cel: lekka biblioteka do wykresów, bez zależności runtime, renderująca czyste SVG,
w pełni stylowalna przez CSS, z oficjalnymi adapterami dla React, Vue, Bootstrap
oraz Web Component (`<tabler-chart>`, pokrywa Svelte/Angular/Astro/czysty HTML).
Repo: `~/htdocs/tabler-charts`, pakiety w scope `@tabler`.
Przewaga nad Chart.js / ApexCharts / Recharts: rozmiar (cel: core < 12 kB gzip),
SSR bez DOM, theming w 100% przez CSS custom properties, natywne wsparcie dark mode,
dostępność (a11y) i tree-shaking per typ wykresu.

## Zasady architektury
1. **Zero dependencji runtime.** Dev-deps (TypeScript, bundler, testy) są OK.
2. **Rdzeń jest czystą funkcją:** `options + data + size → drzewo VNode`.
   Brak dostępu do DOM w logice wykresu → działa w SSR, Node, workerach, testach.
3. **Dwa renderery tego samego drzewa:**
   - `renderToString(vnode)` – SSR / eksport statycznego SVG,
   - `mount/patch(el, vnode)` – mikro-reconciler z kluczami (reużywa węzłów,
     dzięki czemu przejścia CSS na atrybutach/`d` działają „za darmo”).
4. **Stylowanie przez CSS, nie przez opcje JS.** Każdy element dostaje
   semantyczne klasy (`.tc-series`, `.tc-series-0`, `.tc-bar`, `.tc-axis-x`,
   `.tc-grid`, `.tc-tooltip`…) i atrybuty `data-*`. Kolory/grubości/fonty/animacje
   to zmienne CSS (`--tc-color-1…n`, `--tc-grid-color`, `--tc-font`, `--tc-duration`).
   Opcje JS tylko dla danych i struktury.
5. **Tree-shaking:** każdy typ wykresu jako osobny eksport (`import { line } from '@tabler/charts/line'`),
   `sideEffects` tylko dla plików CSS, ESM-first (+ CJS i IIFE/UMD dla CDN i Bootstrapa).
6. **Responsywność:** `viewBox` + jeden współdzielony `ResizeObserver`, render w `requestAnimationFrame`
   (batching wielu aktualizacji w jedną klatkę).
7. **Dostępność:** `role="img"`, `<title>`/`<desc>`, opcjonalna ukryta tabela danych,
   nawigacja klawiaturą po punktach, `prefers-reduced-motion`.

## Struktura repo (pnpm workspace monorepo)
```
packages/
  core/        @tabler/charts    – silnik + typy wykresów + domyślny CSS
  react/       @tabler/charts-react     – komponenty + hook
  vue/         @tabler/charts-vue       – komponenty Vue 3
  bootstrap/   @tabler/charts-bootstrap – mapowanie zmiennych BS + data-API + SCSS
  elements/    @tabler/charts-elements  – Web Component <tabler-chart>
apps/
  docs/        playground / dokumentacja (Vite) – deploy na Vercel
```

### `packages/core/src`
- `vnode.ts` – `h(tag, attrs, children, key)`, typy.
- `render/string.ts` – serializacja do SVG string (escaping).
- `render/dom.ts` – mount + keyed patch (createElementNS, diff atrybutów, dzieci po kluczu).
- `scales/` – `linear`, `band`, `time`, `log`; `nice()` + generator ticków.
- `shapes/` – generatory ścieżek: `line`, `area`, krzywe (`linear`, `monotoneX`, `step`),
  `arc` (pie/donut), zaokrąglone prostokąty.
- `format.ts` – formatowanie liczb/dat przez `Intl` (zero kosztu, lokalizacja gratis).
- `layout.ts` – liczenie paddingów pod osie/legendę.
- `components/` – `axis`, `grid`, `legend`, `tooltip` (HTML overlay, pozycjonowany CSS),
  `crosshair`, `annotations`.
- `charts/` – `line`, `area`, `bar` (grouped/stacked/horizontal), `pie`/`donut`,
  `scatter`, `sparkline`; później: `radar`, `heatmap`, `gauge`, `combo`.
- `chart.ts` – klasa `Chart`: `new Chart(el, config)`, `.update(partial)`, `.setData()`,
  `.destroy()`, eventy (`on('hover' | 'click' | 'legend-toggle')`), interakcje
  (delegacja zdarzeń – jeden listener na SVG, hit-testing po najbliższym X/binarny search).
- `styles/charts.css` – bazowe style oparte o zmienne CSS, dark mode przez
  `prefers-color-scheme` i `[data-theme="dark"]`, animacje wejścia (`stroke-dashoffset`,
  `transform: scaleY` dla słupków), `@media (prefers-reduced-motion)`.

### Przykład API (docelowy)
```js
import { Chart } from '@tabler/charts'
import { line } from '@tabler/charts/line'
import '@tabler/charts/style.css'

new Chart('#el', {
  type: line,
  data: { labels: [...], series: [{ name: 'Sales', values: [...] }] },
  axes: { y: { format: { style: 'currency', currency: 'PLN' } } },
  curve: 'monotone',
})
```
```css
.my-chart { --tc-color-1: oklch(65% .2 250); --tc-stroke-width: 3px; }
.my-chart .tc-series-1 .tc-line { stroke-dasharray: 4 4; }
```

## Adaptery
- **React (`@tabler/charts-react`):** `<LineChart data=… />`, `<BarChart />`… + `useChart()`.
  SSR: komponent renderuje wynik `renderToString` przez `dangerouslySetInnerHTML`
  na serwerze, na kliencie hydratuje instancję `Chart` (bez migotania). Obsługa
  React 18/19, `'use client'` tylko w części interaktywnej.
- **Vue (`@tabler/charts-vue`):** komponenty z `<script setup>`, reaktywne `props` → `chart.update()`
  przez `watch` (deep, z throttlingiem przez rAF), emity eventów, wsparcie Nuxt SSR.
- **Bootstrap (`@tabler/charts-bootstrap`):**
  - CSS mapujący `--tc-color-*` na `--bs-primary`, `--bs-success`…, font na `--bs-body-font-family`,
    dark mode przez `[data-bs-theme="dark"]`,
  - SCSS z mixinami/zmiennymi do buildów Bootstrapa,
  - data-API bez JS-a: `<div data-tc-chart="line" data-tc-src="/api/sales.json">`
    auto-inicjalizowane (MutationObserver opcjonalnie), build IIFE na CDN,
  - dodatkowo preset dla Tabler (`--tblr-*`, `[data-bs-theme]`).
- **Web Component (`@tabler/charts-elements`):** `<tabler-chart type="line">`
  - dane przez property (`el.data = {...}`), atrybut JSON (`data-json`) lub `<script type="application/json">` w środku,
  - **light DOM domyślnie** (globalny CSS i zmienne działają bez `::part`), opcjonalny tryb
    shadow DOM z `::part()` i wstrzykniętym arkuszem przez `adoptedStyleSheets`,
  - `observedAttributes` → `update()`, eventy jako `CustomEvent` (`tc-hover`, `tc-click`),
  - rejestracja leniwa (`customElements.define` tylko raz, bez side-effectów przy imporcie
    typów), SSR przez Declarative Shadow DOM / wstawienie `renderToString` do light DOM,
  - osobny build IIFE do `<script>` z CDN – „wklej i działa”.

## Wydajność
- Jeden `ResizeObserver` i jeden rAF-scheduler na wszystkie instancje.
- Keyed patch zamiast przebudowy SVG → brak GC churn, płynne przejścia.
- Dla dużych serii: decymacja LTTB (opcjonalny moduł) i binarne wyszukiwanie przy hoverze.
- Liczby w ścieżkach zaokrąglane do 2 miejsc → mniejszy DOM/string.
- Budżet rozmiaru pilnowany w CI (`size-limit` lub własny skrypt gzip).

## Tooling
- TypeScript 7 (strict, `isolatedDeclarations`), build: tsdown (ESM/CJS/IIFE + `.d.ts`), wspólne ustawienia w `tsdown.config.base.ts`.
- Lint + formatowanie: Biome (`pnpm lint`, `pnpm format`), `pnpm check` = lint + typecheck + testy.
- Testy: Vitest (skale, generatory ścieżek, snapshoty `renderToString`),
  Playwright do testów wizualnych i interakcji w `apps/docs`.
- Changesets do wersjonowania pakietów, GitHub Actions: lint, test, size, build.

## Etapy (roadmapa)
1. **M1 – Fundament:** monorepo, `vnode` + oba renderery, skale linear/band, osie, grid,
   wykresy `line`/`area`/`bar`, bazowy CSS ze zmiennymi, playground.
2. **M2 – Interakcje:** tooltip, crosshair, legenda z toggle serii, eventy, animacje
   aktualizacji danych, a11y (klawiatura, tabela danych).
3. **M3 – Więcej typów:** pie/donut, scatter, sparkline, stacked/horizontal bar, time scale.
4. **M4 – Adaptery:** Web Component (najpierw – najcieńsza warstwa, testuje API `Chart`),
   potem React, Vue, Bootstrap/Tabler (CSS + data-API) + przykłady SSR (Next, Nuxt, Astro).
5. **M5 – Dopracowanie:** docs, testy wizualne, budżet rozmiaru, publikacja 0.1.0 na npm.
6. **Później:** radar, heatmap, gauge, combo, zoom/brush, eksport PNG, pluginy.

## Kroki i commity
Zasada: 1 krok = 1 commit (Conventional Commits), każdy commit zostawia repo w stanie
zielonym (`pnpm build && pnpm test` przechodzi). Koniec etapu = tag roboczy / krótkie podsumowanie.

### M0 – Szkielet repo
- [x] 1. `chore: init monorepo` – pnpm workspace, `.gitignore`, `.editorconfig`, LICENSE (MIT), README.
- [x] 1a. `chore: set up vercel deployment` – projekt `tabler-charts` (codecalm) na Vercelu, Root Directory `apps/docs`, placeholder strony; auto-deploy z GitHuba.
- [x] 2. `chore: add typescript and build tooling` – `tsconfig.base.json`, tsdown, skrypty `build`/`dev`.
- [x] 3. `chore: add vitest, lint and formatting` – Vitest, Biome, skrypt `check`.
- [x] 4. `chore(core): scaffold @tabler/charts package` – `package.json` z `exports`, `sideEffects` tylko dla CSS, pusty `index.ts` (eksport `VERSION`), test „smoke”, `lint:pkg` (publint + attw).
- [x] 5. `ci: add github actions workflow` – install, lint, typecheck, test, build, lint:pkg.

### M1 – Fundament renderowania
- [x] 6. `feat(core): add vnode and h() helper` + testy.
- [x] 7. `feat(core): add string renderer` – `renderToString`, escaping, testy snapshot.
- [x] 8. `feat(core): add dom renderer with keyed patching` – mount/patch/unmount, testy w happy-dom (dyrektywa `@vitest-environment` per plik).
- [x] 9. `feat(core): add linear and band scales` – `nice()`, ticki, testy, `point()`, `extent()`; wyniki zweryfikowane względem d3.
- [x] 10. `feat(core): add number and date formatting via Intl` – cache instancji `Intl`, precyzja etykiet z kroku podziałki, `-0` → `0`.
- [x] 11. `feat(core): add path generators (line, area, curves)` – linear/monotoneX/step, zaokrąglanie liczb, przerwy w danych, obszary skumulowane; zgodne z d3-shape.
- [x] 12. `feat(core): add layout and axis/grid components` – szacowanie szerokości tekstu bez DOM (średni błąd ~2% vs pomiar w przeglądarce), przerzedzanie etykiet, klasy `.tc-axis*`, `.tc-tick*`, `.tc-grid*`.
- [x] 13. `feat(core): add Chart class` – config, shared ResizeObserver + rAF scheduler, `update`/`destroy`, czyste `buildChart()` + `chartToString()` do SSR, typy opcji wnioskowane z typu wykresu.
- [x] 14. `feat(core): add base stylesheet with css variables` – paleta, dark mode, reduced motion; 8 kolorów zwalidowanych pod CVD (jasny i ciemny), tekst osi WCAG AA, eksport `@tabler/charts/style.css`. Uwaga: 3 jasne kolory mają < 3:1 na białym tle → tooltip (20) i tabela danych (23) są wymagane.
- [ ] 15. `feat(core): add line chart` (+ demo; przerzedzanie etykiet ma zachować ostatnią etykietę).
- [ ] 16. `feat(core): add area chart`.
- [ ] 17. `feat(core): add bar chart (grouped)`.
- [x] 18. `docs: add playground app` – Vite, strona z line/area/bar, przełącznik light/dark. **Zrobione wcześniej (po kroku 14)**: playground na https://tabler-charts.vercel.app, importuje bibliotekę ze źródeł; od teraz każdy krok z nowym typem wykresu / funkcją dodaje swoje demo.

### M2 – Interakcje i a11y
- [ ] 19. `feat(core): add event delegation and nearest-point hit testing`.
- [ ] 20. `feat(core): add tooltip and crosshair`.
- [ ] 21. `feat(core): add legend with series toggle`.
- [ ] 22. `feat(core): animate data updates via css transitions`.
- [ ] 23. `feat(core): add accessibility (title/desc, keyboard nav, data table)`.

### M3 – Kolejne typy
- [ ] 24. `feat(core): add stacked and horizontal bars`.
- [ ] 25. `feat(core): add arc generator and pie/donut chart`.
- [ ] 26. `feat(core): add scatter chart`.
- [ ] 27. `feat(core): add sparkline`.
- [ ] 28. `feat(core): add time and log scales`.
- [ ] 29. `perf(core): add LTTB decimation module`.

### M4 – Adaptery
- [ ] 30. `feat(elements): add <tabler-chart> web component` (light DOM, atrybuty, eventy).
- [ ] 31. `feat(elements): add shadow dom mode and cdn iife build`.
- [ ] 32. `feat(react): add react components and useChart hook` + SSR.
- [ ] 33. `feat(vue): add vue components` + SSR.
- [ ] 34. `feat(bootstrap): add bootstrap css/scss mapping and data-api`.
- [ ] 35. `feat(bootstrap): add tabler preset`.
- [ ] 36. `docs: add ssr examples (next, nuxt, astro)`.

### M5 – Wydanie
- [ ] 37. `test: add playwright visual regression tests`.
- [ ] 38. `chore: add size budget check`.
- [ ] 39. `docs: write documentation site`.
- [ ] 40. `chore: add changesets and release 0.1.0`.

## Weryfikacja
- `pnpm test` – testy jednostkowe skal, ścieżek i snapshoty SVG.
- `pnpm dev` w `apps/docs` – ręczny przegląd wszystkich typów wykresów w light/dark,
  resize okna, hover/tooltip, toggle legendy.
- Test SSR: skrypt Node renderujący wykres do stringa bez DOM.
- `pnpm size` – sprawdzenie budżetu gzip core i każdego typu wykresu.
