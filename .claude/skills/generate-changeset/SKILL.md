---
name: generate-changeset
description: >-
  Creates a Tabler Charts changeset file in `.changeset/` from the current code
  changes. Use this skill for every changeset in this repo — when the user asks
  for a changeset, version bump, release note, or changelog entry, and also on
  your own whenever a change under `packages/` is about to be committed or
  opened as a PR. Never hand-write the file instead.
---

# Generate changeset

Create one `.changeset/<name>.md` file per logical change. Ground package selection and bump level in **actual git output**—not guesses.

## 1. Inspect the change

From the repository root, determine scope:

- **Uncommitted work:** `git status -sb`, `git diff`, `git diff --cached`
- **Branch work (base: `main`):** `git diff origin/main...HEAD --stat`, then targeted `git diff origin/main...HEAD -- <paths>`

If the user points at specific files or a feature, read those diffs first. Check `.changeset/` for a changeset the branch already has, so the same change is not described twice.

## 2. Map paths to packages

| Path | Package |
|------|---------|
| `packages/core/` | `@tabler/charts` |
| `packages/react/` | `@tabler/charts-react` |
| `packages/vue/` | `@tabler/charts-vue` |
| `packages/elements/` | `@tabler/charts-elements` |
| `packages/bootstrap/` | `@tabler/charts-bootstrap` |
| `apps/docs/`, `examples/`, `tests/`, `docs/` | **No changeset** — not published |
| Root tooling (`.github/`, `scripts/`, configs, lockfile only) | **No changeset** unless it changes what a published package ships |

Include **every affected package** in the frontmatter. Omit packages with no relevant changes.

The five packages are a `fixed` group in `.changeset/config.json`: they are always released together at one version, whichever of them a changeset lists. The frontmatter therefore decides **whose changelog gets the entry**, not who gets a new version. A fix inside `packages/core/` lists only `@tabler/charts`; a new chart type that also adds a React component, a Vue component, an element type and a Bootstrap preset lists all five.

## 3. Choose bump level (per package)

| Level | When |
|-------|------|
| **patch** | Bug fixes, small improvements, style/accessibility tweaks, CSS variable/token fixes, type fixes |
| **minor** | New chart types, new options, new components or exports, new CSS variables, significant enhancements |
| **major** | Breaking changes, removed or renamed options/exports, rewrites that break consumers. Never choose it on your own: stop and ask the user first |

Because the group is fixed, the highest bump among all pending changesets wins for every package. Use the same level for every package in one changeset.

When unsure between patch and minor: prefer **patch** for fixes and visual tweaks; prefer **minor** for new user-facing capabilities.

## 4. Write the description

A changeset is one line in a changelog. It is not a summary of the work.

- **One sentence, 130 characters or fewer**, including backticks. This is the limit to write to.
- **160 characters is a hard ceiling.** Go over 130 only when a shorter version would drop a fact the reader needs — a long list of affected chart types, for example. Never go over 160.
- Start with: `Added`, `Updated`, `Fixed`, or `Removed`
- Say **what** changed and **where** (chart type, option, component, CSS variable). Then stop.
- **Name at least one concrete thing**: a chart type, option, component, export, CSS variable, attribute, or dependency. "Fixed label rendering" and "Updated chart styling" name nothing — a reader cannot tell whether the change affects them. There is no minimum length, but an entry under ~40 characters that names nothing is almost always too vague; a dependency bump like `Updated Vue peer range to ^3.5.` is fine, because the dependency and version are the content.
- Use **backticks** for code tokens:
  - Chart types: `treemap`, `parliament`
  - Options: `innerRadius`, `tooltip.theme`
  - Values: `'light'`, `360`
  - Components and exports: `TreemapChart`, `@tabler/charts/treemap`
  - CSS variables: `--tc-treemap-opacity`
  - Attributes: `data-tc-tooltip`, `aria-label`
  - Functions: `createChart()`

**Count the characters before writing the file:**

```shell
printf '%s' 'Added `treemap` chart type that shows parts of a whole as tiles.' | wc -c
```

