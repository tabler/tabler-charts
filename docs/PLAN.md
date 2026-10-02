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
5. **M5 – Dopracowanie:** docs, testy wizualne, budżet rozmiaru, publikacja 0.1.0 na npm (publikacja wstrzymana, zob. krok 40).
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
- [x] 15. `feat(core): add line chart` (+ demo; przerzedzanie etykiet zachowuje ostatnią etykietę) – wspólny layout kartezjański w `charts/cartesian.ts` (domena Y, marginesy, clip), wejście `@tabler/charts/line`; `Chart` + `line` ≈ 7 kB gzip.
- [x] 16. `feat(core): add area chart` (+ demo) – gradient przez jedną wspólną maskę (kolor z CSS serii, siła z `--tc-area-gradient-*`), obszary zawsze pod liniami, wejście `@tabler/charts/area`.
- [x] 17. `feat(core): add bar chart (grouped)` (+ demo) – słupki ≤ 24 px, odstęp 2 px, zaokrąglony tylko koniec z danymi (`barPath()`), wartości ujemne w dół (`.tc-bar-negative`), wejście `@tabler/charts/bar`.
- [x] 18. `docs: add playground app` – Vite, strona z line/area/bar, przełącznik light/dark. **Zrobione wcześniej (po kroku 14)**: playground na https://tabler-charts.vercel.app, importuje bibliotekę ze źródeł; od teraz każdy krok z nowym typem wykresu / funkcją dodaje swoje demo.

### M2 – Interakcje i a11y
- [x] 19. `feat(core): add event delegation and nearest-point hit testing` – `ctx.onHitTest()` (layout liczony raz), `categoryHitTester()`, zdarzenia `hover`/`click`, `chart.hitTest()`, odświeżanie hover po zmianie danych, dotyk.
- [x] 20. `feat(core): add tooltip and crosshair` (+ dema) – warstwy hover (crosshair / pas kategorii / aktywne punkty) w drzewie SVG z cache treści typu wykresu, tooltip HTML (`.tc-tooltip`, `format`, `footer`), pozycjonowanie z odbiciem przy krawędzi, opcje `tooltip` / `crosshair`.
- [x] 21. `feat(core): add legend with series toggle` – legenda HTML (przyciski z `aria-pressed`), auto od 2 serii, `ChartType.legend()` (gotowe pod wycinki pie), ukryte serie zachowują slot koloru, `toggleSeries()`, zdarzenie `legend-toggle`, `Series.hidden`.
- [x] 22. `feat(core): animate data updates via css transitions` – przejścia `d`/`cx`/`cy`/`transform` na tych samych węzłach, wejścia (odsłanianie linii, wzrost słupków od bazy, fade), bez animacji przy zmianie rozmiaru, `animate: false`, wszystko przez `--tc-duration`. Safari: `d` nie animuje się (przeskok).
- [x] 23. `feat(core): add accessibility (title/desc, keyboard nav, data table)` – ukryta (lub widoczna) tabela danych, nawigacja strzałkami / Home / End / Esc z tooltipem, komunikaty `aria-live`, fokus na SVG; poprawka SSR: puste elementy HTML zamykane jawnie.

- [x] 24a. `refactor(core): move tooltip, legend, table and keyboard into plugins` – `ChartPlugin` (hooks: beforeRender / layers / svgAttrs / afterRender / reservedHeight / destroy), wtyczki `highlight`, `tooltip`, `legend`, `dataTable`, `keyboard`; `@tabler/charts` = `Chart` z domyślnymi wtyczkami, `@tabler/charts/core` = goły `Chart`. Rozmiar: core + line 9,2 kB gzip, domyślny Chart + line 11,3 kB (zysk ~2 kB; dalsza optymalizacja w M5).

