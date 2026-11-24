# Data contract — `site/data/*.json`

This file is the fixed interface between the build pipeline (`build/`) and the
frontend (`site/`). Neither side may change it unilaterally.

All coordinates are `[lon, lat]`, WGS84, rounded to 6 decimal places.
All identifiers are lowercase-kebab ASCII. All JSON is UTF-8, minified.

---

## `streets.json`

A single object. `families` is the primary unit of the UI (one card / one colour
per family). A family has one or more real streets (`segments`) — e.g. the Pine
family covers both `PINE ST` and `PINE CRESCENT`.

```jsonc
{
  "generated": "2026-08-04",
  "city": {
    "tree_count": 185845,          // all public trees in Vancouver
    "families_tree_count": 11234,  // sum of trees on all named streets
    "species_count": 1311,         // distinct common_name values, citywide (new; older readers may ignore)
    "top_species": [               // 5 most common species citywide, by count (new; older readers may ignore)
      { "common_name": "Kwanzan Flowering Cherry", "n": 9874 }
    ]
  },
  "families": [
    {
      "id": "elm",                       // stable slug, used as key everywhere
      "label": "Elm",                     // display name of the family
      "namesake": {
        "taxa_id": "ulmus",              // key into taxa.json; null if none exists
        "match": "genus",                 // "genus" | "species" | "common_name" | "none"
        "confidence": "exact",            // "exact" | "loose" — loose = judgement call
        "note": null                      // e.g. "Heather is a shrub, not a street tree"
      },
      "stats": {
        "n": 236,                        // trees on this family's streets
        "namesake_n": 50,                // of those, namesake trees
        "street_share": 0.2119,          // namesake_n / n
        "city_share": 0.0197,            // citywide share of the same taxa
        "city_namesake_n": 3656,
        "ratio": 10.77,                  // street_share / city_share; null if city_share == 0
        "p_value": 7.12e-36,             // two-sided exact binomial vs city_share
        "significant": true,             // p_value < 0.01 (precomputed for the UI)
        "verdict": "over"                // "over" | "under" | "as-expected" | "absent"
      },
      "species": [                        // descending by n, top 10 only
        { "common_name": "Dutch Elm", "genus": "ULMUS", "species": "X HOLLANDICA",
          "n": 31, "namesake": true }
      ],
      "segments": [
        {
          "id": "elm-st",
          "label": "Elm St",
          "address_key": "ELM ST",       // normalized address form matched in the data
          "n": 240,
          "geometry": {                   // MultiLineString; [] if no centerline found
            "type": "MultiLineString",
            "coordinates": [ [ [-123.1, 49.2], [-123.1, 49.3] ] ]
          }
        }
      ],
      "bbox": [-123.17, 49.21, -123.15, 49.27]  // [w, s, e, n] over trees + centerlines
    }
  ]
}
```

Ordering of `families`: descending by `stats.ratio` with `null` ratios last. The
frontend may re-sort but must not depend on doing so.

`verdict` semantics: `absent` when `namesake_n == 0`; `over` / `under` when
`p_value < 0.05` and ratio is above / below 1; otherwise `as-expected`.

Note the two tiers. `verdict` calls the *direction* at p < 0.05, while
`significant` is the stricter p < 0.01 flag. A family can therefore be `over`
with `significant: false` — Birch is 5.8× but on only 35 trees (p = 0.047), and
Dogwood 4.5× on 56 (p = 0.012). The UI should show the direction but visibly
hedge the strength when `significant` is false, rather than presenting those
ratios with the same confidence as Elm's 10.8× on 236 trees (p = 7.1e-36).

`absent` is likewise not all one thing: Cedar Crescent has zero cedars among 145
trees against a 4.4% citywide rate (p = 0.003, `significant: true`) — a real,
measurable absence. Alder St's zero on 18 trees is just a small sample.

A tree is assigned to a family's street only if its civic address matches the
street name *and* the tree sits within 80 m of that street's centerline. The
address-only match alone is not enough: several parks carry a civic address on
a tree-named street — e.g. VanDusen Botanical Garden's address is 5251 Oak
St — and without the distance check their entire tree inventories would be
counted as street trees.

---

## `trees.json`

Column-oriented to keep the payload small. Every array has the same length `N`;
index `i` is one tree. Only trees on named streets are included.

```jsonc
{
  "fields": ["lon","lat","family","segment","common","genus","species","height_m","dbh_cm","namesake"],
  "n": 11234,
  "common_names": ["Red Maple", "Dutch Elm", "..."],   // dictionary
  "genera": ["ACER", "ULMUS", "..."],                  // dictionary
  "species_epithets": ["RUBRUM", "X HOLLANDICA", "..."],// dictionary
  "family_ids": ["elm", "oak", "..."],                 // dictionary, matches streets.json ids
  "segment_ids": ["elm-st", "oak-st", "..."],          // dictionary
  "columns": {
    "lon":       [-123.123456, ...],   // number
    "lat":       [49.123456, ...],     // number
    "family":    [0, ...],             // index into family_ids
    "segment":   [0, ...],             // index into segment_ids
    "common":    [1, ...],             // index into common_names
    "genus":     [1, ...],             // index into genera
    "species":   [1, ...],             // index into species_epithets
    "height_m":  [10.7, ...],          // number | null
    "dbh_cm":    [22.9, ...],          // number | null
    "namesake":  [1, ...]              // 1 = is its street's namesake, 0 = not
  }
}
```

The frontend builds a GeoJSON FeatureCollection from this at load time.

---

## `taxa.json`

Keyed by `taxa_id` (the value referenced from `streets.json`).

```jsonc
{
  "ulmus": {
    "id": "ulmus",
    "label": "Elm",
    "scientific_name": "Ulmus",
    "rank": "genus",                    // "genus" | "species"
    "wikipedia": {
      "title": "Elm",
      "url": "https://en.wikipedia.org/wiki/Elm",
      "extract": "Elms are deciduous and semi-deciduous trees ...",  // 1-3 sentences
      "image": "https://upload.wikimedia.org/.../Ulmus.jpg",         // null if none
      "image_thumb": "https://upload.wikimedia.org/.../320px-Ulmus.jpg",
      "image_credit": "Wikimedia Commons"
    },
    "spotting": [                        // 2-4 short, concrete field marks
      "Leaves are asymmetric at the base — one side of the leaf meets the stem lower than the other.",
      "Bark is grey-brown with deep, interlacing ridges like braided rope.",
      "Branches arch out and up into a broad vase or fan silhouette."
    ]
  }
}
```

`wikipedia` may be `null` if no article resolved; `spotting` may be `[]`. The
frontend must render gracefully in both cases.
