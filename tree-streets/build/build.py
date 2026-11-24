#!/usr/bin/env python3
"""
Build pipeline for the Vancouver tree-named-streets site.

Run from the repo root:

    python3 build/build.py

Reads public-trees.geojson (185,845 public trees) plus Vancouver's public
street centerline open data, and writes:

    site/data/streets.json   -- families, stats, segment geometry
    site/data/trees.json     -- column-oriented per-tree data for named streets
    site/data/taxa.json      -- via fetch_wiki.py (Wikipedia summaries + spotting)

stdlib only. Network is used only to fetch (and cache) the street centerline
export and Wikipedia summaries; both are safe to rerun offline once cached.
"""

import datetime
import json
import math
import re
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent
REPO_ROOT = BUILD_DIR.parent
sys.path.insert(0, str(BUILD_DIR))
import streets  # noqa: E402
import fetch_wiki  # noqa: E402

TREES_GEOJSON_PATH = REPO_ROOT / "public-trees.geojson"
CACHE_DIR = BUILD_DIR / "cache"
CENTERLINE_CACHE_PATH = CACHE_DIR / "public-streets.geojson"
OUT_STREETS_PATH = REPO_ROOT / "site" / "data" / "streets.json"
OUT_TREES_PATH = REPO_ROOT / "site" / "data" / "trees.json"

CATALOG_SEARCH_URL = (
    "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets"
    "?where=search(title%2C%22street%22)&limit=20"
)
EXPORT_URL_TMPL = (
    "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/{}/exports/geojson?limit=-1"
)
KNOWN_CENTERLINE_DATASET_ID = "public-streets"  # verified against the catalog; see fallback below

USER_AGENT = "tree-streets-build/1.0 (educational static-site build script) python-urllib"

P_SIG_THRESHOLD = 0.01
P_DIR_THRESHOLD = 0.05

# Parks carry civic street addresses even though they aren't the street --
# e.g. VanDusen Botanical Garden's address is 5251 Oak St, so without a
# distance check its 1,845 trees all get counted as Oak St trees (70% of
# Oak's total). Require each address-matched tree to also be within this
# many metres of its street's centerline. 80m is the cap at which every
# street with no park on it keeps 100% of its address-matched trees (Maple
# 432/432, Cedar 145/145, Dogwood 56/56, Vine 242/242, Spruce 86/86), so
# nothing legitimate is lost while park interiors (which sit well over
# 100m from the centerline) are excluded.
MAX_STREET_DIST_M = 80.0


# ---------------------------------------------------------------------------
# Small numeric helpers
# ---------------------------------------------------------------------------

def round6(x):
    return None if x is None else round(x, 6)


def round4(x):
    return None if x is None else round(x, 4)


def round2(x):
    return None if x is None else round(x, 2)


def sigfig(x, n=3):
    """Round x to n significant figures. Handles the very small p-values this
    pipeline produces (e.g. 1e-31), where naive round(x, k) collapses to 0."""
    if x is None:
        return None
    if x == 0:
        return 0.0
    d = n - int(math.floor(math.log10(abs(x)))) - 1
    return round(x, d)


# ---------------------------------------------------------------------------
# Exact two-sided binomial test
# ---------------------------------------------------------------------------
# p_value for observing `k` namesake trees out of `n` street trees, given the
# citywide share `p` of that taxa, using the standard "sum of probabilities
# <= observed probability" definition of a two-sided exact binomial test
# (same definition R's binom.test and scipy's binomtest use).
#
# Computed entirely in log-space via math.lgamma so it never underflows,
# regardless of n. For large n where a full O(n) exact sum would be wasteful,
# fall back to a normal approximation with continuity correction once both
# n*p and n*(1-p) comfortably exceed the usual >=30 rule of thumb -- this
# never actually triggers for this dataset (max family n is ~2,600) but is
# included, and documented here, per spec.

_NORMAL_APPROX_N_THRESHOLD = 50_000
_NORMAL_APPROX_NP_THRESHOLD = 30