### M3 – Kolejne typy
- [x] 24. `feat(core): add stacked and horizontal bars` (+ dema) – `stackSeries()` (dodatnie w górę, ujemne w dół, tryb `'percent'`), `stacked` dla `bar` i `line`/`area`, `orientation: 'horizontal'` dla `bar`; 3 commity: stacked bars, stacked areas, horizontal bars.
- [x] 25. `feat(core): add arc generator and pie/donut chart` (+ demo) – `arcPath()` zgodny z d3-shape (60k przypadków), odstęp 2 px o stałej szerokości, `pie` / `donut` z sumą w środku, wycinki w legendzie / tabeli / klawiaturze, tooltip z udziałem, aureola przy hover (`Hit.mark`), wejście `@tabler/charts/pie`.
- [x] 26. `feat(core): add scatter chart` (+ demo) – dwie osie liczbowe (`domainOf()`), bąbelki proporcjonalne polem (`size`), najbliższy punkt w 2D (wyszukiwanie binarne po x), aureola przy hover, klawiatura po punktach, tabela punktów, wejście `@tabler/charts/scatter`.
- [x] 27. `feat(core): add sparkline` (+ demo z kafelkami) – warianty line/area/bar, bez osi/legendy/tabeli, dopasowany zakres dla linii, kropka na ostatniej wartości, znaczniki min/max, tooltip, wejście `@tabler/charts/sparkline`.
- [x] 28. `feat(core): add time and log scales` (+ demo) – `time()` z tickami kalendarzowymi (sekundy…lata, lokalnie / UTC, większa jednostka na granicy), `log()`; `x: { type: 'time' }` dla line/area (prawdziwe odstępy, binarne szukanie najbliższego punktu), `y: { scale: 'log' }` dla wszystkich osi wartości; 2 commity.
- [x] 29. `perf(core): add LTTB decimation module` (+ demo 50k punktów) – `lttb()` / `lttbIndices()` z zachowaniem przerw i wyrównaniem do baz stosów, opcja `decimate: N` w line/area, wejście `@tabler/charts/decimate`; do tego limit 1000 wierszy tabeli danych, `extent()` zamiast spread, szybszy `thinTicks`. 50k punktów: 22 ms (z decymacją) / 58 ms.

### M4 – Adaptery
- [x] 30. `feat(elements): add <tabler-chart> web component` (light DOM, atrybuty, eventy) – pakiet `@tabler/charts-elements`: `defineChartElement()` (rejestracja na żądanie, bez efektów ubocznych importu; wszystkie typy i wbudowane pluginy) oraz `@tabler/charts-elements/core` z wybranymi typami i pluginami; dane z `<script type="application/json">` lub property `data`, typ i wspólne opcje w atrybutach, reszta w `options` (atrybut JSON / property), zdarzenia `tc-hover` / `tc-click` / `tc-legend-toggle` / `tc-render`, obserwacja zmian skryptu (frameworki), `display: block` z zerową specyficznością, demo w playgroundzie.
- [x] 31. `feat(elements): add shadow dom mode and cdn iife build` – `@tabler/charts-elements/shadow` (osobne wejście, więc tryb light za nie nie płaci): shadow root ze wspólnym arkuszem przez `adoptedStyleSheets` (fallback `<style>`), tokeny przepisane z `:root` na `:host` przy buildzie, `data-theme` na elemencie, części `::part(root | chart | legend | tooltip | table)`, ponowne użycie deklaratywnego shadow root; `dist/tabler-charts.min.js` (IIFE, globalny `TablerCharts`, pola `unpkg` / `jsdelivr`) rejestruje element i wstrzykuje style (`data-no-styles` wyłącza), 29 kB gzip razem z CSS.
- [x] 32. `feat(react): add react components and useChart hook` + SSR – pakiet `@tabler/charts-react`: `<LineChart>`, `<BarChart>`, … (po jednym na typ, czyste wywołania, więc nieużywane typy znikają przy tree-shakingu), `<TablerChart type={…}>`, `useChart(config)` dla własnego elementu; propsy = konfiguracja (porównywane klucz po kluczu), `onHover` / `onClick` / `onLegendToggle` / `onRender` (zawsze najnowsze), ref = instancja `Chart`, `className` / `style` kontenera; SSR przez `chartToString` z identyfikatorami z `useId()` (hydratacja bez ostrzeżeń, przeglądarka przejmuje SVG w miejscu), `'use client'` w buildzie, React 18/19; demo w playgroundzie.
- [x] 33. `feat(vue): add vue components` + SSR – pakiet `@tabler/charts-vue` (Vue 3.5+, funkcje render, bez SFC): `<LineChart>`, `<BarChart>`, … i `<TablerChart :type>`, opcje jako atrybuty (kebab-case → camelCase, porównywane klucz po kluczu), `data` obserwowane głęboko (mutacje w miejscu też aktualizują wykres), emity `hover` / `click` / `legend-toggle` / `render`, `expose({ chart })`, `class` / `style` na kontenerze, `useChart(el, config)`; SSR (także Nuxt) przez `chartToString` z identyfikatorami z `useId()`, hydratacja bez ostrzeżeń; demo w playgroundzie.
- [x] 34. `feat(bootstrap): add bootstrap css/scss mapping and data-api` – pakiet `@tabler/charts-bootstrap`, 2 commity: (1) `scss/_charts.scss` + `dist/bootstrap.css` (0,47 kB gzip) mapują tokeny na zmienne Bootstrapa 5.3 (czcionka, kolory, ramki, promień, cień, seria 1 = `--bs-primary`), deklarowane na `:root` i każdym `[data-bs-theme]`, z fallbackami; serie 2–8 zostają ze zwalidowanej palety (żółty/różowy Bootstrapa nie przechodzą testów CVD); wszystko jako `!default` w SCSS. (2) data-API: `init()`, `observe()`, `getChart()`, `dispose()`; `data-tc-chart` + `data-tc-*` jako opcje, dane z `data-tc-src` (fetch, `aria-busy`), inline JSON lub `data-tc-data`, zdarzenia `tc-*` i `tc-error` (błędna deklaracja nie zatrzymuje reszty); `dist/tabler-charts-bootstrap.min.js` sam wstrzykuje style i inicjalizuje (`data-observe`, `data-no-styles`); demo na prawdziwym Bootstrapie w iframe.
- [x] 35. `feat(bootstrap): add tabler preset` – `scss/_tabler.scss` (`@forward` mapowania z konfiguracją, działa z `@use … with` i z `@import`) + `dist/tabler.css`: zmienne `--tblr-*` przy atrybucie `data-bs-theme` (nowe `$tc-theme-attribute` / `$tc-theme-scopes`), zakresy także dla `data-bs-theme-primary` / `-base` / `-font` / `-radius`, tło karty `--tblr-bg-surface`, szary `--tblr-secondary`; primary Tablera przechodzi walidację z paletą w obu trybach; demo na prawdziwym `@tabler/core` w iframe.
- [x] 36. `docs: add ssr examples (next, nuxt, astro)` – `examples/` w workspace: Next 16 (App Router, wykresy w Server Component, Client Component z `onHover`), Nuxt 4 (hydratacja, `@hover`, reaktywne dane zmieniane w miejscu), Astro 7 (`chartToString()` jako statyczne SVG bez JS i wyspa `<tabler-chart>` wokół SVG z serwera); budowane w CI (`pnpm examples:build`); sprawdzone: SVG w surowym HTML serwera, hydratacja bez ostrzeżeń, bez duplikatów, interakcje.

