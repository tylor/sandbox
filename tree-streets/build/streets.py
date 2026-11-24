"""
Configuration for the tree-streets build pipeline.

This module holds no logic beyond tiny helpers for defining match sets -- it is
the single place that says which streets belong to which family, which taxa
those families are named after, and (for taxa that get an article) the
hand-written "how to spot it" field marks. build.py and fetch_wiki.py both
import from here; nothing here should read public-trees.geojson or hit the
network.

## Namesake matching

Each family's `namesake` dict describes how to decide whether a given tree
(properties: genus_name, common_name, species_name) counts as that street's
namesake taxa:

  match == "genus":       genus token (first whitespace-separated word of
                           genus_name, uppercased) is in `genera`.
  match == "common_name":  `common_name` (uppercased) contains one of
                           `common_contains`; if `common_genus_restrict` is
                           set, genus token must also be in that set.
  match == "none":         never matches (no real namesake taxa exists, or
                           none is present in the data).

`taxa_id` is the key into taxa.json (or None). Multiple families may point at
the same taxa_id when they are genuinely about the same plant (Balsam and Fir
both ultimately mean Abies) -- fetch_wiki.py only fetches each taxa_id once.
"""

import re

# ---------------------------------------------------------------------------
# Address normalization
# ---------------------------------------------------------------------------

_ADDR_RE = re.compile(r"^\d+\s+(.+)$")
_CELL_RE = re.compile(r",?\s*CELL\s*\d+$", re.IGNORECASE)


def normalize_address(address):
    """'1199 W CORDOVA ST' -> 'W CORDOVA ST'; strips trailing 'Cell N' noise."""
    if not address:
        return None
    m = _ADDR_RE.match(address.strip())
    if not m:
        return None
    s = m.group(1).upper().strip()
    s = _CELL_RE.sub("", s).strip()
    return s


def genus_token(genus_name):
    """First whitespace-separated token of genus_name, uppercased.

    Handles the one hybrid-marker oddity in the source data where genus_name
    is stored as e.g. 'CUPRESSOCYPARIS   X' (extra internal spaces, trailing
    'X' hybrid marker) -- .split()[0] collapses the whitespace and drops the
    marker in one step.
    """
    if not genus_name:
        return ""
    parts = genus_name.strip().upper().split()
    return parts[0] if parts else ""


def is_namesake(props, namesake):
    """Does this tree (a public-trees.geojson `properties` dict) count as the
    namesake taxa for a family's `namesake` config?
    """
    match = namesake["match"]
    if match == "none":
        return False
    if match == "genus":
        return genus_token(props.get("genus_name")) in namesake["genera"]
    if match == "common_name":
        common = (props.get("common_name") or "").upper()
        if not any(sub in common for sub in namesake["common_contains"]):
            return False
        restrict = namesake.get("common_genus_restrict")
        if restrict:
            return genus_token(props.get("genus_name")) in restrict
        return True
    if match == "species":
        g = genus_token(props.get("genus_name"))
        s = (props.get("species_name") or "").strip().upper()
        return (g, s) in namesake.get("species_set", set())
    raise ValueError(f"unknown match type: {match!r}")


# ---------------------------------------------------------------------------
# Families
# ---------------------------------------------------------------------------
# Ordering here doesn't matter -- build.py sorts families by stats.ratio for
# the final output, per SCHEMA.md.

