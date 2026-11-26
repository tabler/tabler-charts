# Tabler Charts screenshots

Pictures of the charts, made the same way every time: for release notes, the website, the README and social posts. Each picture comes from a small page in this app, so it can be made again after any change to the library, with the same framing, the same font and the same data.

## What is in here

- `src/pages/` has one file per picture: a title, a subtitle and a chart config. The file name becomes the name of the pictures.
- `shot.html` and `src/frame.css` are the frame: a 1024×768 canvas with a card and the logo.
- `captures/` holds the finished PNG files. This folder isn't committed. Run the capture to fill it.

Every page is captured in light and dark mode, and in normal and 2× size. That's four files per page: `line.png`, `line@2x.png`, `line-dark.png` and `line-dark@2x.png`.

## How to use it

Look at the pages in the browser, on port 3020. Add `&theme=dark` to a page's URL for dark mode:

```sh
pnpm screenshots:dev
```

Make the pictures:

```sh
pnpm screenshots
```

To make pictures of a few pages only, name them:

```sh
pnpm screenshots line donut
```

The capture uses Playwright's Chromium (`pnpm exec playwright install chromium` if it is missing) and loads Inter from Google Fonts, so it needs a network connection.

## Adding a picture

Copy one of the files in `src/pages/` and change what it shows. Open the page in the browser in both color modes, then run the capture for that page and check the four files.

A page with more than one chart, or with anything else next to the chart, builds its card by hand with `render(body)` instead of `config`.