### M6 – Typy z Tablera
Typy używane w kartach i dashboardach tabler/tabler (nie na stronach demo ApexCharts), wg liczby użyć.
- [x] 41. `feat(core): add gauge chart` (+ demo, 3 kafelki w galerii) – `gauge` (radial bar): wartość jako łuk na torze, udział i nazwa w środku (`center`), `max`, `startAngle` / `angle` (pełny pierścień, tarcza 270°, półkole), grubość / odstęp / zaokrąglenie, kilka współśrodkowych pierścieni z legendą i tabelą, tooltip z udziałem, płynne przejścia `d` (`arcPathStable`), wejście `@tabler/charts/gauge`.
- [x] 42. `feat(core): dash and width per series` – `series[].dash` (px lub pełne `stroke-dasharray`) i `series[].width` jako `--tc-series-dash` / `--tc-series-width` na grupie serii (`y.max` już było); kafelek „This week vs. last” w galerii.
- [x] 43. `feat(core): mixed series in bar charts` – `series[].type: 'bar' | 'line' | 'area'` w wykresie `bar`: linie przez środki pasm nad słupkami, poza stosem (ale w domenie osi), w tooltipie / legendzie / tabeli jak każda seria, `curve`; kafelki „Spend and leads” i „Mentions” w galerii.
- [x] 44. `feat(core): tristate sparkline` – `variant: 'tristate'`: liczy się tylko znak (wygrana w górę, strata w dół w `--tc-negative-color`, remis jako kreska na linii środka); kafelki w demie sparkline i galerii.
- [x] 45. `feat(core): add heatmap chart` (+ demo, kafelki w galerii) – wiersze = serie, kolumny = etykiety (te same dane co line/bar), jedna barwa od pustego odcienia do pełnego koloru (`color-mix`, `--tc-heat-color` / `--tc-heat-empty`), `min` / `max`, odstęp i zaokrąglenie komórek, puste komórki dla `null`, pierścień przy hover, tooltip z całą kolumną i aktywnym wierszem, klawiatura w 2D, tabela, wejście `@tabler/charts/heatmap`.
- [x] 46. `feat(core): add candlestick chart` (+ demo, kafelek w galerii) – `candlestick` (OHLC): knot low–high i korpus open–close, zielony przy wzroście (`--tc-up-color`), czerwony przy spadku (`--tc-negative-color`), wspólne osie / siatka / format dat (`x.type: 'time'`), tooltip Open/High/Low/Close w kolorze świecy, tabela, wejście `@tabler/charts/candlestick`.

