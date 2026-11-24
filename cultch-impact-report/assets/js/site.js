import {
  TAGS, SHOWS, CONNECTS_ORGS, STAFF, BOARD, RESTAURANTS, REVENUE,
  PANTO_SPONSORS, FOUNDATIONS, DONOR_CIRCLES, TRIBUTES
} from './data.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Highlight every occurrence of `q` inside `text`, HTML-escaped. */
function mark(text, q) {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) +
    '</mark>' + esc(text.slice(i + q.length));
}

/* ==========================================================================
   Season explorer
   ========================================================================== */
const seasonRoot = $('#seasonRoot');
const showList   = $('#showList');
const chipsWrap  = $('#seasonChips');
const statusEl   = $('#seasonStatus');
const emptyEl    = $('#seasonEmpty');
const active     = new Set();

/* A show's chip label: the premiere tag prints its specific wording. */
const tagLabel = (show, key) =>
  key === 'premiere' ? (show.premiereKind || 'Premiere') : TAGS[key].label;

function buildShows() {
  showList.innerHTML = SHOWS.map((s, i) => {
    const chips = s.tags.map((t) => `
      <span class="vchip" style="background:${TAGS[t].color}; color:${TAGS[t].ink}"
            >${esc(tagLabel(s, t))}</span>`).join('');

    const tagPills = s.tags.length
      ? `<div class="taglist">${s.tags.map((t) =>
          `<span style="background:${TAGS[t].color}; color:${TAGS[t].ink}">${esc(tagLabel(s, t))}</span>`
        ).join('')}</div>`
      : '<span style="color:var(--ink-60)">—</span>';

    const origin = s.origin ? ` <span style="color:var(--ink-60)">(${esc(s.origin)})</span>` : '';

    return `
    <li class="show" data-i="${i}" data-tags="${s.tags.join(' ')}">
      <button class="show__btn" type="button" aria-expanded="false" aria-controls="panel-${i}">
        <span class="show__tagstack">${chips}</span>
        <span class="show__main">
          <span class="show__title">${esc(s.title)}</span>
          <span class="show__company">${esc(s.company)}${origin}</span>
        </span>
        <span class="show__when">
          ${esc(s.dates)}
          <span class="show__venue">${esc(s.venue)}</span>
        </span>
        <span class="show__toggle" aria-hidden="true"></span>
      </button>
      <div class="show__panel" id="panel-${i}">
        <div>
          <div class="show__detail">
            <dl class="dl">
              <dt>Company</dt>
              <dd>${esc(s.company)}${s.origin ? ` — ${esc(s.origin)}` : ''}</dd>
            </dl>
            <dl class="dl">
              <dt>Run</dt>
              <dd>${esc(s.dates)} · ${esc(s.venue)}</dd>
            </dl>
            <dl class="dl">
              <dt>Categories</dt>
              <dd>${tagPills}</dd>
            </dl>
            ${s.note ? `<dl class="dl" style="grid-column:1/-1"><dt>Presentation</dt><dd>${esc(s.note)}</dd></dl>` : ''}
          </div>
        </div>
      </div>
    </li>`;
  }).join('');

  showList.addEventListener('click', (e) => {
    const btn = e.target.closest('.show__btn');
    if (!btn) return;
    const li = btn.closest('.show');
    const open = li.dataset.open === 'true';
    li.dataset.open = open ? 'false' : 'true';
    btn.setAttribute('aria-expanded', String(!open));
  });
}