def _log_binom_pmf(k, n, p):
    if p <= 0.0:
        return 0.0 if k == 0 else float("-inf")
    if p >= 1.0:
        return 0.0 if k == n else float("-inf")
    log_c = math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)
    return log_c + k * math.log(p) + (n - k) * math.log(1.0 - p)


def _normal_approx_two_sided_pvalue(k, n, p):
    mu = n * p
    sigma = math.sqrt(n * p * (1.0 - p))
    if sigma == 0:
        return 1.0 if k == mu else 0.0
    z = (abs(k - mu) - 0.5) / sigma  # continuity correction
    z = max(z, 0.0)
    tail = 0.5 * math.erfc(z / math.sqrt(2.0))  # upper tail P(Z >= z)
    return min(1.0, 2.0 * tail)


def exact_binom_two_sided_pvalue(k, n, p):
    if n == 0:
        return 1.0
    if p <= 0.0:
        return 1.0 if k == 0 else 0.0
    if p >= 1.0:
        return 1.0 if k == n else 0.0

    if n > _NORMAL_APPROX_N_THRESHOLD and n * p > _NORMAL_APPROX_NP_THRESHOLD and n * (1 - p) > _NORMAL_APPROX_NP_THRESHOLD:
        return _normal_approx_two_sided_pvalue(k, n, p)

    log_pmfs = [_log_binom_pmf(i, n, p) for i in range(n + 1)]
    observed = log_pmfs[k]
    # small multiplicative tolerance so the observed bucket (and any bucket
    # numerically equal to it) is always included
    threshold = observed + math.log1p(1e-7)
    selected = [lp for lp in log_pmfs if lp <= threshold]
    m = max(selected)
    total = sum(math.exp(lp - m) for lp in selected)
    log_p_value = m + math.log(total)
    return min(1.0, math.exp(log_p_value))


# ---------------------------------------------------------------------------
# Street centerline data
# ---------------------------------------------------------------------------

_HBLOCK_RE = re.compile(r"^\d+(?:-\d+)?\s+(.+)$")


def normalize_hblock_street(hblock):
    if not hblock:
        return None
    m = _HBLOCK_RE.match(hblock.strip())
    if not m:
        return None
    return m.group(1).upper().strip()


def _download_json(url, timeout=90):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _discover_centerline_dataset_id():
    print("  [centerline] querying opendatasoft catalog for a street dataset...")
    try:
        catalog = _download_json(CATALOG_SEARCH_URL)
    except Exception as e:
        print(f"  [centerline] catalog query failed: {e}")
        return None
    for result in catalog.get("results", []):
        title = (result.get("metas", {}).get("default", {}).get("title") or "").lower()
        dsid = result.get("dataset_id")
        if dsid and ("centreline" in dsid or "centerline" in dsid or dsid == "public-streets"):
            print(f"  [centerline] catalog candidate: {dsid} ({title})")
            return dsid
    # fall back to the first result whose title literally contains "street"
    for result in catalog.get("results", []):
        dsid = result.get("dataset_id")
        if dsid:
            print(f"  [centerline] falling back to first catalog result: {dsid}")
            return dsid
    return None


def load_centerline_geojson():
    """Load Vancouver's public street centerline GeoJSON, from cache if present,
    else download and cache it. Returns None (and prints loudly) on failure --
    callers must handle that by emitting empty geometry, not crashing.
    """
    if CENTERLINE_CACHE_PATH.exists():
        print(f"  [centerline] using cached {CENTERLINE_CACHE_PATH}")
        try:
            return json.loads(CENTERLINE_CACHE_PATH.read_text())
        except Exception as e:
            print(f"  [centerline] cache file unreadable ({e}), re-downloading")

    dataset_id = KNOWN_CENTERLINE_DATASET_ID
    url = EXPORT_URL_TMPL.format(dataset_id)
    try:
        print(f"  [centerline] downloading {dataset_id} export...")
        data = _download_json(url)
    except Exception as e:
        print(f"  [centerline] known dataset id '{dataset_id}' failed ({e}); trying catalog discovery")
        dataset_id = _discover_centerline_dataset_id()
        if not dataset_id:
            print("  [centerline] *** COULD NOT DISCOVER A CENTERLINE DATASET -- all segment geometry will be empty ***")
            return None
        url = EXPORT_URL_TMPL.format(dataset_id)
        try:
            data = _download_json(url)
        except Exception as e2:
            print(f"  [centerline] *** DOWNLOAD FAILED ({e2}) -- all segment geometry will be empty ***")
            return None

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    CENTERLINE_CACHE_PATH.write_text(json.dumps(data))
    print(f"  [centerline] cached to {CENTERLINE_CACHE_PATH}")
    return data


