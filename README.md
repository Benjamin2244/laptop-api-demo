# benjamin ward — portfolio

Personal portfolio and CV site. Plain static HTML, CSS and JavaScript with no
build step, served by GitHub Pages.

> **Status: skeleton.** Structure, navigation and styling are in place; page
> content is placeholder text pending a content pass.

## Structure

```
index.html                 home — hub linking to every section
education.html
work-experience.html
work-projects.html
personal-projects.html
certifications.html
skills.html
extracurricular.html
project-placeholder.html   example project page (linked from two sections)
cv.html                    PDF viewer + download
assets/
  docs/                    project documents offered for reading and download
  css/site.css             design tokens, layout primitives, components
  js/site.js               shared chrome: topbar, back link, footer
  js/reveal.js             scroll-reveal animations
  js/api-status.js         laptop API status widget
  js/analytics.js          Google Analytics tag
```

All pages sit flat in the repo root and every path is **relative**. This site
deploys as a GitHub Pages project site under `/laptop-api-demo/`, where
root-relative paths (`/assets/…`) would 404.

## Navigation

There is no nav bar. Each page other than the home page carries a transparent
top row: the back link on the left, `Benjamin Ward` on the right (which goes
home). The footer carries a quiet list of every section as a secondary route.

The back link resolves at runtime, because a project page can be reached from
several sections:

1. If the referrer is same-origin, back returns there and is labelled with that
   page's name — so the same project page reads `← Work Projects` or
   `← Skills & Tech` depending on how you arrived.
2. Otherwise (deep link, shared URL, new tab) it falls back to the parent the
   page declares via `data-back` on its `<main>`.

## Design system

Colour, spacing, type and motion all come from custom properties on `:root` in
`site.css`, with a dark palette swapped in under `prefers-color-scheme: dark`.

Each section owns a **hue**, set with `data-hue` on the page's `<main>` (or on a
card's `<li>` on the home page). The hue drives that page's heading gradient,
rule, card glow, timeline spine and tag colours via `--hue-1` / `--hue-2`, so
sections feel distinct while sharing one palette. Available hues: `indigo`,
`violet`, `teal`, `blue`, `amber`, `cyan`, `rose`, `green`.

### Density

The layout is tuned to put as much on screen as possible without crowding:
section cards go two-up from 22rem and pack in from there, timeline entries
pair into two columns from 64rem, and the content column runs to 78rem.

Cards are **compact by default and open up at 40rem** — smaller padding, a
smaller title and a line-clamped description on phones — which keeps the
mobile-first, `min-width`-only convention rather than reaching for
`max-width` overrides.

With placeholder content, every section page fits within about one 1280×900
screen, and the home page shows all eight cards without scrolling.

### Motion

Elements marked `data-reveal="<group>"` fade and rise in as they scroll into
view, staggered within their group. Cross-page navigation uses the View
Transitions API where supported.

Three rules the motion layer must always satisfy:

- **Nothing depends on JS to be visible.** The hidden state is scoped to
  `.js [data-reveal]`, and `reveal.js` is what sets `.js` — so with JS off,
  everything renders normally.
- **`prefers-reduced-motion` wins.** The hidden state sits inside a
  `no-preference` query, and a catch-all block neutralises every remaining
  transition and animation.
- **Print snaps to the final state.** `@media print` forces reveals visible and
  disables transitions, so printing never captures a half-faded page.

Reveals are decorative only — if `IntersectionObserver` is missing or never
fires, a timeout shows the content anyway.

### Adding a page

1. Create the HTML file in the repo root, copying the shell of an existing
   section page.
2. Set `data-back` on `<main>` to its default parent, and `data-hue` to one of
   the hues above.
3. Add an entry to `PAGES` in `assets/js/site.js` — that one array drives both
   the footer list and the back-link labels.
4. Mark the content blocks you want animated with `data-reveal="…"`.

## Documents

Longer-form project material — reports, slide decks — lives in `assets/docs/`
and is both embedded and downloadable on the page it belongs to, using the
`.doc-actions` / `.doc-viewer` pair that the CV page also uses.

Two rules for those viewers:

- **The source file is served as the author made it.** Nothing is downsampled
  or re-encoded to save bytes. Where a format browsers cannot display is
  involved (a `.pptx`), a PDF rendering sits alongside it for viewing and the
  original stays there to download.
- **A viewer is never inside `[data-reveal]`.** The reveal starts an element at
  `opacity: 0`, and a PDF frame that loads while invisible never paints once
  shown. Mark the heading, prose and buttons instead, and leave the `<iframe>`
  out of it — `loading="lazy"` then keeps the file off the wire until someone
  scrolls to it.

## Local preview

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. A plain file:// open mostly works, but the
back-link referrer logic and the API widget behave properly over HTTP.

## Laptop API

The footer carries a status widget for a small Flask API tunnelled off a
laptop over ngrok. It checks once per session, fails quietly to `offline` when
the laptop is off, and reveals the raw JSON when clicked.

To run the API end (from the separate project holding `app.py`):

```
python app.py
ngrok http --domain=measured-boar-awaited.ngrok-free.app 5000
```