function buildChips() {
  const counts = {};
  for (const k of Object.keys(TAGS)) counts[k] = SHOWS.filter((s) => s.tags.includes(k)).length;

  chipsWrap.innerHTML = `
    <button class="chip" type="button" data-tag="" aria-pressed="true">All
      <span class="chip__count">${SHOWS.length}</span></button>` +
    Object.entries(TAGS).filter(([k]) => counts[k] > 0).map(([k, t]) => `
      <button class="chip" type="button" data-tag="${k}" aria-pressed="false"
              style="--chip:${t.color}; --chip-ink:${t.ink}">
        <span class="chip__swatch"></span>${esc(t.label)}
        <span class="chip__count">${counts[k]}</span>
      </button>`).join('');

  chipsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    const tag = btn.dataset.tag;
    if (!tag) active.clear();
    else if (active.has(tag)) active.delete(tag);
    else active.add(tag);
    applyFilter();
  });
}

function applyFilter() {
  $$('.chip', chipsWrap).forEach((c) => {
    const on = c.dataset.tag ? active.has(c.dataset.tag) : active.size === 0;
    c.setAttribute('aria-pressed', String(on));
  });

  let shown = 0;
  SHOWS.forEach((s, i) => {
    const hit = active.size === 0 || s.tags.some((t) => active.has(t));
    if (hit) shown++;
    const li = showList.children[i];
    li.hidden = !hit;
    if (!hit) { li.dataset.open = 'false'; $('.show__btn', li).setAttribute('aria-expanded', 'false'); }
    const row = $(`.tl__row[data-i="${i}"]`);
    if (row) row.hidden = !hit;
  });

  statusEl.textContent = active.size === 0
    ? `Showing all ${SHOWS.length}`
    : `Showing ${shown} of ${SHOWS.length}`;
  emptyEl.hidden = shown > 0;
}

/* ---------- timeline view ---------- */
const TL_START = new Date('2025-10-01').getTime();
const TL_END   = new Date('2026-06-30').getTime();
const TL_SPAN  = TL_END - TL_START;
const MONTHS   = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function buildTimeline() {
  $('#tlAxis').innerHTML = '<span></span>' +
    MONTHS.map((m) => `<span class="tl__month">${m}</span>`).join('');

  $('#tlRows').innerHTML = SHOWS.map((s, i) => {
    const a = new Date(s.start).getTime();
    const b = new Date(s.end).getTime();
    const left  = ((a - TL_START) / TL_SPAN) * 100;
    const width = Math.max(((b - a) / TL_SPAN) * 100, 1.4);
    const key   = s.tags[0];
    const bg    = key ? TAGS[key].color : 'var(--teal)';
    const ink   = key ? TAGS[key].ink : '#fff';
    return `
      <div class="tl__row" data-i="${i}">
        <span class="tl__row-label">${esc(s.title)}</span>
        <span class="tl__track">
          <button class="tl__bar" type="button" data-i="${i}"
                  style="left:${left}%; width:${width}%; background:${bg}; color:${ink}"
                  title="${esc(s.title)} — ${esc(s.dates)}, ${esc(s.venue)}">
            <span class="sr-only">${esc(s.title)}, ${esc(s.dates)}, ${esc(s.venue)}</span>
          </button>
        </span>
      </div>`;
  }).join('');

  /* Selecting a bar drops you into the list view with that show opened. */
  $('#tlRows').addEventListener('click', (e) => {
    const bar = e.target.closest('.tl__bar');
    if (!bar) return;
    setView('list');
    const li = showList.children[+bar.dataset.i];
    li.dataset.open = 'true';
    $('.show__btn', li).setAttribute('aria-expanded', 'true');
    li.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
    $('.show__btn', li).focus({ preventScroll: true });
  });
}

