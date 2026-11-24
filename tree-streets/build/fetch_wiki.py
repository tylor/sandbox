"""
Fetches Wikipedia summaries for each namesake taxa and writes site/data/taxa.json.

Run standalone:   python3 build/fetch_wiki.py
Or import:        from fetch_wiki import run; taxa = run()

All HTTP responses (the Wikipedia REST summary, and the HEAD-check result for
each image URL) are cached under build/cache/wiki/ so reruns are offline-safe
once the cache is warm. Only stdlib is used (urllib.request, json).
"""

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent
REPO_ROOT = BUILD_DIR.parent
CACHE_DIR = BUILD_DIR / "cache" / "wiki"
OUT_PATH = REPO_ROOT / "site" / "data" / "taxa.json"

USER_AGENT = (
    "tree-streets-build/1.0 "
    "(https://github.com/tylor/tree-streets; educational static-site build script) "
    "python-urllib"
)

WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{}"
REQUEST_DELAY_S = 0.4  # be polite: one request at a time, small delay
MAX_EXTRACT_SENTENCES = 3
MAX_EXTRACT_CHARS = 420


def _http_get_json(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _http_head_ok(url, timeout=10):
    """True if `url` resolves with an HTTP 2xx to a HEAD request."""
    if not url:
        return False
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT}, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False


def _trim_extract(text):
    if not text:
        return text
    text = text.strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    trimmed = " ".join(sentences[:MAX_EXTRACT_SENTENCES]).strip()
    if len(trimmed) > MAX_EXTRACT_CHARS:
        trimmed = trimmed[:MAX_EXTRACT_CHARS].rsplit(" ", 1)[0].rstrip(",.;") + "..."
    return trimmed


def _cache_path(taxa_id):
    return CACHE_DIR / f"{taxa_id}.json"


def _fetch_one(taxa_id, wiki_query, force=False):
    """Return the raw cached-or-fetched payload dict for one taxa_id:
    {"summary": <wikipedia REST response or None>,
     "image_ok": bool, "image_thumb_ok": bool}
    """
    cache_path = _cache_path(taxa_id)
    if cache_path.exists() and not force:
        return json.loads(cache_path.read_text())

    encoded = urllib.parse.quote(wiki_query.replace(" ", "_"))
    url = WIKI_SUMMARY_URL.format(encoded)
    summary = None
    try:
        summary = _http_get_json(url)
        print(f"  [wiki] {taxa_id}: fetched '{wiki_query}' -> '{summary.get('title')}'")
    except urllib.error.HTTPError as e:
        print(f"  [wiki] {taxa_id}: HTTP {e.code} fetching '{wiki_query}' -- skipping wikipedia block")
    except Exception as e:
        print(f"  [wiki] {taxa_id}: error fetching '{wiki_query}': {e} -- skipping wikipedia block")
    time.sleep(REQUEST_DELAY_S)

    image_ok = False
    image_thumb_ok = False
    if summary:
        image_url = (summary.get("originalimage") or {}).get("source")
        thumb_url = (summary.get("thumbnail") or {}).get("source")
        image_ok = _http_head_ok(image_url)
        time.sleep(REQUEST_DELAY_S)
        # thumbnail is served off the same file, but verify independently --
        # cheap insurance against a broken thumb URL when the original is fine.
        image_thumb_ok = _http_head_ok(thumb_url) if thumb_url else False
        time.sleep(REQUEST_DELAY_S)

    payload = {"summary": summary, "image_ok": image_ok, "image_thumb_ok": image_thumb_ok}
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(payload))
    return payload


def _build_taxa_entry(taxa_id, meta, spotting, force=False):
    payload = _fetch_one(taxa_id, meta["wiki_query"], force=force)
    summary = payload["summary"]

    wikipedia = None
    if summary:
        image_url = (summary.get("originalimage") or {}).get("source")
        thumb_url = (summary.get("thumbnail") or {}).get("source")
        image_url = image_url if payload["image_ok"] else None
        thumb_url = thumb_url if payload["image_thumb_ok"] else None
        page_url = (
            (summary.get("content_urls") or {}).get("desktop", {}).get("page")
            or f"https://en.wikipedia.org/wiki/{urllib.parse.quote(summary.get('title', meta['wiki_query']).replace(' ', '_'))}"
        )
        wikipedia = {
            "title": summary.get("title", meta["wiki_query"]),
            "url": page_url,
            "extract": _trim_extract(summary.get("extract", "")),
            "image": image_url,
            "image_thumb": thumb_url,
            "image_credit": "Wikimedia Commons" if image_url else None,
        }

    return {
        "id": taxa_id,
        "label": meta["label"],
        "scientific_name": meta["scientific_name"],
        "rank": meta["rank"],
        "wikipedia": wikipedia,
        "spotting": spotting.get(taxa_id, []),
    }


def run(force=False, out_path=OUT_PATH):
    """Fetch (or load from cache) every taxa's Wikipedia summary + curated
    spotting marks, write site/data/taxa.json, and return the dict written.
    """
    # Imported lazily so this file works when run as a script (no package
    # context) as well as when imported by build.py.
    sys.path.insert(0, str(BUILD_DIR))
    import streets  # noqa: E402

    print(f"Fetching Wikipedia summaries for {len(streets.TAXA)} taxa...")
    taxa_out = {}
    for taxa_id, meta in sorted(streets.TAXA.items()):
        taxa_out[taxa_id] = _build_taxa_entry(taxa_id, meta, streets.SPOTTING, force=force)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(taxa_out, separators=(",", ":"), ensure_ascii=False))

    n_with_wiki = sum(1 for t in taxa_out.values() if t["wikipedia"])
    n_with_image = sum(1 for t in taxa_out.values() if t["wikipedia"] and t["wikipedia"]["image"])
    print(f"Wrote {out_path} -- {len(taxa_out)} taxa, {n_with_wiki} with wikipedia data, {n_with_image} with a verified image.")
    return taxa_out


if __name__ == "__main__":
    force = "--force" in sys.argv
    run(force=force)
