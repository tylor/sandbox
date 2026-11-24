# Terrazzo — procedural specimen

A single-file web experiment that procedurally generates terrazzo textures, modeled on the
reference tiles in `samples/`. Includes an optional macOS integration that casts a fresh
slab and sets it as the desktop wallpaper every hour.

## Running

Open `index.html` in a browser. No build step, no dependencies (Google Fonts is the only
network request, and the generator works without it).

The page renders a live, full-viewport texture. Every texture is deterministic: the same
batch number (seed) with the same settings always casts the same slab.

- **New batch** button or **Space** — new random seed
- Batch number field — enter a specific seed to reproduce a slab
- **Export PNG** — renders the tile offscreen at 1024/2048/4096 px and downloads it.
  Sizes are resolution-independent, so a 4096 export matches the on-screen tile exactly.

## Parameters

### Aggregate
| Control | What it does |
|---|---|
| Chip size | Global scale multiplier for all chips (0.4×–2.2×) |
| Density | Target fraction of tile area covered by chips (5–55%) |
| Large-chip share | How much of that area goes to big "hero" chips vs. fine fragments. High = Palladiana-style slabs, low = fine fleck |
| Grout spacing | Minimum cement gap enforced between chips |

### Fracture
| Control | What it does |
|---|---|
| Angularity | Shard sharpness — higher means fewer vertices and more radius variance |
| Worn edges | Corner rounding (quadratic corner cuts), like tumbled stone |
| Elongation | How stretched chips can get along a random axis |

### Matrix
| Control | What it does |
|---|---|
| Fine speckle | Density of tiny flecks in the cement ground |
| Surface grain | Strength of the noise overlay (overlay composite) |
| Marble veining | Toggles veins + internal mottling inside larger chips |

### Stone mix
Palette presets are sampled from the tiles in `samples/`. Every swatch is editable
(click to change color), weighted (number under each swatch controls pick probability),
and removable (× on hover). **+** adds a new color derived from an existing one.
The cement ground color is separate.

Presets may carry `cast` settings (slider values) that apply when selected — e.g.
"Gemstone white" also sets small chip size and low hero share to match the real tile.

| Preset | Source |
|---|---|
| Crisp bianco | `30aa4c…jpg` — white ground, forest/rust/blush |
| Tofino | `5f78c8…jpg` / `GeonTileTofinoTerrazzo…png` — terracotta/amber/forest |
| Soft confetti | `8986.jpg.webp` — muted teal/mustard/clay |
| Nougat | `Fliese-Terrazzo-Optik…jpg` — beige ground, chocolate/grey-blue/white |
| Fine fleck | `OIP…jpeg` — small orange/navy/ochre chips |
| Gemstone white | `gemstone_white_pulido…jpg` — Tylor's home tile: white ground, small chips, nine muted colors |
| Pistachio | invented — pistachio-green ground, cream/forest/rust chips |
| Nero notte | invented — dark ground inversion |

### Casting
- **Tile resolution** — internal render size (512/1024/2048 px)
- **Seamless repeat** — chips wrap across tile edges and the viewport is filled with the
  repeating pattern. Off = single swatch presented on a sample board.

## URL parameters

Used by the wallpaper script, handy for bookmarking:

| Param | Values | Effect |
|---|---|---|
| `ui` | `0` | Hide the control panel and hint |
| `preset` | preset name or `random` | Apply a stone mix (and its cast settings) |
| `seed` | integer or `random` | Set the batch seed |
| `tile` | `512` / `1024` / `2048` | Tile resolution |

Example: `index.html?ui=0&preset=Pistachio&seed=7`

## How it works

All geometry lives in unit tile space `[0,1)`, scaled to pixels at render time — that's
what makes exports resolution-independent.

1. **RNG** — `mulberry32` seeded from the batch number; sub-systems (speckle, mottle,
   grain, each chip) get derived seeds so toggling one feature doesn't reshuffle others.
2. **Ground** — flat cement color, then ~26 large very-low-alpha radial gradients
   (mottle), then thousands of tiny 3–5-gon flecks (speckle) in warm greys, whites, and
   ground-mixed palette colors.
3. **Placement** — dart throwing with a spatial-hash grid for collision. Hero chips are
   placed first (better packing), then small aggregate until the area budget is met or
   2500 consecutive misses. When seamless is on, distances and grid cells wrap toroidally.
4. **Chips** — irregular polygons: 4–8 vertices at jittered angles, radius variance driven
   by angularity, anisotropic stretch for elongation, quadratic corner cuts for worn
   edges. Filled with a faint directional gradient (stone is never flat), plus optional
   veins (jagged low-alpha polylines clipped to the chip) and internal speckle, and a
   crisp darker edge stroke.
5. **Grain** — a 128×128 noise tile pattern composited with `overlay`.
6. **Display** — seamless mode fills the viewport via `createPattern(tile, "repeat")`;
   swatch mode draws the tile centered with a drop shadow.

## Hourly desktop wallpaper (macOS)

Two pieces:

- **`wallpaper.sh`** — renders `index.html?ui=0&preset=random&seed=random&tile=2048` with
  headless Chrome at the display's native resolution (auto-detected via
  `system_profiler`, falls back to 2560×1600), saves to
  `~/Pictures/Terrazzo Wallpapers/terrazzo-<timestamp>.png`, sets it as the wallpaper on
  every desktop via AppleScript, and prunes all but the 24 newest casts.
- **`~/Library/LaunchAgents/com.tylor.terrazzo-wallpaper.plist`** — launchd agent that
  runs the script every hour (`StartInterval 3600`) and once at login (`RunAtLoad`).
  Errors go to `/tmp/terrazzo-wallpaper.err`.

### Managing it

```bash
# run once, right now
./wallpaper.sh

# pause / resume the hourly schedule
launchctl unload ~/Library/LaunchAgents/com.tylor.terrazzo-wallpaper.plist
launchctl load   ~/Library/LaunchAgents/com.tylor.terrazzo-wallpaper.plist

# check it's registered
launchctl list | grep terrazzo

# remove entirely
launchctl unload ~/Library/LaunchAgents/com.tylor.terrazzo-wallpaper.plist
rm ~/Library/LaunchAgents/com.tylor.terrazzo-wallpaper.plist
```

Requires Google Chrome at `/Applications/Google Chrome.app`. If a render ever fails, the
previous wallpaper stays put and the script exits nonzero.

## Files

```
index.html     the whole generator: markup, styles, and rendering code
wallpaper.sh   headless render + set-wallpaper script (run hourly by launchd)
samples/       reference photos the presets were sampled from
README.md      this file
```