def build_centerline_index(centerline_geojson):
    """address_key (normalized street name) -> list of line coordinate lists."""
    index = defaultdict(list)
    if not centerline_geojson:
        return index
    for feat in centerline_geojson.get("features", []):
        props = feat.get("properties", {})
        name = normalize_hblock_street(props.get("hblock"))
        if not name:
            continue
        geom = feat.get("geometry") or {}
        gtype = geom.get("type")
        coords = geom.get("coordinates")
        if not coords:
            continue
        if gtype == "LineString":
            index[name].append(coords)
        elif gtype == "MultiLineString":
            index[name].extend(coords)
    return index


def _pt_seg_dist_m(lon, lat, a, b):
    """Distance in metres from (lon, lat) to segment a-b, via an
    equirectangular approximation (fine at city scale)."""
    kx = 111320 * math.cos(math.radians(lat))
    ky = 110574
    ax, ay = (a[0] - lon) * kx, (a[1] - lat) * ky
    bx, by = (b[0] - lon) * kx, (b[1] - lat) * ky
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(ax, ay)
    t = max(0.0, min(1.0, -(ax * dx + ay * dy) / (dx * dx + dy * dy)))
    return math.hypot(ax + t * dx, ay + t * dy)


def dist_to_street_m(lon, lat, lines):
    """Minimum distance in metres from (lon, lat) to any segment of any line
    in `lines` (a list of [lon, lat] coordinate lists)."""
    best = float("inf")
    for line in lines:
        for i in range(len(line) - 1):
            d = _pt_seg_dist_m(lon, lat, line[i], line[i + 1])
            if d < best:
                best = d
    return best


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def main():
    print("=" * 78)
    print("tree-streets build")
    print("=" * 78)

    # -- reverse index: normalized address_key -> (family, segment) ---------
    key_to_target = {}
    for family in streets.FAMILIES:
        for segment in family["segments"]:
            key_to_target[segment["address_key"]] = (family["id"], segment["id"])

    # -- pass 1: load all public trees, bucket the ones on named streets ----
    print(f"\nLoading {TREES_GEOJSON_PATH.name}...")
    with open(TREES_GEOJSON_PATH, "r", encoding="utf-8") as f:
        city_data = json.load(f)
    city_features = city_data["features"]
    city_tree_count = len(city_features)
    print(f"  {city_tree_count:,} public trees citywide")

    family_by_id = {f["id"]: f for f in streets.FAMILIES}
    genus_to_genus_families = defaultdict(list)
    for family in streets.FAMILIES:
        ns = family["namesake"]
        if ns["match"] == "genus":
            for g in ns["genera"]:
                genus_to_genus_families[g].append(family["id"])

    # -- centerline geometry (loaded before the tree loop so the distance
    #    filter below can use it during bucketing) --------------------------
    print("\nLoading street centerlines...")
    centerline_geojson = load_centerline_geojson()
    centerline_index = build_centerline_index(centerline_geojson)

    missing_centerlines = []

    city_namesake_n = Counter()          # family_id -> citywide namesake count
    street_trees = defaultdict(list)     # (family_id, segment_id) -> [tree dict]
    excluded_by_key = Counter()          # address_key -> trees excluded by distance filter
    city_species_counter = Counter()     # common_name -> citywide count, for the citycard

    for feat in city_features:
        props = feat["properties"]
        genus_tok = streets.genus_token(props.get("genus_name"))

        # citywide species tally, for the "city's trees" context card --
        # every tree in the city, not just trees on named streets.
        common_name = props.get("common_name")
        if common_name:
            city_species_counter[common_name] += 1

        # citywide namesake tally (used for city_share) -- every tree in the
        # city is checked here, not just trees on named streets, and is NOT
        # subject to the distance filter below.
        for fid in genus_to_genus_families.get(genus_tok, ()):
            city_namesake_n[fid] += 1
        # common-name-matched families (cherry, laurel) aren't genus-indexable
        for family in streets.FAMILIES:
            if family["namesake"]["match"] == "common_name":
                if streets.is_namesake(props, family["namesake"]):
                    city_namesake_n[family["id"]] += 1

        key = streets.normalize_address(props.get("address"))
        target = key_to_target.get(key)
        if not target:
            continue
        family_id, segment_id = target
        lon, lat = feat["geometry"]["coordinates"]

        # Distance filter: some addresses belong to parks (e.g. VanDusen
        # Botanical Garden = 5251 Oak St), whose entire tree inventory would
        # otherwise be counted as street trees. Require the tree to be
        # within MAX_STREET_DIST_M of the matched street's centerline. Fail
        # open (keep the tree) if we have no centerline geometry to check
        # against.
        lines = centerline_index.get(key)
        if lines:
            d = dist_to_street_m(lon, lat, lines)
            if d > MAX_STREET_DIST_M:
                excluded_by_key[key] += 1
                continue

        street_trees[(family_id, segment_id)].append({
            "lon": lon, "lat": lat,
            "common_name": props.get("common_name") or "",
            "genus_name": props.get("genus_name") or "",
            "species_name": props.get("species_name") or "",
            "height_m": props.get("height_m"),
            "diameter_cm": props.get("diameter_cm"),
            "namesake": streets.is_namesake(props, family_by_id[family_id]["namesake"]),
        })

    # -- assemble per-family output -------------------------------------------
    print("\nComputing stats per family...")
    families_out = []
    summary_rows = []

    for family in streets.FAMILIES:
        fid = family["id"]
        ns = family["namesake"]

        all_family_trees = []
        segments_out = []
        for segment in family["segments"]:
            sid = segment["id"]
            trees_here = street_trees.get((fid, sid), [])
            all_family_trees.extend(trees_here)

            lines = centerline_index.get(segment["address_key"], [])
            if not lines:
                missing_centerlines.append((fid, segment["address_key"]))
            coords = [[[round6(pt[0]), round6(pt[1])] for pt in line] for line in lines]

            segments_out.append({
                "id": sid,
                "label": segment["label"],
                "address_key": segment["address_key"],
                "n": len(trees_here),
                "geometry": {"type": "MultiLineString", "coordinates": coords},
            })

        n = len(all_family_trees)
        namesake_n = sum(1 for t in all_family_trees if t["namesake"])
        street_share = (namesake_n / n) if n else 0.0
        c_namesake_n = city_namesake_n.get(fid, 0)
        city_share = (c_namesake_n / city_tree_count) if city_tree_count else 0.0
        ratio = (street_share / city_share) if city_share > 0 else None

        p_value = exact_binom_two_sided_pvalue(namesake_n, n, city_share) if n else 1.0
        # Two tiers: direction is called at p<0.05, but `significant` stays the
        # strict p<0.01 gate so the UI can hedge on small-n streets. Without this
        # split, Birch (5.8x, n=35) and Dogwood (4.5x, n=56) get labelled
        # "as-expected", which reads as flatly wrong next to the ratio.
        significant = p_value < P_SIG_THRESHOLD
        directional = p_value < P_DIR_THRESHOLD
        if namesake_n == 0:
            verdict = "absent"
        elif directional and ratio is not None and ratio > 1:
            verdict = "over"
        elif directional and ratio is not None and ratio < 1:
            verdict = "under"
        else:
            verdict = "as-expected"

        # top-10 species breakdown
        species_counter = Counter()
        species_namesake = {}
        for t in all_family_trees:
            key = (t["common_name"], t["genus_name"], t["species_name"])
            species_counter[key] += 1
            species_namesake[key] = t["namesake"]
        species_top = species_counter.most_common(10)
        species_out = [
            {
                "common_name": _titlecase_common_name(cn),
                "genus": gn,
                "species": sn,
                "n": cnt,
                "namesake": species_namesake[(cn, gn, sn)],
            }
            for (cn, gn, sn), cnt in species_top
        ]

        # bbox over trees + centerline geometry
        lons = [t["lon"] for t in all_family_trees]
        lats = [t["lat"] for t in all_family_trees]
        for seg in segments_out:
            for line in seg["geometry"]["coordinates"]:
                for pt in line:
                    lons.append(pt[0])
                    lats.append(pt[1])
        if lons:
            bbox = [round6(min(lons)), round6(min(lats)), round6(max(lons)), round6(max(lats))]
        else:
            bbox = None

        families_out.append({
            "id": fid,
            "label": family["label"],
            "namesake": {
                "taxa_id": ns["taxa_id"],
                "match": ns["match"],
                "confidence": ns["confidence"],
                "note": ns["note"],
            },
            "stats": {
                "n": n,
                "namesake_n": namesake_n,
                "street_share": round4(street_share),
                "city_share": round4(city_share),
                "city_namesake_n": c_namesake_n,
                "ratio": round2(ratio),
                "p_value": sigfig(p_value, 3),
                "significant": significant,
                "verdict": verdict,
            },
            "species": species_out,
            "segments": segments_out,
            "bbox": bbox,
            "_sort_ratio": ratio,  # stripped before writing
        })

        summary_rows.append({
            "label": family["label"], "n": n, "namesake_n": namesake_n,
            "street_share": street_share, "city_share": city_share,
            "ratio": ratio, "p_value": p_value, "significant": significant,
            "verdict": verdict,
        })

    # sort by stats.ratio descending, null ratios last
    families_out.sort(key=lambda f: (f["_sort_ratio"] is None, -(f["_sort_ratio"] or 0)))
    for f in families_out:
        del f["_sort_ratio"]

    families_tree_count = sum(f["stats"]["n"] for f in families_out)

    species_count = len(city_species_counter)
    top_species = [
        {"common_name": _titlecase_common_name(name), "n": cnt}
        for name, cnt in city_species_counter.most_common(5)
    ]

    streets_json = {
        "generated": datetime.date.today().isoformat(),
        "city": {
            "tree_count": city_tree_count,
            "families_tree_count": families_tree_count,
            "species_count": species_count,
            "top_species": top_species,
        },
        "families": families_out,
    }

    OUT_STREETS_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_STREETS_PATH.write_text(json.dumps(streets_json, separators=(",", ":"), ensure_ascii=False))

    # -- trees.json: column-oriented ------------------------------------------
    print("\nBuilding trees.json...")
    common_names, common_idx = [], {}
    genera, genera_idx = [], {}
    species_epithets, species_idx = [], {}
    family_ids = [f["id"] for f in streets.FAMILIES]
    family_idx = {fid: i for i, fid in enumerate(family_ids)}
    segment_ids = []
    segment_idx = {}
    for family in streets.FAMILIES:
        for segment in family["segments"]:
            segment_idx[segment["id"]] = len(segment_ids)
            segment_ids.append(segment["id"])

    def _idx(value, lst, idx_map):
        if value not in idx_map:
            idx_map[value] = len(lst)
            lst.append(value)
        return idx_map[value]

    col_lon, col_lat = [], []
    col_family, col_segment = [], []
    col_common, col_genus, col_species = [], [], []
    col_height, col_dbh = [], []
    col_namesake = []

    for family in streets.FAMILIES:
        fid = family["id"]
        for segment in family["segments"]:
            sid = segment["id"]
            for t in street_trees.get((fid, sid), []):
                col_lon.append(round6(t["lon"]))
                col_lat.append(round6(t["lat"]))
                col_family.append(family_idx[fid])
                col_segment.append(segment_idx[sid])
                col_common.append(_idx(_titlecase_common_name(t["common_name"]), common_names, common_idx))
                col_genus.append(_idx(t["genus_name"], genera, genera_idx))
                col_species.append(_idx(t["species_name"], species_epithets, species_idx))
                col_height.append(t["height_m"])
                col_dbh.append(t["diameter_cm"])
                col_namesake.append(1 if t["namesake"] else 0)

    trees_json = {
        "fields": ["lon", "lat", "family", "segment", "common", "genus", "species", "height_m", "dbh_cm", "namesake"],
        "n": len(col_lon),
        "common_names": common_names,
        "genera": genera,
        "species_epithets": species_epithets,
        "family_ids": family_ids,
        "segment_ids": segment_ids,
        "columns": {
            "lon": col_lon, "lat": col_lat,
            "family": col_family, "segment": col_segment,
            "common": col_common, "genus": col_genus, "species": col_species,
            "height_m": col_height, "dbh_cm": col_dbh,
            "namesake": col_namesake,
        },
    }
    OUT_TREES_PATH.write_text(json.dumps(trees_json, separators=(",", ":"), ensure_ascii=False))

    # -- taxa.json via fetch_wiki ----------------------------------------------
    print()
    fetch_wiki.run()

    # -- summary report ---------------------------------------------------------
    print_summary(summary_rows, missing_centerlines, excluded_by_key, city_tree_count, families_tree_count)


