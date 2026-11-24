# Tree Streets of Vancouver

Static site testing whether Vancouver's 26 tree-named streets actually carry
their namesake tree. `build/build.py` (stdlib-only Python) reads the 80MB
`public-trees.geojson` (City of Vancouver public street-tree inventory) plus
a cached street-centerline dataset, and writes `site/data/{streets,trees,taxa}.json`.
`site/` is vanilla JS + MapLibre, no build step. `SCHEMA.md` is the frozen
data contract between `build/` and `site/` — change it on both sides or not
at all.

**Repo state:** this whole directory is untracked in the enclosing git repo
(rooted at `~/Projects/sandbox`, branch `gh-pages`) — `git status` shows one
`?? tree-streets/` line. Nothing described below has been committed.

## Session work log (2026-08-05 → 2026-08-06)

All done, verified working in a browser, **none of it committed**:

1. **Park-tree bug fix.** Trees were assigned to streets by address string
   alone, and parks have street addresses (VanDusen Botanical Garden =
   5251 Oak St, 1,845 trees; Vanier Park = 1000 Chestnut St; Kits Beach =
   1499 Arbutus St). Fixed in `build/build.py`: trees must now also be
   ≤80m (`MAX_STREET_DIST_M`) from the street's centerline. ~3,400 trees
   excluded. Oak St's oak ratio actually rose (2.9×, was diluted to 1.4×
   by park trees). Rebuild with `python3 build/build.py` from repo root
   (centerline data is cached in `build/cache/`, no network needed).

2. **Count-first UI.** Leaderboard rows, the detail-panel hero number, and
   headline copy now lead with the namesake tree *count*, percentage
   demoted to a parenthetical (a 5.8× ratio on 2 trees was reading as more
   dramatic than it is). See `app.js`: `renderBoard`, `renderDetail`,
   `headlineFor`.

3. **Citywide context strip.** `streets.json`'s `city` object gained
   `species_count` and `top_species` (top 5 by count). Rendered as
   `#citystrip` in `app.js` (`renderCityStrip`) — a full-width footnote row
   in the masthead, below the KPI numbers, separated by a hairline rule
   (mirrors `.colophon`'s treatment). Went through two other positions
   first (floating card over the map, then squeezed above the KPIs) before
   landing here on visual feedback — see the `tree-streets-project` memory
   for why those didn't work.

4. **Binary colour system.** Map/legend collapsed from a 5-tier diverging
   scale + 3-tier evidence line-weight to just two colours: has its
   namesake (blue, `--c-has`) / none of it (red, `--c-none`), uniform line
   width. The detail panel's statistical prose (`headlineFor`,
   `evidenceFor`, `classOf`, `evidenceOf`) is untouched — only the *visual*
   encoding changed, not the underlying reasoning or copy.

5. **Street View link.** Tree popups now have "See area in Street View ↗",
   linking to Google's key-less Street View deep link
   (`streetViewURL(lon, lat)` in `app.js`) using the tree's exact
   coordinates.

6. **Tree-street naming history.** The rail's intro text (`.rail__note` +
   `.board__key` in `index.html`) used to explain how to read the
   chance-band chart; it now tells the real story of why the streets
   aren't alphabetical (CPR surveyor Lauchlan Hamilton, 1887 map, a 1936
   letter to city archivist Major J.S. Matthews). Sourced from Elizabeth
   Walker's *Street Names of Vancouver* (Vancouver Historical Society,
   1999) — the actual book PDF is at `~/Downloads/Street_Names_of_Vancouver.pdf`
   (168pp, 72MB). `pdftotext` isn't installed on this machine; `pypdf` was
   pip-installed ad hoc to extract/search it (not a repo dependency).

7. **Data-scope accuracy pass.** The data is *only* the City's public
   street-tree inventory — private-property trees aren't counted. Caught
   one overreaching line ("Cedar Crescent... has never had a cedar" →
   "not one of its street trees today is a cedar") and strengthened the
   `.colophon` footer disclaimer as the single place this caveat lives.
   Audited the rest of the copy — it was already disciplined about tying
   claims to explicit tree counts (`st.n`); the risk is specifically in
   hand-written prose that isn't generated from those count-driven
   templates.

## In progress / interrupted

Was trying to track down the actual text of **Vancouver By-law 2534, 1938**
(the by-law that renamed Cedar Street to Burrard Street, cited in Walker's
book) — the user got curious about it, not required for anything already
shipped. Hit a wall: `vancouver.ca`, `vpl.ca`, and `searcharchives.vancouver.ca`
are all behind Cloudflare bot-protection that 403s `WebFetch`/`curl` (even
with a browser user-agent) — got a Cloudflare "Attention Required" challenge
page every time. Was mid-navigation to
`vancouver.ca/your-government/individual-bylaws.aspx` via the
`claude-in-chrome` tool (drives a real browser, should pass the challenge)
when interrupted — hadn't yet searched or found anything. Leads not yet
tried: the City of Vancouver Archives search portal
(`searcharchives.vancouver.ca`) via a real browser session, or the VPL
digital bylaws collection (`vpl.ca/digital-library/city-vancouver-bylaws`).

## Working notes for future sessions

- **Verify UI changes with headless Chrome over CDP** — no Playwright
  installed here. Launch
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 --user-data-dir=<scratch dir>`,
  serve `site/` with `python3 -m http.server`, drive it from Node's
  built-in `WebSocket`. The reusable driver (`cdp.js`) lives in an old
  session's scratchpad, not this repo — copy it forward each session
  rather than rewriting it.
- **Sites behind Cloudflare** (vancouver.ca, vpl.ca, searcharchives, the
  bccd.vpl.ca PDF host) block scripted fetches outright — use
  `claude-in-chrome` (real browser) instead of `WebFetch`/`curl` for those.
- Implementation work in this session was delegated to a Sonnet subagent
  (continued across tasks via `SendMessage`, not re-spawned) per user
  preference — diagnosis and spec-writing stayed in the main session,
  mechanical implementation went to the cheaper model, then got verified
  visually here before reporting back.
