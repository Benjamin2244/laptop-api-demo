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
  css/site.css             design tokens, layout primitives, components
  js/site.js               shared chrome: topbar, back link, footer
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

### Adding a page

1. Create the HTML file in the repo root, copying the shell of an existing
   section page.
2. Set `data-back` on `<main>` to its default parent.
3. Add an entry to `PAGES` in `assets/js/site.js` — that one array drives both
   the footer list and the back-link labels.

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