def _titlecase_common_name(name):
    """'AMERICAN ELM' -> 'American Elm'. Keeps small connector words lowercase
    except at the start, and preserves things like possessive apostrophes."""
    if not name:
        return name
    small = {"of", "the", "or", "and", "a", "an"}
    words = name.strip().split(" ")
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        if i > 0 and lw in small:
            out.append(lw)
        else:
            # capitalize first alpha char, keep rest as-is lowercased except
            # letters immediately after ' or - (e.g. Queen'S -> Queen's not desired,
            # so just do a simple capitalize-first-letter approach per word)
            out.append(lw[:1].upper() + lw[1:] if lw else lw)
    return " ".join(out)


def print_summary(rows, missing_centerlines, excluded_by_key, city_tree_count, families_tree_count):
    print("\n" + "=" * 100)
    print("SUMMARY")
    print("=" * 100)
    print(f"{'Family':<10} {'n':>6} {'namesake_n':>10} {'street%':>8} {'city%':>7} {'ratio':>8} {'p_value':>12} {'sig':>4} {'verdict':>12}")
    print("-" * 100)
    for r in sorted(rows, key=lambda r: (r["ratio"] is None, -(r["ratio"] or 0))):
        ratio_s = f"{r['ratio']:.2f}" if r["ratio"] is not None else "n/a"
        print(f"{r['label']:<10} {r['n']:>6} {r['namesake_n']:>10} "
              f"{r['street_share']*100:>7.2f}% {r['city_share']*100:>6.2f}% {ratio_s:>8} "
              f"{sigfig(r['p_value'],3):>12} {'Y' if r['significant'] else 'N':>4} {r['verdict']:>12}")

    print(f"\ncity.tree_count = {city_tree_count:,}   city.families_tree_count = {families_tree_count:,}")

    # -- sanity checks from the spec --------------------------------------------
    print("\nSANITY CHECKS")
    by_label = {r["label"]: r for r in rows}

    def check(label, cond, detail):
        status = "PASS" if cond else "FAIL"
        print(f"  [{status}] {label}: {detail}")

    elm = by_label["Elm"]
    check("Elm ratio ~= 10.6", elm["ratio"] is not None and 9.5 <= elm["ratio"] <= 11.7,
          f"ratio={elm['ratio']:.2f} (namesake_n={elm['namesake_n']}, n={elm['n']})")

    willow = by_label["Willow"]
    check("Willow absent (namesake_n=0)", willow["namesake_n"] == 0 and willow["verdict"] == "absent",
          f"namesake_n={willow['namesake_n']}, verdict={willow['verdict']}")

    oak = by_label["Oak"]
    # Pre-distance-filter, Oak's n included VanDusen Botanical Garden's 5251
    # Oak St address (1,845 trees, ~70% of the old n=2624) and inflated the
    # ratio down toward the citywide rate. Post-filter: n~=704, ratio~=2.9x.
    check("Oak n~=704 (approx), ratio ~= 2.9", abs(oak["n"] - 704) <= 30 and oak["ratio"] is not None and 2.3 <= oak["ratio"] <= 3.5,
          f"n={oak['n']}, ratio={oak['ratio']:.2f}")

    birch = by_label["Birch"]
    check("Birch ratio ~= 5.8x", birch["ratio"] is not None and 4.5 <= birch["ratio"] <= 7.1,
          f"ratio={birch['ratio']:.2f}")

    dogwood = by_label["Dogwood"]
    check("Dogwood ratio ~= 4.5x", dogwood["ratio"] is not None and 3.5 <= dogwood["ratio"] <= 5.5,
          f"ratio={dogwood['ratio']:.2f}")

    magnolia = by_label["Magnolia"]
    # Pre-distance-filter, Magnolia's n included Quilchena Park's 4590
    # Magnolia St address and diluted the ratio toward 2.3x. Post-filter:
    # ratio ~= 4.0x.
    check("Magnolia ratio ~= 4.0x", magnolia["ratio"] is not None and 3.2 <= magnolia["ratio"] <= 4.8,
          f"ratio={magnolia['ratio']:.2f}")

    ash = by_label["Ash"]
    check("Ash ratio ~= 1.8x", ash["ratio"] is not None and 1.4 <= ash["ratio"] <= 2.2,
          f"ratio={ash['ratio']:.2f}")

    maple = by_label["Maple"]
    check("Maple ratio ~= 1.6x", maple["ratio"] is not None and 1.2 <= maple["ratio"] <= 2.0,
          f"ratio={maple['ratio']:.2f}")

    near_zero_labels = ["Pine", "Cedar", "Fir", "Larch", "Spruce", "Alder", "Arbutus", "Walnut", "Hemlock"]
    for label in near_zero_labels:
        r = by_label[label]
        check(f"{label} ~0 namesakes", r["namesake_n"] <= 3,
              f"namesake_n={r['namesake_n']} of n={r['n']}")

    # -- distance filter report --------------------------------------------------
    print(f"\nDISTANCE FILTER (excluded trees >{MAX_STREET_DIST_M:.0f}m from their street's centerline,")
    print("  e.g. park trees at a civic address matching that street)")
    if excluded_by_key:
        total_excluded = sum(excluded_by_key.values())
        print(f"  {total_excluded:,} tree(s) excluded across {len(excluded_by_key)} address_key(s):")
        for key, cnt in excluded_by_key.most_common():
            print(f"    - {key}: {cnt:,} excluded")
    else:
        print("  No trees excluded.")

    # -- centerline coverage -----------------------------------------------------
    print("\nCENTERLINE COVERAGE")
    if missing_centerlines:
        print(f"  {len(missing_centerlines)} segment(s) with NO centerline match (empty geometry emitted):")
        for fid, key in missing_centerlines:
            print(f"    - {fid}: {key}")
    else:
        print("  All segments matched a centerline.")

    # -- output file sizes --------------------------------------------------------
    print("\nOUTPUT FILES")
    for p in [OUT_STREETS_PATH, OUT_TREES_PATH, REPO_ROOT / "site" / "data" / "taxa.json"]:
        if p.exists():
            size = p.stat().st_size
            print(f"  {p.relative_to(REPO_ROOT)}: {size:,} bytes ({size/1024/1024:.2f} MB)")
        else:
            print(f"  {p.relative_to(REPO_ROOT)}: MISSING")


if __name__ == "__main__":
    main()