### Dalsze funkcje
- [x] 47. `feat(core): add annotations` – `annotations` w line / area / bar (także poziomych) / candlestick: linia przy wartości (`y: 99.9`), pasmo wartości (`y: [40, 60]`), linia przy kategorii lub dacie na osi czasu (`x: 'Jun'`), pasmo kategorii (`x: [a, b]`); etykieta (`label`, `position`), kolor (`--tc-annotation-color`), klasa; pasma pod seriami, linie i etykiety nad nimi (pod osiami); wartości adnotacji wchodzą do domeny osi, adnotacje poza stałym zakresem są pomijane; przełącznik w demie line i 2 kafelki w galerii.
- [x] 53. `feat(core): add radar chart` (+ demo, 2 kafelki w galerii) – `radar`: szprycha na etykietę, wielokąt na serię (te same dane co line/bar), wypełnienie (`fill`), kropki (`points`), pierścienie jako wielokąty lub okręgi (`grid`), oś promieniowa `r` (`min` / `max` / `ticks` / `format` / `show`); promień dopasowany do etykiet szprych (z minimum, za długie etykiety są przycinane wielokropkiem); ścieżki o stałej strukturze (braki w środku), więc dane się płynnie zmieniają; seria rośnie ze środka; hover po najbliższej szprysze z linią wzdłuż niej (`Hit.guide`), tooltip, klawiatura, tabela; wejście `@tabler/charts/radar`.
- [x] 54. `feat: add radar to the adapters` – `RadarChart` w React / Vue, typ `radar` w `<tabler-chart>` i data API Bootstrapa (i w buildach CDN).
- [x] 55. `feat(core): export charts as svg and images` – `@tabler/charts/export` (także w `@tabler/charts`): `exportSVG()` – samodzielny SVG z wpisanymi obliczonymi stylami (motyw CSS i zmienne `--tc-*` jadą razem z plikiem), transformacje CSS jako atrybuty `transform`, bez warstw hovera i ukrytych elementów, z legendą w układzie ze strony (`legend: false` ją pomija), tłem `--tc-surface` (`background`), `<title>`; trwające animacje są najpierw kończone. `exportImage()` – PNG / JPEG / WebP przez canvas w skali `scale` (domyślnie 2×). `downloadChart()` – plik o nazwie z tytułu wykresu. Demo „Export” z podglądem, test e2e (pobrany SVG wyrenderowany na pustej stronie, rozmiar PNG).
- [x] 56. `perf(core)`: wydajność aktualizacji – legenda mierzona tylko przy `height: 'container'` (wymuszony layout przy każdym renderze), ukryta tabela aktualizowana w wolnej chwili (`idle.ts`) i nie przy resize, rozmiar czcionki nie czytany przy `setData`, brak przejść powyżej 1000 elementów (chyba że `animate: true`), scatter jako jedna ścieżka na serię (9000 punktów: aktualizacja 71 → 28 ms), `[data-resizing]` przez `--tc-duration` zamiast selektora `*`. Selektory CSS to <3% czasu przeliczania stylów – reszta zostaje.
- [x] 57. `perf(core)`: odchudzenie `chart.ts` / `cartesian.ts` – oś czasu w module `time`, zakotwiczenie tooltipa w module tooltipa (`hitAnchor`, `chart.pointer`), prostsza nazwa dostępna, nasłuch wskaźnika jako plugin `pointer()` (włączany przez `highlight()` i `tooltip()`). `core + line` 10,99 → 10,52 kB.

