/* =============================================================================
   Tree Streets of Vancouver
   Vanilla JS, no build step. Reads site/data/{streets,trees,taxa}.json.

   COLOUR LOGIC
   ------------
   There are ~26 tree-street families — far too many for 26 distinguishable
   hues. So hue does NOT encode street identity. It's binary: does the street
   carry at least one of its own namesake tree, or none at all?

       blue    has its namesake      (at least one namesake tree found)
       red     none of its namesake  (zero found, or no possible namesake
                                       exists in the inventory at all)

   The underlying data still supports a finer read -- how much a street's
   share exceeds or falls short of the citywide rate, and how confidently --
   and that finer read still drives all the written reasoning (the detail
   panel's headline and evidence box, the masthead's standfirst). It has just
   been dropped as a MAP encoding: two colours is what the map and legend can
   actually carry at a glance, and line weight no longer doubles as a
   confidence channel either -- every street now draws at the same width.
   ========================================================================== */

(function () {
  'use strict';

  var VANCOUVER = { center: [-123.12, 49.25], zoom: 11.6 };

  /* ---------------------------------------------------------------- helpers */

  var $ = function (sel) { return document.querySelector(sel); };

  function h(tag, opts, kids) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text);
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(function (k) {
        if (opts.attrs[k] != null) node.setAttribute(k, opts.attrs[k]);
      });
    }
    if (opts.style) {
      Object.keys(opts.style).forEach(function (k) {
        node.style.setProperty(k, opts.style[k]);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid == null) return;
      node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#898781';
  }

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }

  function fmtInt(v) {
    return num(v) == null ? '—' : Math.round(v).toLocaleString('en-CA');
  }

  function fmtPct(v, digits) {
    if (num(v) == null) return '—';
    var d = digits == null ? (v > 0 && v < 0.01 ? 2 : 1) : digits;
    return (v * 100).toFixed(d).replace(/\.0+$/, '') + '%';
  }

  function fmtRatio(r) {
    if (num(r) == null) return '—';
    if (r === 0) return '0×';
    if (r >= 100) return Math.round(r) + '×';
    if (r >= 10) return r.toFixed(1).replace(/\.0$/, '') + '×';
    if (r < 1) return r.toFixed(2).replace(/0$/, '') + '×';
    return r.toFixed(1) + '×';
  }

  function fmtMeasure(v, unit) {
    if (v === null || v === undefined || v === '' || v === 'null') return 'not recorded';
    var x = Number(v);
    if (!isFinite(x) || x <= 0) return 'not recorded';
    return x.toFixed(1) + ' ' + unit;
  }

  function fmtP(p) {
    if (num(p) == null) return 'the significance test is unavailable';
    if (p <= 0) return 'p is smaller than 1 in a billion';
    if (p < 0.0001) return 'p < 0.0001';
    if (p > 0.99) return 'p ≈ 1';
    if (p < 0.01) return 'p = ' + p.toPrecision(1);
    return 'p = ' + p.toFixed(2);
  }

  // the producer writes plain-ASCII notes; typeset them
  function tidy(s) {
    return String(s == null ? '' : s)
      .replace(/\s--\s/g, ' — ')
      .replace(/(^|[\s([])'/g, '$1‘')
      .replace(/'/g, '’');
  }

  function countOf(n, label) {
    var v = num(n) || 0;
    return fmtInt(v) + ' ' + (v === 1 ? String(label).toLowerCase() : plural(label));
  }

  function fmtExpected(x) {
    if (num(x) == null) return '—';
    if (x >= 10) return String(Math.round(x));
    if (x < 0.05) return '0';
    return x.toFixed(1);
  }

  /* ---- the range chance allows -------------------------------------------
     Central 95% interval of a Binomial(n, city_share): the count of namesake
     trees you would get on a street this long if it were planted at the
     citywide rate. It is the honest yardstick — it makes a short street's
     ignorance visible as a WIDE band, and turns "zero" into three different
     stories: zero inside the band (unremarkable), zero below it (a real
     absence), and a band so wide it covers everything (nothing to say).
     ---------------------------------------------------------------------- */
  function chanceBand(n, p) {
    n = Math.round(num(n) || 0);
    p = num(p);
    if (!n || p == null || p <= 0 || p >= 1) return null;
    var pmf = Math.exp(n * Math.log(1 - p));
    if (!(pmf > 0)) {                                   // underflow -> Poisson
      var lam = n * p, k0 = 0, c0 = 0, q = Math.exp(-lam), lo0 = null, hi0 = n;
      if (!(q > 0)) return null;
      for (k0 = 0; k0 <= n; k0++) {
        c0 += q;
        if (lo0 === null && c0 > 0.025) lo0 = k0;
        if (c0 >= 0.975) { hi0 = k0; break; }
        q = q * lam / (k0 + 1);
      }
      return { lo: lo0 || 0, hi: hi0 };
    }
    var cum = 0, lo = null, hi = n;
    for (var k = 0; k <= n; k++) {
      cum += pmf;
      if (lo === null && cum > 0.025) lo = k;
      if (cum >= 0.975) { hi = k; break; }
      pmf = pmf * ((n - k) / (k + 1)) * (p / (1 - p));
    }
    return { lo: lo || 0, hi: hi };
  }

  // three levels of "how much does this rest on", from the producer's own test
  function evidenceOf(f) {
    if (f._klass === 'none') return 'none';
    if (f.stats.significant) return 'strong';
    var p = num(f.stats.p_value);
    if (p != null && p < 0.05) return 'moderate';
    return 'slight';
  }

  var EVIDENCE = {
    strong:   { icon: '✓', label: 'Solid finding.', tag: 'solid' },
    moderate: { icon: '~', label: 'Suggestive.', tag: 'suggestive' },
    slight:   { icon: '?', label: 'Too little to go on.', tag: 'too few trees' },
    none:     { icon: '–', label: 'Nothing to test.', tag: null }
  };

  function plural(word) {
    if (!word) return 'trees';
    var w = String(word).toLowerCase();
    if (/(s|x|z|ch|sh)$/.test(w)) return w + 'es';
    if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
    return w + 's';
  }

  function withArticle(word) {
    if (!word) return 'a tree';
    var w = String(word).toLowerCase();
    return (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w;
  }

  function possessive(name) {
    if (!name) return 'the street’s';
    return /s$/i.test(name) ? name + '’' : name + '’s';
  }

  /* ------------------------------------------------------- the colour scale */

  var CLASS_ORDER = ['over-strong', 'over', 'as-expected', 'under', 'absent', 'none'];

  // classOf() still returns six values (unchanged, drives the prose) but the
  // palette is binary: everything except absent/none carries at least one
  // namesake tree ("has"); absent (found zero) and none (no possible
  // namesake in the inventory) both read as "none of its namesake".
  var CLASS_TO_VAR = {
    'over-strong': '--c-has', 'over': '--c-has', 'as-expected': '--c-has', 'under': '--c-has',
    'absent': '--c-none', 'none': '--c-none'
  };

  function colorFor(klass) {
    return cssVar(CLASS_TO_VAR[klass] || '--c-has');
  }

  function classOf(fam) {
    var st = fam.stats || {};
    if (!fam.namesake || fam.namesake.taxa_id == null) return 'none';
    if (st.verdict === 'absent' || st.namesake_n === 0) return 'absent';
    if (st.verdict === 'over') return num(st.ratio) != null && st.ratio >= 3 ? 'over-strong' : 'over';
    if (st.verdict === 'under') return 'under';
    if (st.verdict === 'as-expected') return 'as-expected';
    // verdict missing or unknown: fall back to ratio + significance
    if (!st.significant || num(st.ratio) == null) return 'as-expected';
    if (st.ratio > 1) return st.ratio >= 3 ? 'over-strong' : 'over';
    if (st.ratio < 1) return 'under';
    return 'as-expected';
  }

  /* ------------------------------------------------------------------ state */

  var DATA = { streets: null, trees: null, taxa: {} };
  var FAMS = [];              // normalized families, board order
  var BY_ID = {};             // id -> family
  var SELECTED = null;        // family id or null
  var map = null;
  var mapReady = false;
  var popup = null;
  var BOARD_MAX = 0.05;       // shared x-scale ceiling for the row plots

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isNarrow() {
    return window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  }

  /* ------------------------------------------------------------ normalizing */

  function normalize(streets) {
    var fams = (streets && streets.families ? streets.families : []).filter(Boolean);

    fams.forEach(function (f) {
      f.id = f.id || ('family-' + Math.random().toString(36).slice(2));
      f.label = f.label || f.id;
      f.namesake = f.namesake || { taxa_id: null, match: 'none', confidence: 'loose', note: null };
      f.stats = f.stats || {};
      f.segments = (f.segments || []).filter(Boolean);
      f.species = (f.species || []).filter(Boolean);

      var st = f.stats;
      if (num(st.n) == null) {
        st.n = f.segments.reduce(function (a, s) { return a + (num(s.n) || 0); }, 0);
      }
      if (num(st.namesake_n) == null) st.namesake_n = 0;
      if (num(st.street_share) == null) st.street_share = st.n ? st.namesake_n / st.n : 0;
      if (num(st.city_share) == null) st.city_share = null;
      if (st.ratio === undefined) st.ratio = null;
      st.significant = !!st.significant;

      f._klass = classOf(f);
      f._taxon = f.namesake.taxa_id ? (DATA.taxa[f.namesake.taxa_id] || null) : null;
      f._streetName = f.segments.length === 1
        ? (f.segments[0].label || f.label)
        : (f.segments.length > 1 ? f.label + ' streets' : f.label);
      f._namesakeLabel = (f._taxon && f._taxon.label) || f.label;
      f._ev = evidenceOf(f);
      f._band = f._klass === 'none' ? null : chanceBand(st.n, st.city_share);
      f._expected = (num(st.city_share) || 0) * (num(st.n) || 0);
    });

    // board order: the schema already sorts by ratio desc, nulls last. Re-derive
    // it defensively so we never depend on the producer's ordering.
    fams.sort(function (a, b) {
      var ra = num(a.stats.ratio), rb = num(b.stats.ratio);
      if (ra == null && rb == null) return b.stats.n - a.stats.n;
      if (ra == null) return 1;
      if (rb == null) return -1;
      if (rb !== ra) return rb - ra;
      // every absent street ties at ratio 0. Break the tie by how many namesake
      // trees there was a chance to find, so the conspicuous absences (Cedar,
      // where 6 were expected) sort above the meaningless ones (Alder, 0.1).
      return (b._expected || 0) - (a._expected || 0);
    });

    fams.forEach(function (f) { BY_ID[f.id] = f; });

    var ceiling = 0.02;
    fams.forEach(function (f) {
      ceiling = Math.max(ceiling, num(f.stats.street_share) || 0, num(f.stats.city_share) || 0,
        f._band && f.stats.n ? f._band.hi / f.stats.n : 0);
    });
    BOARD_MAX = Math.ceil(ceiling * 100 / 5) * 5 / 100;

    return fams;
  }

  /* ------------------------------------------------------------- geo builds */

  function streetGeoJSON() {
    var feats = [];
    FAMS.forEach(function (f) {
      f.segments.forEach(function (seg) {
        var g = seg.geometry;
        var coords = g && Array.isArray(g.coordinates) ? g.coordinates : [];
        coords = coords.filter(function (line) { return Array.isArray(line) && line.length > 1; });
        if (!coords.length) return;                       // empty MultiLineString
        feats.push({
          type: 'Feature',
          geometry: { type: 'MultiLineString', coordinates: coords },
          properties: {
            family: f.id,
            segment: seg.id || f.id,
            label: seg.label || f.label,
            klass: f._klass
          }
        });
      });
    });
    return { type: 'FeatureCollection', features: feats };
  }

  function treeGeoJSON(t) {
    var out = { type: 'FeatureCollection', features: [] };
    if (!t || !t.columns) return out;
    var c = t.columns;
    var n = num(t.n) != null ? t.n : (c.lon ? c.lon.length : 0);
    var famIds = t.family_ids || [], segIds = t.segment_ids || [];
    var commons = t.common_names || [], genera = t.genera || [], epithets = t.species_epithets || [];
    var feats = new Array(n);
    var k = 0;

    for (var i = 0; i < n; i++) {
      var lon = c.lon ? c.lon[i] : null, lat = c.lat ? c.lat[i] : null;
      if (typeof lon !== 'number' || typeof lat !== 'number') continue;
      var famId = famIds[c.family ? c.family[i] : -1] || null;
      var fam = famId ? BY_ID[famId] : null;
      feats[k++] = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          family: famId,
          famLabel: fam ? fam._streetName : '',
          segment: segIds[c.segment ? c.segment[i] : -1] || '',
          common: commons[c.common ? c.common[i] : -1] || 'Unrecorded species',
          genus: genera[c.genus ? c.genus[i] : -1] || '',
          species: epithets[c.species ? c.species[i] : -1] || '',
          height: c.height_m ? c.height_m[i] : null,
          dbh: c.dbh_cm ? c.dbh_cm[i] : null,
          namesake: c.namesake && c.namesake[i] ? 1 : 0,
          klass: fam ? fam._klass : 'as-expected'
        }
      };
    }
    feats.length = k;
    out.features = feats;
    return out;
  }

  /* ------------------------------------------------------------------- head */

  function renderMasthead() {
    var city = (DATA.streets && DATA.streets.city) || {};
    var totalTrees = FAMS.reduce(function (a, f) { return a + (num(f.stats.n) || 0); }, 0);
    var absent = FAMS.filter(function (f) { return f._klass === 'absent'; });
    var over = FAMS.filter(function (f) {
      return (f._klass === 'over' || f._klass === 'over-strong') && f.stats.significant;
    });

    var kpis = $('#kpis');
    kpis.textContent = '';
    [
      [FAMS.length, 'Streets named for trees'],
      [num(city.families_tree_count) != null ? city.families_tree_count : totalTrees, 'Trees growing on them'],
      [absent.length, 'With none of their namesake']
    ].forEach(function (pair) {
      kpis.appendChild(h('div', {}, [
        h('dt', { text: pair[1] }),
        h('dd', { text: fmtInt(pair[0]) })
      ]));
    });

    // standfirst: the two ends of the story, written from the data
    var best = over[0] || null;
    // lead with the absence that is actually conspicuous, not merely the longest
    // street: the one where the most namesake trees were expected
    var worst = absent.slice().sort(function (a, b) {
      if (!!a.stats.significant !== !!b.stats.significant) return a.stats.significant ? -1 : 1;
      return (b._expected || 0) - (a._expected || 0);
    })[0] || null;
    var sf = $('#standfirst');
    sf.textContent = '';

    sf.appendChild(document.createTextNode(
      'The city named ' + FAMS.length + ' streets after trees, then planted whatever it liked. '));

    var named = function (f, klass) {
      return h('span', { className: 'mark' }, [
        'On ',
        h('span', { className: 'swatch', style: { background: colorFor(klass) } }),
        h('strong', { text: f._streetName })
      ]);
    };

    if (best) {
      sf.appendChild(named(best, best._klass));
      sf.appendChild(document.createTextNode(
        ', ' + fmtInt(best.stats.namesake_n) + ' of its ' + fmtInt(best.stats.n) + ' trees really are ' +
        plural(best._namesakeLabel) + ' (' + fmtPct(best.stats.street_share) + ') — ' +
        fmtRatio(best.stats.ratio) + ' the citywide rate. '));
    }
    if (worst) {
      sf.appendChild(named(worst, 'absent'));
      sf.appendChild(document.createTextNode(
        worst._expected >= 1.5
          ? ', where about ' + Math.round(worst._expected) + ' ' + plural(worst._namesakeLabel) +
            ' should have been, there are none.'
          : ', not one of the ' + fmtInt(worst.stats.n) + ' trees is ' +
            withArticle(worst._namesakeLabel) + '.'));
    }
    if (!best && !worst) {
      sf.appendChild(document.createTextNode('Pick a street to see how well it lives up to its name.'));
    }

    var gen = DATA.streets && DATA.streets.generated;
    $('#generated').textContent = gen ? 'Data compiled ' + gen + '.' : '';
  }

  /* ------------------------------------------------------------- leaderboard */

  /* The row plot. A pale band = the range of shares chance alone would produce
     at the citywide rate on a street this long; a tick = the citywide rate
     itself; a filled dot = what is actually there. Inside the band means the
     street is unremarkable however dramatic the multiple looks. */
  function chancePlot(f, max, big) {
    var st = f.stats;
    var c = colorFor(f._klass);
    var pos = function (v) {
      var q = max > 0 ? Math.min(1, Math.max(0, (num(v) || 0) / max)) : 0;
      return (q * 100).toFixed(3) + '%';
    };

    var wrap = h('div', {
      className: 'plot' + (big ? ' plot--big' : ''),
      style: { '--dc': c }
    });

    if (f._band && st.n) {
      var lo = f._band.lo / st.n, hi = f._band.hi / st.n;
      wrap.appendChild(h('span', {
        className: 'plot__band',
        style: { left: pos(lo), width: 'calc(' + pos(hi) + ' - ' + pos(lo) + ')' },
        attrs: {
          title: 'Chance alone would give ' + f._band.lo + '–' + f._band.hi + ' of them here'
        }
      }));
    }

    if (num(st.city_share)) {
      wrap.appendChild(h('span', {
        className: 'plot__tick',
        style: { left: pos(st.city_share) },
        attrs: { title: 'Citywide rate: ' + fmtPct(st.city_share) }
      }));
    }

    // position relative to the band IS the encoding — no second channel needed
    var inside = !f._band || (st.namesake_n >= f._band.lo && st.namesake_n <= f._band.hi);
    wrap.appendChild(h('span', {
      className: 'plot__dot' + ((num(st.street_share) || 0) === 0 ? ' is-zero' : ''),
      style: { left: pos(st.street_share) },
      attrs: {
        title: 'This street: ' + fmtInt(st.namesake_n) + ' (' + fmtPct(st.street_share) + ')' +
               (f._band ? (inside ? ' — inside what chance allows' : ' — outside what chance allows') : '')
      }
    }));

    return wrap;
  }

  function renderBoard() {
    var list = $('#leaderboard');
    list.textContent = '';

    FAMS.forEach(function (f) {
      var st = f.stats;
      var c = colorFor(f._klass);

      var sub = f._klass === 'none'
        ? fmtInt(st.n) + ' trees · no namesake to count'
        : fmtPct(st.street_share) + ' of ' + fmtInt(st.n) + ' trees · ' +
          fmtExpected(f._expected) + ' expected';

      var btn = h('button', {
        className: 'row',
        style: { '--row-c': c },
        attrs: {
          type: 'button',
          'data-family': f.id,
          'aria-pressed': f.id === SELECTED ? 'true' : 'false',
          title: f._streetName + ' — ' + fmtInt(st.namesake_n) + ' ' + plural(f._namesakeLabel) +
                 ' among ' + fmtInt(st.n) + ' trees (' + fmtPct(st.street_share) + '); citywide ' +
                 fmtPct(st.city_share) +
                 (f._band ? '. Chance alone: ' + f._band.lo + '–' + f._band.hi + '.' : '.')
        }
      }, [
        h('span', { className: 'row__name', text: f._streetName }),
        h('span', {
          className: 'row__share',
          text: f._klass === 'none' ? '—' : fmtInt(st.namesake_n)
        }),
        h('span', {
          className: 'row__ratio' + (num(st.ratio) == null ? ' is-null' : ''),
          text: f._klass === 'absent' ? 'none' : fmtRatio(st.ratio)
        }),
        h('span', { className: 'row__sub', text: sub }),
        h('span', { className: 'row__plot' }, [chancePlot(f, BOARD_MAX, false)])
      ]);

      btn.addEventListener('click', function () { select(f.id, { recenter: true }); });
      list.appendChild(h('li', {}, [btn]));
    });

    var note = $('#axisNote');
    note.textContent = '';
    note.appendChild(h('span', { className: 'axis-note__key' }, [
      h('span', { className: 'key-band' }), ' what chance allows · ',
      h('span', { className: 'key-dot key-dot--plot' }), ' what is there'
    ]));
    note.appendChild(h('span', { text: '0 → ' + fmtPct(BOARD_MAX, 0) + ' of a street’s trees' }));
  }

  function renderLegend() {
    var ul = $('#legendScale');
    ul.textContent = '';
    [
      ['has',  'Has its namesake tree'],
      ['none', 'None of its namesake']
    ].forEach(function (pair) {
      ul.appendChild(h('li', {}, [
        h('span', { className: 'swatch', style: { background: colorFor(pair[0]) } }),
        pair[1]
      ]));
    });
  }

  /* Contextualizes the headline tree-street findings against the whole
     city: how many species Vancouver plants and which ones dominate. Reads
     straight off streets.json's city block; if an older build didn't write
     the new fields, hide the strip rather than show a broken one. A quiet
     footnote row under the masthead's main line -- not the map, not another
     KPI -- so it reads as an aside, not a competing headline. */
  function renderCityStrip() {
    var strip = $('#citystrip');
    if (!strip) return;

    var city = (DATA.streets && DATA.streets.city) || {};
    var speciesCount = num(city.species_count);
    var topSpecies = Array.isArray(city.top_species) ? city.top_species.filter(Boolean) : [];

    if (speciesCount == null || !topSpecies.length) {
      strip.hidden = true;
      return;
    }
    strip.hidden = false;
    strip.textContent = '';

    var totalTrees = num(city.tree_count);
    strip.appendChild(h('p', {
      className: 'citystrip__lead',
      // "kinds", not "species": the inventory's common names are cultivar-level
      // (Kwanzan Flowering Cherry, Pissard Plum), so 1,311 overstates true species
      text: (totalTrees != null ? fmtInt(totalTrees) + ' public trees' : 'Public trees') +
            ' of ' + fmtInt(speciesCount) + ' kinds across Vancouver.'
    }));

    var ul = h('ul', { className: 'citystrip__list' });
    ul.appendChild(h('li', { className: 'citystrip__label', text: 'Most planted' }));
    topSpecies.slice(0, 5).forEach(function (s) {
      ul.appendChild(h('li', {}, [
        s.common_name || 'Unrecorded species',
        h('span', { className: 'citystrip__n', text: fmtInt(s.n) })
      ]));
    });
    strip.appendChild(ul);
  }

  /* ---------------------------------------------------------- detail panel  */

  function headlineFor(f) {
    var st = f.stats;
    var who = possessive(f._streetName);
    var nm = plural(f._namesakeLabel);

    if (f._klass === 'none') {
      return tidy(f.namesake.note) ||
        (f.label + ' is not a tree that Vancouver plants on its streets, so there is no namesake to count here.');
    }
    if (f._klass === 'absent') {
      // the fact, plainly. The evidence box below carries the interpretation.
      return 'Not one of ' + who + ' ' + fmtInt(st.n) + ' trees is ' +
             withArticle(f._namesakeLabel) + '.';
    }
    // count-first: lead with how many, the share follows in parens
    var lead = st.namesake_n === 1
      ? fmtInt(st.namesake_n) + ' of ' + who + ' ' + fmtInt(st.n) + ' trees is ' +
        withArticle(f._namesakeLabel) + ' (' + fmtPct(st.street_share) + ')'
      : fmtInt(st.namesake_n) + ' of ' + who + ' ' + fmtInt(st.n) + ' trees are ' + nm +
        ' (' + fmtPct(st.street_share) + ')';
    if (num(st.ratio) == null) {
      return lead + '. The city has no ' + nm + ' to compare against, so there is no rate to beat.';
    }
    if (f._klass === 'as-expected') {
      var r = num(st.ratio);
      if (r == null || (r > 0.8 && r < 1.25)) {
        return lead + ' — about the citywide rate of ' + fmtPct(st.city_share) + '.';
      }
      // a big-looking multiple that the numbers can't actually support. The
      // count is already up front in `lead`, so don't repeat it here.
      return lead + ', against ' + fmtPct(st.city_share) + ' citywide. That is ' + fmtRatio(r) +
        ' on paper — too few trees to call it settled.';
    }
    if (f._klass === 'under') {
      return 'Only ' + lead + ' — ' + fmtRatio(st.ratio) + ' the citywide rate of ' +
             fmtPct(st.city_share) + '.';
    }
    return lead + ' — ' + fmtRatio(st.ratio) + ' the citywide rate of ' + fmtPct(st.city_share) + '.';
  }

  function evidenceFor(f) {
    var st = f.stats;
    var box = h('p', { className: 'evidence' });

    if (f._klass === 'none') {
      box.appendChild(h('span', { className: 'evidence__icon', text: '–', attrs: { 'aria-hidden': 'true' } }));
      box.appendChild(h('span', {}, [
        h('b', { text: 'Nothing to test. ' }),
        'No species in the City’s inventory answers to this street’s name, so there is no rate to compare.'
      ]));
      return box;
    }

    var ev = EVIDENCE[f._ev] || EVIDENCE.slight;
    var nm = plural(f._namesakeLabel);
    var phrase = bandPhrase(f);
    var found = fmtInt(st.namesake_n);

    box.className = 'evidence evidence--' + f._ev;
    box.appendChild(h('span', {
      className: 'evidence__icon',
      text: ev.icon,
      attrs: { 'aria-hidden': 'true' }
    }));

    var parts = [h('b', { text: ev.label + ' ' })];

    if (phrase) {
      parts.push('Chance alone would put ' + phrase + ' on a street this long — ' + nm +
        ' are ' + fmtPct(st.city_share) + ' of Vancouver’s trees. ');
      parts.push(st.namesake_n === 0 ? 'There are none. ' :
        'There ' + (st.namesake_n === 1 ? 'is 1. ' : 'are ' + found + '. '));
    }

    if (f._klass === 'absent' && f._ev !== 'strong') {
      parts.push('That is inside what luck allows (' + fmtP(st.p_value) +
        '), so statistically the absence is unremarkable. It is the street sign that makes it strange.');
    } else if (f._ev === 'strong') {
      parts.push('That is far outside what luck produces (' + fmtP(st.p_value) + ')' +
        ((num(st.n) || 0) < 60 ? ', though on a street of only ' + fmtInt(st.n) +
          ' trees the exact multiple should be read loosely.' : '.'));
    } else if (f._ev === 'moderate') {
      // the band is a central 95% interval; the producer's p is two-sided, so
      // a borderline case can sit ON the edge rather than past it. Say which.
      var outside = f._band
        ? (st.namesake_n < f._band.lo || st.namesake_n > f._band.hi)
        : true;
      parts.push((outside ? 'Outside the usual range, but only just (' : 'Right at the edge of it (') +
        fmtP(st.p_value) + '), and it rests on ' + countOf(st.namesake_n, f._namesakeLabel) +
        ' — suggestive, not settled.');
    } else {
      parts.push('That sits inside the range luck allows (' + fmtP(st.p_value) + '), so the ' +
        (num(st.ratio) == null ? 'comparison' : fmtRatio(st.ratio)) + ' is a hint rather than a finding.');
    }

    box.appendChild(h('span', {}, parts));
    return box;
  }

  function bandPhrase(f) {
    var b = f._band;
    if (!b) return null;
    var one = String(f._namesakeLabel).toLowerCase();
    var many = plural(f._namesakeLabel);
    if (b.hi === 0) return 'no ' + many + ' at all';
    if (b.lo === 0) return 'at most ' + b.hi + ' ' + (b.hi === 1 ? one : many);
    if (b.lo === b.hi) return 'exactly ' + b.lo + ' ' + (b.lo === 1 ? one : many);
    return 'between ' + b.lo + ' and ' + b.hi + ' ' + many;
  }

  function compareBlock(f) {
    var st = f.stats;
    if (f._klass === 'none') return null;

    var maxes = [num(st.street_share) || 0, num(st.city_share) || 0];
    if (f._band && st.n) maxes.push(f._band.hi / st.n);
    var max = Math.max.apply(null, maxes) * 1.25 || 0.01;
    var phrase = bandPhrase(f);

    return h('section', { className: 'block compare' }, [
      h('h3', { className: 'block__title', text: 'What chance allows, and what is there' }),
      h('p', {
        className: 'block__note',
        text: phrase
          ? 'Planted at the citywide rate, a street of ' + fmtInt(st.n) + ' trees would hold ' +
            phrase + ' 19 times out of 20. The pale bar is that range.'
          : 'There is no citywide rate to compare against.'
      }),
      chancePlot(f, max, true),
      h('div', { className: 'compare__legend' }, [
        h('span', {}, [
          h('span', { className: 'key-dot key-dot--plot', style: { background: colorFor(f._klass) } }),
          f._streetName + ' ',
          h('span', { className: 'v', text: fmtInt(st.namesake_n) + ' (' + fmtPct(st.street_share) + ')' })
        ]),
        h('span', {}, [
          h('span', { className: 'key-tick' }),
          'Citywide rate ',
          h('span', { className: 'v', text: fmtPct(st.city_share) })
        ])
      ])
    ]);
  }

  function speciesBlock(f) {
    var rows = f.species || [];
    var block = h('section', { className: 'block' }, [
      h('h3', { className: 'block__title', text: 'What actually grows there' }),
      h('p', { className: 'block__note', text: 'The commonest species on the street, by count.' })
    ]);
    if (!rows.length) {
      block.appendChild(h('p', { className: 'empty', text: 'No species breakdown is available for this street.' }));
      return block;
    }

    // A "false friend": a species carrying the street's name that is not the
    // street's tree. Willow St is the only one in the data — its commonest tree
    // by far is the Willow Oak, an oak with willow-shaped leaves.
    var lab = (f.label || '').toUpperCase();
    var falseFriend = lab && rows.filter(function (s) {
      return !s.namesake && (s.common_name || '').toUpperCase().indexOf(lab) !== -1;
    })[0];
    if (falseFriend) {
      var sci = [falseFriend.genus, falseFriend.species].filter(Boolean).join(' ');
      sci = sci.charAt(0) + sci.slice(1).toLowerCase();
      // Resolve the false friend's genus to a common name via taxa.json, so we
      // can say "an oak" rather than only "Quercus". Absent a match, say less.
      var realKind = null;
      for (var key in DATA.taxa) {
        if (!Object.prototype.hasOwnProperty.call(DATA.taxa, key)) continue;
        var cand = DATA.taxa[key];
        if (cand && (cand.scientific_name || '').toUpperCase() === (falseFriend.genus || '').toUpperCase()) {
          realKind = (cand.label || '').toLowerCase();
          break;
        }
      }
      var rank = rows.indexOf(falseFriend) === 0 ? 'the commonest tree on the street' : fmtInt(falseFriend.n) + ' of them';
      block.appendChild(h('p', { className: 'block__aside' }, [
        'Worth a look: the ',
        h('strong', { text: falseFriend.common_name }),
        ' — ' + rank + ' — carries the street’s name without being its tree. It is ',
        h('em', { text: sci }),
        (realKind ? ', ' + (/^[aeiou]/.test(realKind) ? 'an ' : 'a ') + realKind : '') +
        '. The name tracks the leaf shape, not the family.'
      ]));
    }
    var max = rows.reduce(function (a, s) { return Math.max(a, num(s.n) || 0); }, 0) || 1;
    var c = colorFor(f._klass);

    rows.slice(0, 10).forEach(function (s) {
      var name = s.common_name || [s.genus, s.species].filter(Boolean).join(' ') || 'Unrecorded';
      var row = h('div', {
        className: 'sp' + (s.namesake ? ' is-namesake' : ''),
        style: { '--sp-c': c },
        attrs: { title: name + ' — ' + fmtInt(s.n) + ' trees' }
      }, [
        h('div', { className: 'sp__top' }, [
          h('span', { className: 'sp__name' }, [
            name,
            s.namesake ? h('span', { className: 'sp__tag', text: 'namesake' }) : null
          ]),
          h('span', { className: 'sp__n', text: fmtInt(s.n) })
        ]),
        h('div', { className: 'sp__track' }, [
          h('div', { className: 'sp__bar', style: { width: Math.max(2, (num(s.n) || 0) / max * 100) + '%' } })
        ])
      ]);
      block.appendChild(row);
    });
    return block;
  }

  function taxonBlock(f) {
    var t = f._taxon;
    var block = h('section', { className: 'block' }, [
      h('h3', { className: 'block__title', text: 'The namesake' })
    ]);

    if (!t) {
      block.appendChild(h('p', {
        className: 'empty',
        text: tidy(f.namesake.note) ||
          ('No tree in the inventory matches the name “' + f.label +
           '”, so there is nothing to look for here.')
      }));
      return block;
    }

    var wiki = t.wikipedia || null;
    var card = h('div', { className: 'taxon' });
    var imgSrc = wiki && (wiki.image_thumb || wiki.image);

    if (imgSrc) {
      var img = h('img', {
        className: 'taxon__img',
        attrs: {
          src: imgSrc,
          alt: 'Photograph of ' + (t.label || f.label),
          loading: 'lazy',
          referrerpolicy: 'no-referrer'
        }
      });
      img.addEventListener('error', function () {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      card.appendChild(img);
    }

    var inner = h('div', { className: 'taxon__inner' }, [
      h('p', { className: 'taxon__name', text: t.label || f.label }),
      t.scientific_name
        ? h('p', { className: 'taxon__sci', text: t.scientific_name + (t.rank ? ' · ' + t.rank : '') })
        : null
    ]);

    if (wiki && wiki.extract) {
      inner.appendChild(h('p', { className: 'taxon__extract', text: wiki.extract }));
    }

    var spotting = (t.spotting || []).filter(Boolean);
    if (spotting.length) {
      inner.appendChild(h('p', { className: 'taxon__spotlabel', text: 'How to spot one' }));
      inner.appendChild(h('ul', { className: 'taxon__spot' },
        spotting.map(function (s) { return h('li', { text: s }); })));
    } else {
      inner.appendChild(h('p', {
        className: 'taxon__extract',
        text: 'No field marks have been written up for this one yet.'
      }));
    }

    if (wiki && wiki.url) {
      inner.appendChild(h('a', {
        className: 'taxon__link',
        text: 'Read about ' + (wiki.title || t.label) + ' on Wikipedia ↗',
        attrs: { href: wiki.url, target: '_blank', rel: 'noopener noreferrer' }
      }));
    } else {
      inner.appendChild(h('p', {
        className: 'taxon__credit',
        text: 'No Wikipedia article was matched for this taxon.'
      }));
    }
    if (imgSrc) {
      inner.appendChild(h('p', {
        className: 'taxon__credit',
        text: 'Photograph: ' + (wiki.image_credit || 'Wikimedia Commons') + ', via Wikipedia.'
      }));
    }

    card.appendChild(inner);
    block.appendChild(card);
    return block;
  }

  function segmentsBlock(f) {
    if (f.segments.length < 2) return null;
    return h('section', { className: 'block' }, [
      h('h3', { className: 'block__title', text: 'Streets in this family' }),
      h('ul', { className: 'segs' }, f.segments.map(function (s) {
        return h('li', {}, [
          h('span', { text: s.label || s.id }),
          h('span', { text: fmtInt(s.n) + ' trees' })
        ]);
      }))
    ]);
  }

  function renderDetail(f) {
    var body = $('#detailBody');
    body.textContent = '';
    var st = f.stats;
    var c = colorFor(f._klass);

    // Count-first: the hero number is always how many namesake trees there
    // are (the 'absent' branch's big '0' was always this; the other classes
    // now match it). The ratio isn't lost — it's still the headline below.
    var heroValue, heroSub;
    if (f._klass === 'none') {
      heroValue = '—';
      heroSub = 'no namesake to count';
    } else if (num(st.ratio) == null) {
      heroValue = fmtInt(st.namesake_n);
      heroSub = plural(f._namesakeLabel) + ' among ' + fmtInt(st.n) + ' trees (no citywide rate to compare)';
    } else {
      heroValue = fmtInt(st.namesake_n);
      heroSub = plural(f._namesakeLabel) + ' among ' + fmtInt(st.n) + ' trees · ' +
                fmtExpected(f._expected) + ' expected';
    }

    body.appendChild(h('p', {
      className: 'detail__kicker',
      text: (f.segments.length > 1 ? f.segments.length + ' streets' : (f.segments[0] && f.segments[0].label) || f.label) +
            ' · ' + fmtInt(st.n) + ' trees'
    }));
    body.appendChild(h('h2', { className: 'detail__title', text: f._streetName }));
    body.appendChild(h('p', { className: 'hero', text: heroValue, style: { '--hero-c': c } }));
    body.appendChild(h('p', { className: 'hero-sub', text: heroSub }));
    body.appendChild(h('p', { className: 'headline', text: headlineFor(f) }));
    body.appendChild(evidenceFor(f));

    // how the namesake was matched — only where it took a judgement call
    if (f._klass !== 'none' && (f.namesake.note || f.namesake.confidence === 'loose')) {
      var lead = f.namesake.confidence === 'loose' ? 'Judgement call. ' : 'What counted as ' +
        withArticle(f._namesakeLabel) + ': ';
      body.appendChild(h('p', { className: 'method' }, [
        h('b', { text: lead }),
        tidy(f.namesake.note) || ('Matched on ' + (f.namesake.match || 'name') + '.')
      ]));
    }

    var cmp = compareBlock(f);
    if (cmp) body.appendChild(cmp);
    var segs = segmentsBlock(f);
    if (segs) body.appendChild(segs);
    body.appendChild(speciesBlock(f));
    body.appendChild(taxonBlock(f));
  }

  /* -------------------------------------------------------------- selection */

  // `recenter` is opt-in: only picking a street from the list moves the camera.
  // Clicking a tree or a street on the map selects it where it already is —
  // moving the ground under a click the user just aimed is disorienting.
  function select(id, opts) {
    var recenter = !!(opts && opts.recenter);
    var f = BY_ID[id];
    if (!f) return;
    SELECTED = id;

    Array.prototype.forEach.call(document.querySelectorAll('.row'), function (r) {
      r.classList.toggle('is-selected', r.getAttribute('data-family') === id);
      r.setAttribute('aria-pressed', r.getAttribute('data-family') === id ? 'true' : 'false');
    });

    renderDetail(f);
    $('#view-rank').hidden = true;
    $('#view-detail').hidden = false;
    $('#rail').scrollTop = 0;
    var hint = $('#maphint');
    if (hint) hint.hidden = true;

    // narrow: the rail sits under the map, so bring the map into view with the
    // top of the panel just below it. Only when the pick came from the list —
    // if they tapped the map, it is already where they are looking.
    if (isNarrow() && recenter) {
      var wrap = document.querySelector('.mapwrap');
      window.scrollTo({
        top: Math.max(0, wrap.offsetTop - 6),
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    }

    paintSelection();
    if (recenter) flyTo(f);
  }

  function clearSelection() {
    SELECTED = null;
    if (popup) { popup.remove(); popup = null; }
    Array.prototype.forEach.call(document.querySelectorAll('.row'), function (r) {
      r.classList.remove('is-selected');
      r.setAttribute('aria-pressed', 'false');
    });
    $('#view-detail').hidden = true;
    $('#view-rank').hidden = false;
    var hint = $('#maphint');
    if (hint) hint.hidden = false;
    paintSelection();
  }

  // The only way the camera returns to the whole city, now that deselecting
  // leaves it alone. Reachable from the map control.
  function ResetViewControl() {}
  ResetViewControl.prototype.onAdd = function () {
    var wrap = document.createElement('div');
    wrap.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ctrl-reset';
    btn.title = 'Show all of Vancouver';
    btn.setAttribute('aria-label', 'Show all of Vancouver');
    btn.innerHTML =
      '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">' +
      '<path d="M3 8.4 10 3l7 5.4M5 7.6V16h10V7.6" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.addEventListener('click', resetView);
    wrap.appendChild(btn);
    this._el = wrap;
    return wrap;
  };
  ResetViewControl.prototype.onRemove = function () {
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
  };

  function resetView() {
    if (!mapReady) return;
    map.easeTo({
      center: VANCOUVER.center,
      zoom: VANCOUVER.zoom,
      duration: reduceMotion ? 0 : 700
    });
  }

  function flyTo(f) {
    if (!mapReady) return;
    var b = f.bbox;
    if (!Array.isArray(b) || b.length < 4 || b.some(function (v) { return typeof v !== 'number' || !isFinite(v); })) return;
    var w = Math.min(b[0], b[2]), e = Math.max(b[0], b[2]);
    var s = Math.min(b[1], b[3]), n = Math.max(b[1], b[3]);
    if (e - w < 0.0008) { w -= 0.0008; e += 0.0008; }
    if (n - s < 0.0008) { s -= 0.0008; n += 0.0008; }
    map.fitBounds([[w, s], [e, n]], {
      padding: { top: 70, bottom: 70, left: 60, right: 60 },
      maxZoom: 15.5,
      duration: reduceMotion ? 0 : 900
    });
  }

  /* -------------------------------------------------------------------- map */

  function matchColor() {
    var expr = ['match', ['get', 'klass']];
    CLASS_ORDER.forEach(function (k) { expr.push(k, colorFor(k)); });
    expr.push(cssVar('--muted'));
    return expr;
  }

  function dim(on, off) {
    if (!SELECTED) return on;
    return ['case', ['==', ['get', 'family'], SELECTED], on, off];
  }

  function paintSelection() {
    if (!mapReady) return;
    map.setPaintProperty('street-casing', 'line-opacity', dim(0.95, 0));
    map.setPaintProperty('street-line', 'line-opacity', dim(1, 0.16));
    map.setPaintProperty('trees-other', 'circle-opacity', dim(SELECTED ? 0.75 : 0.45, 0.07));
    map.setPaintProperty('trees-namesake', 'circle-opacity', dim(1, 0.1));
    map.setPaintProperty('trees-namesake', 'circle-stroke-opacity', dim(1, 0.1));
  }

  function repaintTheme() {
    if (!mapReady) return;
    map.setPaintProperty('street-line', 'line-color', matchColor());
    map.setPaintProperty('street-casing', 'line-color', cssVar('--surface'));
    map.setPaintProperty('trees-other', 'circle-color', cssVar('--muted'));
    map.setPaintProperty('trees-namesake', 'circle-color', matchColor());
    map.setPaintProperty('trees-namesake', 'circle-stroke-color', cssVar('--surface'));
    var src = map.getSource('basemap');
    if (src && typeof src.setTiles === 'function') src.setTiles(basemapTiles());
  }

  function basemapTiles() {
    var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var style = dark ? 'dark_all' : 'light_all';
    var r = window.devicePixelRatio > 1.25 ? '@2x' : '';
    return ['a', 'b', 'c', 'd'].map(function (s) {
      return 'https://' + s + '.basemaps.cartocdn.com/' + style + '/{z}/{x}/{y}' + r + '.png';
    });
  }

  function initMap() {
    if (typeof maplibregl === 'undefined') {
      $('#map').appendChild(h('p', {
        className: 'empty',
        style: { margin: '24px' },
        text: 'The map library could not be loaded. The rankings on the left still work.'
      }));
      return;
    }

    map = new maplibregl.Map({
      container: 'map',
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: 'raster',
            tiles: basemapTiles(),
            tileSize: 256,
            maxzoom: 19,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
              '© <a href="https://carto.com/attributions">CARTO</a>'
          }
        },
        layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }]
      },
      center: VANCOUVER.center,
      zoom: VANCOUVER.zoom,
      minZoom: 9,
      maxZoom: 18,
      dragRotate: false,
      pitchWithRotate: false
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new ResetViewControl(), 'top-right');
    map.touchZoomRotate.disableRotation();

    map.on('load', function () {
      map.addSource('streets', { type: 'geojson', data: streetGeoJSON() });
      map.addSource('trees', { type: 'geojson', data: treeGeoJSON(DATA.trees) });

      // Draw order matters: the ~10k context dots go DOWN first so the coloured
      // centreline reads on top of them; namesake dots then sit above everything.
      map.addLayer({
        id: 'trees-other',
        type: 'circle',
        source: 'trees',
        filter: ['==', ['get', 'namesake'], 0],
        paint: {
          'circle-color': cssVar('--muted'),
          'circle-opacity': 0.45,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 1, 13, 2, 16, 4]
        }
      });

      // a surface-coloured casing keeps the line legible where it crosses
      // basemap ink -- the map equivalent of the 2px surface ring.
      map.addLayer({
        id: 'street-casing',
        type: 'line',
        source: 'streets',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': cssVar('--surface'),
          'line-opacity': 0.95,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3.6, 14, 6, 17, 9]
        }
      });

      map.addLayer({
        id: 'street-line',
        type: 'line',
        source: 'streets',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': matchColor(),
          'line-opacity': 1,
          // flat width everywhere: weight no longer carries evidence strength,
          // colour alone (has / none of its namesake) is the map's encoding
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.8, 14, 3.4, 17, 5.6]
        }
      });

      map.addLayer({
        id: 'trees-namesake',
        type: 'circle',
        source: 'trees',
        filter: ['==', ['get', 'namesake'], 1],
        paint: {
          'circle-color': matchColor(),
          'circle-opacity': 1,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.6, 13, 4.4, 16, 7.5],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': cssVar('--surface'),
          'circle-stroke-opacity': 1
        }
      });

      mapReady = true;
      paintSelection();
      document.body.setAttribute('data-map-ready', '1');
    });

    var HIT = ['trees-namesake', 'trees-other', 'street-line'];

    map.on('mousemove', function (e) {
      var fs = map.queryRenderedFeatures(pad(e.point, 7), { layers: layersPresent(HIT) });
      map.getCanvas().style.cursor = fs.length ? 'pointer' : '';
    });

    map.on('click', function (e) {
      // generous hit area: a 2.8px line and a 4px dot are pinpoints otherwise
      var fs = map.queryRenderedFeatures(pad(e.point, 9), { layers: layersPresent(HIT) });
      if (!fs.length) { clearSelection(); return; }
      var pick = pickBy(fs, 'trees-namesake') || pickBy(fs, 'trees-other') || pickBy(fs, 'street-line');
      if (!pick) { clearSelection(); return; }
      if (pick.layer.id === 'street-line') {
        select(pick.properties.family);
      } else {
        showTreePopup(pick, e.lngLat);
        select(pick.properties.family);
      }
    });

    function pad(pt, r) {
      return [[pt.x - r, pt.y - r], [pt.x + r, pt.y + r]];
    }
    function layersPresent(ids) {
      return ids.filter(function (id) { return !!map.getLayer(id); });
    }
    function pickBy(fs, id) {
      for (var i = 0; i < fs.length; i++) if (fs[i].layer.id === id) return fs[i];
      return null;
    }
  }

  // The Maps URLs API needs no key for this action -- it just opens Street
  // View centred on a coordinate, snapping to the nearest panorama Google has.
  // https://developers.google.com/maps/documentation/urls/get-started#street-view-action
  function streetViewURL(lon, lat) {
    return 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + lat + ',' + lon;
  }

  function showTreePopup(feature, lngLat) {
    var p = feature.properties || {};
    var fam = BY_ID[p.family];
    var isNamesake = String(p.namesake) === '1';
    var klass = fam ? fam._klass : 'as-expected';

    var sci = [p.genus, p.species].filter(Boolean).join(' ');
    sci = sci ? sci.charAt(0) + sci.slice(1).toLowerCase() : '';

    // prefer the tree's own coordinate over the click point, which can land a
    // few pixels off given the generous hit-test padding on the map click handler
    var coords = feature.geometry && feature.geometry.coordinates;
    var lon = coords ? coords[0] : lngLat.lng;
    var lat = coords ? coords[1] : lngLat.lat;

    var el = h('div', {}, [
      h('span', {
        className: 'pop__badge' + (isNamesake ? '' : ' pop__badge--other'),
        style: { '--pop-c': colorFor(klass) },
        text: isNamesake ? 'Namesake tree' : 'Not the namesake'
      }),
      h('p', { className: 'pop__name', text: p.common || 'Unrecorded species' }),
      sci ? h('p', { className: 'pop__sci', text: sci }) : null,
      h('dl', { className: 'pop__facts' }, [
        h('dt', { text: 'Height' }),
        h('dd', { text: fmtMeasure(p.height, 'm') }),
        h('dt', { text: 'Trunk' }),
        h('dd', { text: fmtMeasure(p.dbh, 'cm across') })
      ]),
      h('p', {
        className: 'pop__street',
        text: 'Growing on ' + (p.famLabel || (fam && fam._streetName) || 'a tree street') +
              (fam ? ', named after the ' + String(fam._namesakeLabel).toLowerCase() + '.' : '.')
      }),
      h('a', {
        className: 'pop__sv',
        text: 'See area in Street View ↗',
        attrs: {
          href: streetViewURL(lon, lat),
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    ]);

    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '270px', offset: 12 })
      .setLngLat(lngLat)
      .setDOMContent(el)
      .addTo(map);
  }

  /* ------------------------------------------------------------------- boot */

  function fetchJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
      return r.json();
    });
  }

  function boot() {
    Promise.all([
      fetchJSON('data/streets.json'),
      fetchJSON('data/trees.json'),
      fetchJSON('data/taxa.json').catch(function () { return {}; })
    ]).then(function (res) {
      DATA.streets = res[0] || { families: [] };
      DATA.trees = res[1] || null;
      DATA.taxa = res[2] || {};

      FAMS = normalize(DATA.streets);

      renderMasthead();
      renderBoard();
      renderLegend();
      renderCityStrip();
      initMap();

      document.body.setAttribute('data-ready', '1');
    }).catch(function (err) {
      console.error(err);
      $('#standfirst').textContent = 'The tree data could not be loaded (' + err.message + ').';
      document.body.setAttribute('data-ready', 'error');
    });

    $('#backBtn').addEventListener('click', clearSelection);

    // the legend is a lot of furniture on a small map — start it folded there.
    // The citystrip has no open/closed state of its own -- CSS just hides it
    // on narrow screens (see the max-width: 900px block in style.css).
    if (isNarrow()) $('#legend').removeAttribute('open');

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && SELECTED) clearSelection();
    });

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onTheme = function () {
        repaintTheme();
        if (FAMS.length) { renderBoard(); renderLegend(); renderMasthead(); }
        if (SELECTED && BY_ID[SELECTED]) renderDetail(BY_ID[SELECTED]);
        if (SELECTED) {
          Array.prototype.forEach.call(document.querySelectorAll('.row'), function (r) {
            r.classList.toggle('is-selected', r.getAttribute('data-family') === SELECTED);
          });
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', onTheme);
      else if (mq.addListener) mq.addListener(onTheme);
    }
  }

  // expose a tiny surface for automated checks
  window.__treeStreets = {
    camera: function () {
      if (!mapReady) return null;
      var c = map.getCenter();
      return { lng: +c.lng.toFixed(5), lat: +c.lat.toFixed(5), zoom: +map.getZoom().toFixed(3) };
    },
    // screen position of a rendered tree dot, for click-target tests
    aTreePoint: function () {
      if (!mapReady) return null;
      var ids = ['trees-other', 'trees-namesake'].filter(function (l) { return !!map.getLayer(l); });
      var fs = map.queryRenderedFeatures({ layers: ids });
      if (!fs.length) return null;
      var p = map.project(fs[0].geometry.coordinates);
      return { x: Math.round(p.x), y: Math.round(p.y), family: fs[0].properties.family };
    },
    state: function () {
      var layers = ['street-casing', 'street-line', 'trees-other', 'trees-namesake'];
      return {
        families: FAMS.length,
        trees: DATA.trees ? DATA.trees.n : 0,
        selected: SELECTED,
        mapReady: mapReady,
        layers: mapReady ? layers.filter(function (id) { return !!map.getLayer(id); }) : [],
        streetFeatures: mapReady && map.getSource('streets')
          ? (map.getSource('streets')._data.features || []).length : 0,
        treeFeatures: mapReady && map.getSource('trees')
          ? (map.getSource('trees')._data.features || []).length : 0
      };
    },
    map: function () { return map; },
    select: select,
    clear: clearSelection
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