function setView(v) {
  seasonRoot.dataset.view = v;
  $$('.viewbtn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
}
$$('.viewbtn').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

/* ==========================================================================
   Revenue pie
   ========================================================================== */
function buildRevenue() {
  const svg = $('#donut');
  const wrap = $('#revenue');
  const cx = 120, cy = 120, r = 100;
  const NS = 'http://www.w3.org/2000/svg';
  let angle = -90;

  REVENUE.forEach((seg, i) => {
    const sweep = (seg.pct / 100) * 360;
    const a0 = (angle * Math.PI) / 180;
    const a1 = ((angle + sweep) * Math.PI) / 180;
    const mid = ((angle + sweep / 2) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = sweep > 180 ? 1 : 0;

    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`);
    p.setAttribute('fill', seg.color);
    p.setAttribute('class', 'donut__seg');
    p.setAttribute('tabindex', '0');
    p.setAttribute('role', 'button');
    p.setAttribute('aria-label', `${seg.pct} percent — ${seg.label}`);
    p.dataset.i = i;
    p.style.setProperty('--tx', `${Math.cos(mid) * 9}px`);
    p.style.setProperty('--ty', `${Math.sin(mid) * 9}px`);
    svg.appendChild(p);
    angle += sweep;
  });

  $('#revLegend').innerHTML = REVENUE.map((s, i) => `
    <li>
      <button type="button" data-i="${i}">
        <span class="legend__dot" style="background:${s.color}"></span>
        <span class="legend__pct">${s.pct}%</span>
        <span class="legend__lab">${esc(s.label)}</span>
      </button>
    </li>`).join('');

  const setActive = (i) => {
    wrap.dataset.hover = i === null ? 'false' : 'true';
    $$('.donut__seg', svg).forEach((p) => p.dataset.active = String(+p.dataset.i === i));
    $$('#revLegend button').forEach((b) => {
      b.style.paddingLeft = +b.dataset.i === i ? '0.8rem' : '';
    });
  };

  const bind = (el) => {
    el.addEventListener('mouseenter', () => setActive(+el.dataset.i));
    el.addEventListener('focus', () => setActive(+el.dataset.i));
    el.addEventListener('mouseleave', () => setActive(null));
    el.addEventListener('blur', () => setActive(null));
  };
  $$('.donut__seg', svg).forEach(bind);
  $$('#revLegend button').forEach(bind);
}

/* ==========================================================================
   Searchable lists
   ========================================================================== */
function buildOrgs() {
  const list = $('#orgList');
  const input = $('#orgSearch');
  const clear = $('#orgClear');
  const empty = $('#orgEmpty');

  const render = (q = '') => {
    let n = 0;
    list.innerHTML = CONNECTS_ORGS.map((o) => {
      const hit = o.toLowerCase().includes(q.toLowerCase());
      if (hit) n++;
      return `<li${hit ? '' : ' hidden'}>${mark(o, q)}</li>`;
    }).join('');
    empty.hidden = n > 0;
    clear.hidden = !q;
  };
  render();

  input.addEventListener('input', () => render(input.value.trim()));
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
}

function buildDonors() {
  const wall = $('#donorWall');
  const input = $('#donorSearch');
  const clear = $('#donorClear');
  const empty = $('#donorEmpty');
  const status = $('#donorStatus');
  const total = DONOR_CIRCLES.reduce((a, c) => a + c.people.length, 0);

  const render = (q = '') => {
    let n = 0;
    wall.innerHTML = DONOR_CIRCLES.map((c) => {
      const hits = c.people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
      n += hits.length;
      if (!hits.length) return '';
      return `
        <section class="circle-block">
          <div class="circle-block__head">
            <h3 class="h-sub">${esc(c.name)}</h3>
            ${c.range ? `<span class="circle-block__range">${esc(c.range)}</span>` : ''}
          </div>
          <hr class="rule rule--short">
          <ul class="namelist" style="columns:1">
            ${hits.map((p) => `<li>${mark(p.name, q)}${p.monthly
              ? '<span class="monthly-dot" title="Monthly donor"></span>' : ''}</li>`).join('')}
          </ul>
        </section>`;
    }).join('');
    empty.hidden = n > 0;
    clear.hidden = !q;
    status.textContent = q ? `${n} of ${total} listed names` : `${total} names listed`;
  };
  render();

  input.addEventListener('input', () => render(input.value.trim()));
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
}

function buildSimpleLists() {
  $('#staffList').innerHTML = STAFF
    .map(([n, role]) => `<li><b>${esc(n)}</b>, <span>${esc(role)}</span></li>`).join('');
  $('#boardList').innerHTML = BOARD
    .map(([n, role]) => `<li><b>${esc(n)}</b>, <span>${esc(role)}</span></li>`).join('');
  $('#restaurantList').innerHTML = RESTAURANTS.map((n) => `<li>${esc(n)}</li>`).join('');
  $('#pantoList').innerHTML = PANTO_SPONSORS.map((n) => `<li>${esc(n)}</li>`).join('');
  $('#foundationList').innerHTML = FOUNDATIONS.map((n) => `<li>${esc(n)}</li>`).join('');
  $('#tributeList').innerHTML = TRIBUTES.map((n) => `<li>${esc(n)}</li>`).join('');
}

/* ==========================================================================
   Count-up numbers
   ========================================================================== */
function initCounters() {
  const els = $$('.circle__num[data-count]');
  els.forEach((el) => { el.dataset.final = el.textContent; });

  if (REDUCED) return;

  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const run = (el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const grouped = el.dataset.final.includes(',');
    const dur = 1400;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      const v = Math.round(target * easeOut(t));
      el.textContent = (grouped ? v.toLocaleString('en-CA') : String(v)) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = el.dataset.final;
    };
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      run(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

/* ==========================================================================
   Reveal on scroll
   ========================================================================== */
function initReveal() {
  const els = $$('.reveal');
  if (REDUCED || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.dataset.shown = 'true');
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.dataset.shown = 'true';
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  els.forEach((el) => io.observe(el));
}

/* ==========================================================================
   Rail, scrollspy, masthead, parallax
   ========================================================================== */
function initScrollUI() {
  const sections = $$('section[data-page]');
  const railProgress = $('#railProgress');
  const railPage = $('#railPage');
  const topFill = $('#topbarFill');
  const masthead = $('#masthead');
  const navLinks = $$('#mastNav a');
  const dots = $('#railDots');
  const parallax = $$('[data-parallax]');

  dots.innerHTML = sections.map((s) => `
    <button class="rail__dot" type="button" data-id="${s.id}"
            aria-current="false" title="${esc(s.dataset.nav)}">
      <span class="sr-only">${esc(s.dataset.nav)}</span>
    </button>`).join('');
  dots.addEventListener('click', (e) => {
    const b = e.target.closest('.rail__dot');
    if (b) $('#' + b.dataset.id).scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  });
  const dotEls = $$('.rail__dot', dots);

  let lastY = 0, ticking = false;

  const update = () => {
    ticking = false;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? Math.min(y / max, 1) : 0;

    railProgress.style.height = (pct * 100) + '%';
    topFill.style.width = (pct * 100) + '%';

    /* current section = the last one whose top sits above 45% of the viewport */
    let current = sections[0];
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= innerHeight * 0.45) current = s;
    }
    railPage.textContent = current.dataset.page;
    dotEls.forEach((d) => d.setAttribute('aria-current', String(d.dataset.id === current.id)));
    navLinks.forEach((a) =>
      a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + current.id)));

    masthead.dataset.scrolled = String(y > 8);
    masthead.dataset.hidden = String(y > 400 && y > lastY);
    lastY = y;

    if (!REDUCED) {
      for (const el of parallax) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const mid = r.top + r.height / 2 - innerHeight / 2;
        const img = el.querySelector('img');
        if (img) img.style.transform =
          `translate3d(0, ${(-mid * +el.dataset.parallax).toFixed(1)}px, 0) scale(1.14)`;
      }
    }
  };

  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener('resize', update, { passive: true });
  update();
}

/* ==========================================================================
   Go
   ========================================================================== */
buildShows();
buildChips();
buildTimeline();
applyFilter();
buildRevenue();
buildOrgs();
buildDonors();
buildSimpleLists();
initCounters();
initReveal();
initScrollUI();