### Jakość
- [x] 48. `test(core): check node identity in the DOM fuzzer` – niezmienniki: hover / leave / klawisz nie zmieniają węzłów ani atrybutów treści, przełączenie serii nie odtwarza innych, aktualizacja nie montuje svg od nowa; `FUZZ_ITERATIONS` / `FUZZ_STEPS` / `FUZZ_SEED`. Znalazł błąd: warstwy svg bez kluczy (pasmo adnotacji przed listą serii odtwarzało wszystkie serie) → `fix(core): key the chart layers`.
- [x] 49. `test: add an axe accessibility audit` – axe-core (WCAG 2.2 AA) na całym playgroundzie w obu motywach i w stanach interaktywnych (tooltip, widoczna tabela, fokus, ukryta seria), w workflow Visual. Znalazł: brak nazwy dostępnej wykresu bez `title` → domyślna nazwa z typu i serii; wykres w shadow DOM ignorował ciemny motyw przodka → `:host-context` (Chromium).
- [x] 50. `test: add phone-width visual tests` – cała galeria przy 375 px (profil Chromium z dotykiem) i tooltip po tapnięciu. Znalazły: etykiety skrajne osi pasmowej i ostatniej kolumny heatmapy poza wykresem, etykiety adnotacji poza wykresem i nachodzące na siebie, bąbelki zasłaniające osie → `fix(core): fit labels and bubbles into narrow charts`.
- [x] 51. `test(core): check that SSR and DOM rendering agree` – losowe konfiguracje każdego typu renderowane obiema drogami muszą dać ten sam wynik (po normalizacji zapisu); 4800 konfiguracji zgodnych. Przy okazji: puste warstwy hovera nie są już renderowane.
- [x] 52. `perf(core)`: odchudzanie poniżej 11 kB – `core + line` 11,28 → 10,85 kB gzip. Do opcjonalnych funkcji trafiły: etykiety dat (`dates`, rejestrują je `/time` i `/candlestick`), dziedzina i podziałka osi log (`log`) oraz hydratacja węzeł po węźle (`@tabler/charts/hydrate`; bez niej serwerowy svg jest podmieniany). `@tabler/charts` i adaptery rejestrują wszystko, więc pełne pakiety urosły o ~0,1 kB rejestracji. Budżety zaostrzone. Mikrozmiany (krótsze nazwy, `AbortController`) nic nie dają: gzip i tak ściska powtórzenia.

### M5 – Wydanie
- [x] 37. `test: add playwright visual regression tests` – Playwright (Chromium) na zbudowanym playgroundzie (`vite preview`): każdy kafelek galerii w trybie jasnym i ciemnym, każde demo (losowe dane z ziarnem, zamrożony zegar), stany interakcji (tooltip i crosshair, pasmo słupka, aureola wycinka, fokus z klawiatury, ukryta seria); wzorce dla Linuksa z obrazu Playwright w CI (`.github/workflows/visual.yml`), lokalne wzorce innych platform poza repo; 2 commity: testy + workflow, potem wzorce.
- [x] 38. `chore: add size budget check` – `pnpm size` (rolldown + gzip typowych importów do `.size/`), w CI. Budżety są w `bundlewatch.config.cjs` (jednostki Bundlewatch, 1 KB = 1024 B): w CI sprawdza je Bundlewatch i raportuje na PR-ach, lokalnie `pnpm size`. **Zrobione wcześniej**, w fazie optymalizacji po M3.
- [ ] 39. `docs: write documentation site`. **Na samym końcu** (decyzja z 2026-10-01): po wszystkich innych krokach, gdy API się ustabilizuje.
- [ ] 40. `chore: add changesets and release 0.1.0`. **Wstrzymane** (decyzja z 2026-10-01): na razie bez wydania – bez changesets, podbijania wersji, `npm publish` i tagów; pakiety zostają na `0.0.0`.

## Weryfikacja
- `pnpm test` – testy jednostkowe skal, ścieżek i snapshoty SVG.
- `pnpm dev` w `apps/docs` – ręczny przegląd wszystkich typów wykresów w light/dark,
  resize okna, hover/tooltip, toggle legendy.
- Test SSR: skrypt Node renderujący wykres do stringa bez DOM.
- `pnpm size` – sprawdzenie budżetu gzip core i każdego typu wykresu.
