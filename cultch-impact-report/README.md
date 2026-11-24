# The Cultch — 2025/26 Impact Report (interactive edition)

An interactive landing-page version of The Cultch's 2025/26 Impact Report, built from the
published PDF (`report.pdf`, 8 landscape spreads).

```
index.html
assets/css/site.css      palette, type, motifs
assets/js/data.js        all report content as structured data
assets/js/site.js        rendering + interactions (ES module)
assets/img/              photos, logo, sponsor bands
assets/fonts/            self-hosted woff2 subsets
report.pdf               the record copy, linked from the page
```

Preview: `python3 -m http.server 8777` then open <http://localhost:8777>.
(ES modules need a server — opening `index.html` over `file://` will not work.)

## Where the assets came from

Everything was extracted from the PDF rather than re-created:

- **Photos** — pulled as the original embedded JPEG streams (not crops of rendered pages),
  so they're at source resolution. Recompressed and resized for web.
- **Logo** — rendered from the PDF vectors at 8× into a CGContext, then converted
  luminance→alpha for a transparent PNG.
- **Sponsor logo bands** — many marks are vector, so these are region crops of page 6
  rendered at 6×, composited on the same cream the panel uses so they sit flush.
- **Palette** — sampled pixel-by-pixel from 2× page renders: cream `#F7FED7`,
  yellow `#F4F767`, sky `#94E5FB`, teal `#71A9B9`, plus the six category chip colours
  and the three revenue-pie colours.

## Type

The PDF embeds **Mabry Pro** (sans), **Fraunces** (quotes) and **Ohno Fatface** (the giant
italic numerals). Fraunces is free and used as-is. Mabry Pro and Ohno Fatface are
commercial, so they're substituted:

| Role | PDF | Here |
|---|---|---|
| Sans / headings | Mabry Pro | Figtree |
| Pull quotes | Fraunces | Fraunces (exact) |
| Display numerals | Ohno Fatface | Bodoni Moda Italic |

## What's interactive

- **Season explorer** — 19 productions, filterable by the report's own category chips
  (OR logic, live counts), with a list view and a Gantt-style timeline view. Rows expand
  for company, run, categories and co-presentation notes; timeline bars jump into the list.
- **Donor wall** — search across all 195 listed names; results stay grouped by giving circle.
- **Cultch Connects** — search the 34 partner organizations.
- **Revenue pie** — hover/focus a segment or legend row to isolate it.
- **Stat circles** — count up when scrolled into view.
- **Page rail** — the PDF's vertical page footer, reused as scroll progress + section nav.

Reduced motion is respected throughout (counters, reveals, parallax and smooth scrolling all
turn off). The layout has no horizontal overflow at 390px or 1440px.

## Note on content

All figures, names and photography belong to The Cultch and are reproduced from the published
report. This is a design exercise, not an official Cultch property.