If it is over the limit, **cut words**. Never split it into two sentences, a second paragraph, or a bullet list.

### Leave this out

These belong in the PR description, the commit body, or the docs — not in the changeset:

- Why the change was made, or what was broken before
- How it was built: file paths, algorithm internals, refactor steps
- A list of every new option, entry point, and wrapper component
- Migration and rollout notes, unless the change is breaking

**Cut the tail first.** An over-long entry is almost always a good sentence with a trailing justification or inventory glued on. Delete that clause and the length problem is usually solved:

```text
… : the chart no longer inherits the page's `direction`, which flipped `text-anchor`.
… , squarified with the largest in the top left corner.
… ; entry `@tabler/charts/treemap`, `TreemapChart` in React and Vue, type `treemap` in the element.
```

### Examples

Good — short and specific:

```text
(64) Added `treemap` chart type that shows parts of a whole as tiles.
(62) Fixed axis labels overlapping the plot on right-to-left pages.
(76) Updated tooltips to be dark by default, with `tooltip.theme` to switch back.
(63) Removed `legacyColors` option from the `bar` and `line` charts.
```

Too vague — name the thing that changed:

```text
 (22) ❌ Fixed label rendering.
 (62) ✅ Fixed axis labels overlapping the plot on right-to-left pages.
 (23) ❌ Updated tooltip styles.
 (76) ✅ Updated tooltips to be dark by default, with `tooltip.theme` to switch back.
```

Too long — trim it:

```text
(142) ❌ Fix axis labels overlapping the plot on right-to-left pages: the chart no longer inherits the page's `direction`, which flipped `text-anchor`.
 (62) ✅ Fixed axis labels overlapping the plot on right-to-left pages.
```

Over 130 but justified — the list of options is the content, and cutting it would say nothing:

```text
(135) Added `total`, `rows`, `angle`, `startAngle`, `innerRadius`, `gap`, `format`, `center` and `padding` options to the `parliament` chart.
```

Write in **simple English**, even if the user asked in another language.

### Language (simple English)

- Short sentences. Common words. One idea per sentence when possible.
- No buzzwords or filler. Use technical terms only when they appear in the code or are needed to name a behavior.
- Prefer plain phrasing: "Fixed tooltip position near the chart edge" over "Enhanced tooltip placement resolution pipeline".
- Keep the description easy to scan in a changelog—reviewers and users should understand it without reading the diff.

## 5. Pick the filename

- Location: `.changeset/`
- **Kebab-case**, descriptive: `treemap-chart.md`, `fix-rtl-axis-labels.md`, `dark-tooltip.md`
- One logical change per file; split unrelated changes into separate changesets
- Do not overwrite an existing changeset unless the user asks to update it

## 6. File format

```md
---
"@tabler/charts": minor
"@tabler/charts-react": minor
---

One-sentence description here.
```

Rules:

- Frontmatter uses quoted package names: `"@tabler/charts": patch`
- Blank line after closing `---`
- No title heading, no bullet list in the body
- Body is a single line — no second paragraph
- Bump values: `patch`, `minor`, or `major` only

## 7. Validate before writing

- [ ] Every listed package has touched paths in the diff
- [ ] No unpublished package (`@tabler/charts-docs`, the examples) is listed
- [ ] Description is one sentence with action verb, in simple English
- [ ] Description is **130 characters or fewer** — counted, not estimated; over 130 only with a reason, never over 160
- [ ] Description names a concrete chart type, option, component, export, CSS variable, or dependency
- [ ] Code tokens use backticks
- [ ] Filename is kebab-case and not already used for a different change

## 8. Output to the user

After creating the file:

1. Show the full changeset content in a fenced `markdown` block (for easy copy/review)
2. Give the description length, e.g. `112 / 130 characters`; if it is over 130, say why the extra words earn their place
3. Briefly explain **why** each package and bump level was chosen
4. If no changeset is needed (docs-only, tests-only, CI, lockfile-only, etc.), say so and why

Do **not** run `changeset version` or `changeset publish` unless the user explicitly asks.