FAMILIES = [
    {
        "id": "alder",
        "label": "Alder",
        "segments": [
            {"id": "alder-st", "label": "Alder St", "address_key": "ALDER ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"ALNUS"},
            "confidence": "exact", "note": None, "taxa_id": "alnus",
        },
    },
    {
        "id": "arbutus",
        "label": "Arbutus",
        "segments": [
            {"id": "arbutus-st", "label": "Arbutus St", "address_key": "ARBUTUS ST"},
            {"id": "arbutus-diversion", "label": "Arbutus Diversion", "address_key": "ARBUTUS DIVERSION"},
        ],
        "namesake": {
            "match": "genus", "genera": {"ARBUTUS"},
            "confidence": "exact", "note": None, "taxa_id": "arbutus",
        },
    },
    {
        "id": "ash",
        "label": "Ash",
        "segments": [
            {"id": "ash-st", "label": "Ash St", "address_key": "ASH ST"},
            {"id": "ash-crescent", "label": "Ash Crescent", "address_key": "ASH CRESCENT"},
        ],
        "namesake": {
            "match": "genus", "genera": {"FRAXINUS"},
            "confidence": "exact", "note": None, "taxa_id": "fraxinus",
        },
    },
    {
        "id": "balsam",
        "label": "Balsam",
        "segments": [
            {"id": "balsam-st", "label": "Balsam St", "address_key": "BALSAM ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"ABIES"},
            "confidence": "loose",
            "note": ("Balsam fir is specifically Abies balsamea, a species not "
                      "otherwise planted in Vancouver -- but in BC 'balsam' is "
                      "used colloquially for firs (Abies) generally, so this "
                      "counts the whole genus."),
            "taxa_id": "abies",
        },
    },
    {
        "id": "birch",
        "label": "Birch",
        "segments": [
            {"id": "birch-st", "label": "Birch St", "address_key": "BIRCH ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"BETULA"},
            "confidence": "exact", "note": None, "taxa_id": "betula",
        },
    },
    {
        "id": "cedar",
        "label": "Cedar",
        "segments": [
            {"id": "cedar-crescent", "label": "Cedar Crescent", "address_key": "CEDAR CRESCENT"},
        ],
        "namesake": {
            "match": "genus", "genera": {"THUJA", "CEDRUS", "CHAMAECYPARIS", "CALOCEDRUS"},
            "confidence": "exact",
            "note": ("Covers western redcedar and other Thuja, true cedars "
                      "(Cedrus), false cypresses (Chamaecyparis) and incense "
                      "cedar (Calocedrus) -- what Vancouverites mean by 'cedar' "
                      "is almost always western redcedar (Thuja plicata), not "
                      "a true cedar."),
            "taxa_id": "thuja-plicata",
        },
    },
    {
        "id": "cherry",
        "label": "Cherry",
        "segments": [
            {"id": "cherry-st", "label": "Cherry St", "address_key": "CHERRY ST"},
        ],
        "namesake": {
            "match": "common_name", "common_contains": {"CHERRY"},
            "common_genus_restrict": {"PRUNUS"},
            "confidence": "exact",
            "note": ("Prunus also contains plums, laurels and almonds, so this "
                      "matches on common name (containing 'cherry') within "
                      "genus Prunus rather than the whole genus."),
            "taxa_id": "prunus",
        },
    },
    {
        "id": "chestnut",
        "label": "Chestnut",
        "segments": [
            {"id": "chestnut-st", "label": "Chestnut St", "address_key": "CHESTNUT ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"CASTANEA", "AESCULUS"},
            "confidence": "exact",
            "note": ("Counts true chestnuts (Castanea) and horse chestnuts "
                      "(Aesculus) -- an unrelated genus in the soapberry "
                      "family that is nonetheless almost always what's meant "
                      "by 'chestnut tree' around Vancouver."),
            "taxa_id": "aesculus-hippocastanum",
        },
    },
    {
        "id": "cypress",
        "label": "Cypress",
        "segments": [
            {"id": "cypress-st", "label": "Cypress St", "address_key": "CYPRESS ST"},
            {"id": "cypress-crescent", "label": "Cypress Crescent", "address_key": "CYPRESS CRESCENT"},
        ],
        "namesake": {
            "match": "genus", "genera": {"CUPRESSUS", "CHAMAECYPARIS", "CUPRESSOCYPARIS", "TAXODIUM"},
            "confidence": "exact",
            "note": ("Counts true cypress (Cupressus), false cypress "
                      "(Chamaecyparis), Leyland cypress (x Cupressocyparis) "
                      "and bald cypress (Taxodium)."),
            "taxa_id": "chamaecyparis",
        },
    },
    {
        "id": "dogwood",
        "label": "Dogwood",
        "segments": [
            {"id": "dogwood-av", "label": "Dogwood Ave", "address_key": "DOGWOOD AV"},
        ],
        "namesake": {
            "match": "genus", "genera": {"CORNUS"},
            "confidence": "exact", "note": None, "taxa_id": "cornus",
        },
    },
    {
        "id": "elm",
        "label": "Elm",
        "segments": [
            {"id": "elm-st", "label": "Elm St", "address_key": "ELM ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"ULMUS"},
            "confidence": "exact", "note": None, "taxa_id": "ulmus",
        },
    },
    {
        "id": "fir",
        "label": "Fir",
        "segments": [
            {"id": "fir-st", "label": "Fir St", "address_key": "FIR ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"ABIES", "PSEUDOTSUGA"},
            "confidence": "exact",
            "note": ("Counts true firs (Abies) and Douglas-fir (Pseudotsuga), "
                      "which despite the name is a different genus."),
            "taxa_id": "abies",
        },
    },
    {
        "id": "heather",
        "label": "Heather",
        "segments": [
            {"id": "heather-st", "label": "Heather St", "address_key": "HEATHER ST"},
        ],
        "namesake": {
            "match": "none",
            "confidence": "exact",
            "note": ("Heather (Calluna vulgaris and Erica species) is a low "
                      "shrub, not a tree -- it never appears in the City's "
                      "street tree inventory, so this street has no possible "
                      "namesake tree."),
            "taxa_id": None,
        },
    },
    {
        "id": "hemlock",
        "label": "Hemlock",
        "segments": [
            {"id": "hemlock-st", "label": "Hemlock St", "address_key": "HEMLOCK ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"TSUGA"},
            "confidence": "exact", "note": None, "taxa_id": "tsuga",
        },
    },
    {
        "id": "larch",
        "label": "Larch",
        "segments": [
            {"id": "larch-st", "label": "Larch St", "address_key": "LARCH ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"LARIX"},
            "confidence": "exact", "note": None, "taxa_id": "larix",
        },
    },
    {
        "id": "laurel",
        "label": "Laurel",
        "segments": [
            {"id": "laurel-st", "label": "Laurel St", "address_key": "LAUREL ST"},
        ],
        "namesake": {
            "match": "common_name", "common_contains": {"LAUREL"},
            "confidence": "loose",
            "note": ("Matches any common name containing 'laurel' -- cherry "
                      "laurel and Portuguese laurel (Prunus), bay laurel "
                      "(Laurus), California bay laurel (Umbellularia). These "
                      "are botanically unrelated to each other; 'laurel' is a "
                      "shape-of-leaf name, not a real taxonomic group."),
            "taxa_id": "prunus-laurocerasus",
        },
    },
    {
        "id": "magnolia",
        "label": "Magnolia",
        "segments": [
            {"id": "magnolia-st", "label": "Magnolia St", "address_key": "MAGNOLIA ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"MAGNOLIA"},
            "confidence": "exact", "note": None, "taxa_id": "magnolia",
        },
    },
    {
        "id": "maple",
        "label": "Maple",
        "segments": [
            {"id": "maple-st", "label": "Maple St", "address_key": "MAPLE ST"},
            {"id": "maple-crescent", "label": "Maple Crescent", "address_key": "MAPLE CRESCENT"},
        ],
        "namesake": {
            "match": "genus", "genera": {"ACER"},
            "confidence": "exact", "note": None, "taxa_id": "acer",
        },
    },
    {
        "id": "oak",
        "label": "Oak",
        "segments": [
            {"id": "oak-st", "label": "Oak St", "address_key": "OAK ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"QUERCUS"},
            "confidence": "exact", "note": None, "taxa_id": "quercus",
        },
    },
    {
        "id": "pine",
        "label": "Pine",
        "segments": [
            {"id": "pine-st", "label": "Pine St", "address_key": "PINE ST"},
            {"id": "pine-crescent", "label": "Pine Crescent", "address_key": "PINE CRESCENT"},
        ],
        "namesake": {
            "match": "genus", "genera": {"PINUS"},
            "confidence": "exact", "note": None, "taxa_id": "pinus",
        },
    },
    {
        "id": "poplar",
        "label": "Poplar",
        "segments": [
            {"id": "poplar-st", "label": "Poplar St", "address_key": "POPLAR ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"POPULUS"},
            "confidence": "exact", "note": None, "taxa_id": "populus",
        },
    },
    {
        "id": "spruce",
        "label": "Spruce",
        "segments": [
            {"id": "spruce-st", "label": "Spruce St", "address_key": "SPRUCE ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"PICEA"},
            "confidence": "exact", "note": None, "taxa_id": "picea",
        },
    },
    {
        "id": "vine",
        "label": "Vine",
        "segments": [
            {"id": "vine-st", "label": "Vine St", "address_key": "VINE ST"},
        ],
        "namesake": {
            "match": "none",
            "confidence": "exact",
            "note": ("No Vine Maple (Acer circinatum) grows on Vine St in the "
                      "current inventory (it does exist elsewhere in the "
                      "city), so there's no tree on the street that plausibly "
                      "explains the name -- 'vine' almost certainly isn't a "
                      "tree reference here."),
            "taxa_id": None,
        },
    },
    {
        "id": "walnut",
        "label": "Walnut",
        "segments": [
            {"id": "walnut-st", "label": "Walnut St", "address_key": "WALNUT ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"JUGLANS"},
            "confidence": "exact", "note": None, "taxa_id": "juglans",
        },
    },
    {
        "id": "willow",
        "label": "Willow",
        "segments": [
            {"id": "willow-st", "label": "Willow St", "address_key": "WILLOW ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"SALIX"},
            "confidence": "exact", "note": None, "taxa_id": "salix",
        },
    },
    {
        "id": "yew",
        "label": "Yew",
        "segments": [
            {"id": "yew-st", "label": "Yew St", "address_key": "YEW ST"},
        ],
        "namesake": {
            "match": "genus", "genera": {"TAXUS"},
            "confidence": "exact", "note": None, "taxa_id": "taxus",
        },
    },
]


# ---------------------------------------------------------------------------
# Taxa metadata: what to fetch from Wikipedia, keyed by taxa_id.
# ---------------------------------------------------------------------------
# `wiki_query` is the title/redirect to query the REST summary endpoint with;
# the API resolves it to a canonical title, which is what ends up in
# taxa.json's wikipedia.title/url.

TAXA = {
    "alnus":        {"label": "Alder",    "scientific_name": "Alnus",                 "rank": "genus",   "wiki_query": "Alder"},
    "arbutus":      {"label": "Arbutus",  "scientific_name": "Arbutus",                "rank": "genus",   "wiki_query": "Arbutus"},
    "fraxinus":     {"label": "Ash",      "scientific_name": "Fraxinus",               "rank": "genus",   "wiki_query": "Fraxinus"},
    "abies":        {"label": "Fir",      "scientific_name": "Abies",                  "rank": "genus",   "wiki_query": "Fir"},
    "betula":       {"label": "Birch",    "scientific_name": "Betula",                 "rank": "genus",   "wiki_query": "Birch"},
    "thuja-plicata":{"label": "Cedar",    "scientific_name": "Thuja plicata",          "rank": "species", "wiki_query": "Thuja plicata"},
    "prunus":       {"label": "Cherry",   "scientific_name": "Prunus",                 "rank": "genus",   "wiki_query": "Cherry"},
    "aesculus-hippocastanum": {"label": "Chestnut", "scientific_name": "Aesculus hippocastanum", "rank": "species", "wiki_query": "Aesculus hippocastanum"},
    "chamaecyparis":{"label": "Cypress",  "scientific_name": "Chamaecyparis",          "rank": "genus",   "wiki_query": "Chamaecyparis"},
    "cornus":       {"label": "Dogwood",  "scientific_name": "Cornus",                 "rank": "genus",   "wiki_query": "Dogwood"},
    "ulmus":        {"label": "Elm",      "scientific_name": "Ulmus",                  "rank": "genus",   "wiki_query": "Elm"},
    "tsuga":        {"label": "Hemlock",  "scientific_name": "Tsuga",                  "rank": "genus",   "wiki_query": "Tsuga"},
    "larix":        {"label": "Larch",    "scientific_name": "Larix",                  "rank": "genus",   "wiki_query": "Larch"},
    "prunus-laurocerasus": {"label": "Laurel", "scientific_name": "Prunus laurocerasus", "rank": "species", "wiki_query": "Prunus laurocerasus"},
    "magnolia":     {"label": "Magnolia", "scientific_name": "Magnolia",               "rank": "genus",   "wiki_query": "Magnolia"},
    "acer":         {"label": "Maple",    "scientific_name": "Acer",                   "rank": "genus",   "wiki_query": "Maple"},
    "quercus":      {"label": "Oak",      "scientific_name": "Quercus",                "rank": "genus",   "wiki_query": "Oak"},
    "pinus":        {"label": "Pine",     "scientific_name": "Pinus",                  "rank": "genus",   "wiki_query": "Pine"},
    "populus":      {"label": "Poplar",   "scientific_name": "Populus",                "rank": "genus",   "wiki_query": "Populus"},
    "picea":        {"label": "Spruce",   "scientific_name": "Picea",                  "rank": "genus",   "wiki_query": "Spruce"},
    "juglans":      {"label": "Walnut",   "scientific_name": "Juglans",                "rank": "genus",   "wiki_query": "Walnut"},
    "salix":        {"label": "Willow",   "scientific_name": "Salix",                  "rank": "genus",   "wiki_query": "Willow"},
    "taxus":        {"label": "Yew",      "scientific_name": "Taxus",                  "rank": "genus",   "wiki_query": "Taxus"},
}


# ---------------------------------------------------------------------------
# Curated "how to spot it" field marks, keyed by taxa_id.
# 2-4 concrete, visual marks each -- leaf shape, bark, silhouette, fruit/cone.
# ---------------------------------------------------------------------------

SPOTTING = {
    "alnus": [
        "Leaves are round-to-oval with a finely double-toothed edge and stay green late into fall, often falling while still green.",
        "Small woody cone-like fruits (strobiles) persist on bare branches all winter -- a giveaway from across the street.",
        "Bark is smooth and grey with pale horizontal lenticel scars, patched with lichen near rivers and ditches.",
    ],
    "arbutus": [
        "Bark peels in curling papery sheets, showing smooth green-to-cinnamon new bark underneath -- unmistakable, no other tree on the coast does this.",
        "Leaves are thick, glossy, leathery ovals that stay on the tree year-round (broadleaf evergreen).",
        "Clusters of small urn-shaped white flowers in spring give way to bumpy orange-red berries in fall.",
        "Often leans or twists dramatically, growing on rock outcrops with sparse, contorted limbs.",
    ],
    "fraxinus": [
        "Leaves are compound, with 5-9 leaflets arranged in opposite pairs along the stalk.",
        "Twigs and buds are also strictly opposite -- look for two branches or buds directly across from each other.",
        "Bark on mature trunks forms a tight diamond-shaped ridge pattern.",
        "Seeds hang in dense clusters of single-wing 'keys' (samaras) that persist into winter.",
    ],
    "abies": [
        "Needles attach singly and directly to the twig (no woody peg), leaving a smooth round scar when they fall.",
        "Needles are flat, soft to the touch, and often have two pale stripes on the underside.",
        "Cones stand upright on top branches like candles and disintegrate on the tree rather than falling whole.",
        "Crown is a neat, narrow spire shape from base to tip.",
    ],
    "betula": [
        "Bark is thin, smooth, and peels in horizontal papery strips -- white, silver, or coppery depending on species.",
        "Trunk is often marked with dark, diamond-shaped lenticels.",
        "Leaves are small, triangular-to-oval with a doubly-toothed edge and a pointed tip.",
        "Slender drooping catkins hang from the branch tips in spring.",
    ],
    "thuja-plicata": [
        "Foliage grows in flat, drooping sprays of tiny scale-like leaves, not individual needles.",
        "Crushed foliage smells strongly of pineapple or fresh-cut cedar.",
        "Bark is stringy and fibrous, tearing into long vertical strips rather than flaking or plating.",
        "Small cones are woody, egg-shaped and no bigger than a thumbnail, in loose clusters near branch tips.",
    ],
    "prunus": [
        "Bark is smooth and reddish-brown to grey, marked with distinct horizontal lines (lenticels).",
        "Flowers arrive in dense clusters before or with the leaves -- white to deep pink, often frilly and double on street trees.",
        "Leaves have a fine, single-toothed (serrated) edge and a pointed tip.",
        "Small round stone fruit; on ornamental cultivars flowers are showy but fruit is often sparse or absent.",
    ],
    "aesculus-hippocastanum": [
        "Leaves are palmately compound -- 5-7 leaflets fanning out from one point, like an open hand.",
        "Large sticky, resinous buds in winter are a fast ID even with no leaves.",
        "Upright cone-shaped clusters ('candles') of white flowers with pink or yellow throat markings in spring.",
        "Fruit is a round, spiky green husk holding one or two glossy brown 'conkers'.",
    ],
    "chamaecyparis": [
        "Foliage grows in flattened, fan-like sprays of tiny overlapping scales, drooping at the tips.",
        "Undersides of the scale sprays often show a faint white X or butterfly marking of wax.",
        "Small, round cones about the size of a pea, with shield-shaped scales.",
        "Crown is often a narrow, drooping pyramid with a distinctly weeping leader.",
    ],
    "cornus": [
        "Leaves are oval with strongly arching veins that curve to follow the leaf edge rather than crossing it.",
        "Flowers on the flowering dogwoods are actually tiny true flowers surrounded by 4-6 large white or pink petal-like bracts.",
        "Bark on mature trunks breaks into small, squarish blocks, sometimes compared to alligator skin.",
        "Clusters of bright red berry-like drupes appear in late summer.",
    ],
    "ulmus": [
        "Leaf bases are lopsided -- one side meets the stem lower than the other.",
        "Bark is grey-brown with deep interlacing ridges like braided rope.",
        "Branches arch up and out into a broad vase silhouette.",
        "Flat, round, papery winged seeds (samaras) appear in dense clusters before the leaves in spring.",
    ],
    "tsuga": [
        "Needles are short, flat, and irregular in length along the twig, giving sprays a soft, feathery look.",
        "The leading shoot at the very top of the tree droops over instead of standing upright -- the single most reliable field mark.",
        "Small cones hang down and are barely bigger than a fingertip.",
        "Needles have two white stripes underneath and a tiny stalk where they meet the twig.",
    ],
    "larix": [
        "Needles grow in dense whorled tufts on short spur shoots, unlike other conifers on the street.",
        "It's a deciduous conifer -- needles turn gold and drop completely every fall, leaving bare branches all winter.",
        "Small, upright barrel-shaped cones persist on the twigs long after the needles are gone.",
    ],
    "prunus-laurocerasus": [
        "Leaves are broad, glossy, leathery ovals that stay on the plant year-round -- a broadleaf evergreen among mostly deciduous street trees.",
        "Leaf edges are smooth or very finely toothed, not deeply serrated.",
        "Small white flowers stand up in narrow upright spikes, followed by small cherry-like black fruit.",
        "Often kept clipped into a dense hedge or screen rather than grown as a single-trunked tree.",
    ],
    "magnolia": [
        "Leaves are large, simple, untoothed ovals with a leathery feel.",
        "Flowers are large (often hand-sized), cup- or star-shaped, in white, pink or purple, opening before or with the leaves.",
        "Flower buds are covered in a distinctive soft, fuzzy grey scale through winter.",
        "Cone-like seed pods split open to reveal bright red-orange seeds hanging on thin threads.",
    ],
    "acer": [
        "Leaves and branching are opposite -- paired directly across from each other on the twig, not staggered.",
        "Most leaves are palmately lobed, fanning out from one central point like fingers.",
        "Paired winged seeds (samaras, 'helicopters') spin down in late summer.",
        "Bark ranges from smooth and striped (young trees) to deeply furrowed and plated (old trunks), depending on species.",
    ],
    "quercus": [
        "Leaves are lobed (rounded or bristle-tipped, depending on species) with an asymmetric, wavy outline.",
        "Acorns in a scaly cup are unmistakable when present, late summer into fall.",
        "Bark is thick, grey, and deeply furrowed into rough vertical ridges even on medium-sized trunks.",
        "Heavy, wide-spreading limbs give the crown a broad, rounded silhouette.",
    ],
    "pinus": [
        "Needles are long, grow in bundles (fascicles) of 2, 3 or 5 depending on species, bound at the base by a papery sheath.",
        "Cones are woody with thick, often prickly scales, and take two seasons to mature.",
        "Bark on older trunks breaks into irregular plates or scaly ridges, often orange-brown in the furrows.",
    ],
    "populus": [
        "Leaves flutter and shimmer in the slightest breeze -- the flattened leaf stalk (petiole) lets them twist freely.",
        "Bark on young trees is smooth and pale, often greenish-white, with diamond-shaped scars; older bark becomes deeply furrowed near the base.",
        "Fast, tall, narrow growth habit with a straight trunk and relatively sparse crown.",
        "Catkins (not showy flowers) appear before the leaves in early spring; some species release cottony seed fluff in early summer.",
    ],
    "picea": [
        "Needles attach singly to small woody pegs (sterigmata) that remain on the twig after needles drop -- twigs feel rough and bumpy when needles are stripped off.",
        "Needles are stiff, four-sided, and sharp to the touch when rolled between fingers.",
        "Cones hang down and drop whole to the ground, unlike upright fir cones.",
        "Crown is a strict, symmetrical spire from young age.",
    ],
    "juglans": [
        "Leaves are large compound leaves with 9-many leaflets, and crushed leaflets smell strongly aromatic (some describe it as spicy or medicinal).",
        "Bark is dark grey-brown with deep, diamond-crossed furrows.",
        "Fruit is a round green husk that blackens and stains hands and pavement, holding a hard corrugated nut inside.",
        "Pith inside young twigs is chambered (segmented) rather than solid when cut lengthwise.",
    ],
    "salix": [
        "Leaves are long, narrow, and several times longer than they are wide, often with a silvery underside.",
        "Twigs are slender and whippy, and on many species droop or sweep downward.",
        "Bark is grey and becomes deeply furrowed with age; trees are usually found near water or damp ground.",
        "Furry grey catkins ('pussy willows') appear on bare branches before the leaves in very early spring.",
    ],
    "taxus": [
        "Needles are flat, dark green, soft (not prickly), and arranged in two flat ranks along the twig.",
        "Bark is thin and reddish-brown, peeling in small flakes or scales.",
        "No true cones -- instead, single seeds sit in a bright red, soft, cup-shaped berry-like structure (aril) in fall.",
        "Foliage and seeds are highly toxic if eaten -- a fact worth knowing, not just spotting.",
    ],
}
