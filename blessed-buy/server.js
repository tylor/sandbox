import express from 'express';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright-core';
import { transformText } from './transform.js';

const PORT = process.env.PORT || 3737;
const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const UPSTREAM = 'https://www.bestbuy.ca';
const ANCHOR_URL = UPSTREAM + '/en-ca';

let browser, context, fetcherPage;
let initError = null;

async function init() {
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (err) {
    initError = `Cannot connect to Chrome at ${CDP_URL}. Launch Chrome with: open -a "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir="$HOME/.bb-chrome"`;
    console.error(initError);
    return;
  }
  context = browser.contexts()[0] || (await browser.newContext());

  // Find an existing tab on bestbuy or open one.
  const pages = context.pages();
  fetcherPage = pages.find((p) => p.url().includes('bestbuy.ca'));
  if (!fetcherPage) {
    fetcherPage = await context.newPage();
    console.log('Navigating fetcher tab to', ANCHOR_URL, '— solve any Akamai/captcha there.');
    try {
      await fetcherPage.goto(ANCHOR_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    } catch (err) {
      console.warn('Initial nav warning:', err.message);
    }
  } else {
    console.log('Using existing bestbuy.ca tab:', fetcherPage.url());
  }
}

// Run a fetch inside the page (same-origin, real Chrome network stack).
async function browserFetch(url, { method = 'GET', headers = {}, body = null } = {}) {
  if (!fetcherPage) throw new Error(initError || 'fetcher not ready');
  // Make sure tab is on bestbuy (if user navigated away, re-anchor).
  if (!fetcherPage.url().includes('bestbuy.ca')) {
    await fetcherPage.goto(ANCHOR_URL, { waitUntil: 'domcontentloaded' });
  }
  return await fetcherPage.evaluate(
    async ({ url, method, headers, body }) => {
      const r = await fetch(url, {
        method,
        headers,
        body,
        credentials: 'include',
        redirect: 'follow',
      });
      const buf = new Uint8Array(await r.arrayBuffer());
      // base64 encode in chunks
      let bin = '';
      const CH = 0x8000;
      for (let i = 0; i < buf.length; i += CH) {
        bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
      }
      return {
        status: r.status,
        url: r.url,
        contentType: r.headers.get('content-type') || '',
        body: btoa(bin),
      };
    },
    { url, method, headers, body }
  );
}

// Serialize requests through one page to avoid evaluate clobber.
let queue = Promise.resolve();
function enqueue(fn) {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

function rewriteUrls(text) {
  return text
    .replaceAll('https://www.bestbuy.ca', '')
    .replaceAll('http://www.bestbuy.ca', '')
    .replaceAll('//www.bestbuy.ca', '');
}

function transformHtml(html) {
  const $ = cheerio.load(html, { decodeEntities: false });

  $('title').each((_, el) => $(el).text(transformText($(el).text())));
  $('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]').each((_, el) => {
    const c = $(el).attr('content');
    if (c) $(el).attr('content', transformText(c));
  });

  function walk(node) {
    node.children?.forEach((child) => {
      if (child.type === 'text') {
        const t = child.data;
        if (t && t.trim()) child.data = transformText(t);
      } else if (child.type === 'tag' && child.name !== 'script' && child.name !== 'style') {
        for (const a of ['alt', 'title', 'placeholder', 'aria-label', 'value']) {
          if (child.attribs?.[a]) $(child).attr(a, transformText(child.attribs[a]));
        }
        walk(child);
      }
    });
  }
  walk($.root()[0]);

  const banner = `<div style="position:sticky;top:0;z-index:99999;background:linear-gradient(90deg,#3b1d6e,#7c4ddb);color:#ffd700;font-family:Georgia,serif;text-align:center;padding:6px 12px;font-size:14px;letter-spacing:0.5px;border-bottom:2px solid #ffd700;">✝︎ BlessedBuy.ca — Sacred Tech for the Faithful ✝︎</div>`;
  $('body').prepend(banner);
  $('img[alt*="Best Buy" i]').attr('alt', 'BlessedBuy');

  // Transform JSON-typed script tags (Next.js __NEXT_DATA__, schema.org ld+json, etc).
  $('script').each((_, el) => {
    const type = ($(el).attr('type') || '').toLowerCase();
    const id = $(el).attr('id') || '';
    const isJsonScript =
      type.includes('json') ||
      id === '__NEXT_DATA__' ||
      id === '__NUXT_DATA__';
    if (!isJsonScript) return;
    const raw = $(el).html();
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      const visit = (v) => {
        if (typeof v === 'string') return transformText(v);
        if (Array.isArray(v)) return v.map(visit);
        if (v && typeof v === 'object') {
          const o = {};
          for (const k of Object.keys(v)) o[k] = visit(v[k]);
          return o;
        }
        return v;
      };
      $(el).text(JSON.stringify(visit(obj)));
    } catch {
      // not parseable — skip rather than corrupt
    }
  });

  return rewriteUrls($.html());
}

function transformJson(text) {
  try {
    const obj = JSON.parse(text);
    const visit = (v) => {
      if (typeof v === 'string') return transformText(v);
      if (Array.isArray(v)) return v.map(visit);
      if (v && typeof v === 'object') {
        const o = {};
        for (const k of Object.keys(v)) o[k] = visit(v[k]);
        return o;
      }
      return v;
    };
    return rewriteUrls(JSON.stringify(visit(obj)));
  } catch {
    return rewriteUrls(transformText(text));
  }
}

const app = express();
app.use(express.raw({ type: '*/*', limit: '10mb' }));

app.all(/.*/, async (req, res) => {
  if (initError) {
    res.status(503).type('text/html').send(`<pre>${initError}</pre>`);
    return;
  }

  const targetUrl = UPSTREAM + req.originalUrl;
  // Strip hop-by-hop / problematic headers; pass through accept etc.
  const fwdHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const lk = k.toLowerCase();
    if (['host', 'connection', 'content-length', 'cookie', 'origin', 'referer'].includes(lk)) continue;
    if (typeof v === 'string') fwdHeaders[k] = v;
  }

  const bodyB64 =
    req.body && req.body.length
      ? Buffer.from(req.body).toString('base64')
      : null;

  let result;
  try {
    result = await enqueue(() =>
      browserFetch(targetUrl, {
        method: req.method,
        headers: fwdHeaders,
        body: bodyB64 ? Uint8Array.from(Buffer.from(bodyB64, 'base64')) : null,
      })
    );
  } catch (err) {
    res.status(502).type('text/plain').send('Browser fetch failed: ' + err.message);
    return;
  }

  const buf = Buffer.from(result.body, 'base64');
  const ct = result.contentType.toLowerCase();
  const isHtml = ct.includes('text/html');
  const isJson = ct.includes('application/json') || ct.includes('+json');
  const isCss = ct.includes('text/css');
  const isJs = ct.includes('javascript');

  res.status(result.status);
  if (result.contentType) res.setHeader('content-type', result.contentType);

  if (isHtml) {
    let html = buf.toString('utf8');
    if (result.status === 403 && /Access Denied|Reference #/i.test(html)) {
      res.status(200).send(
        `<!doctype html><h1>Akamai still blocking</h1><p>Open <a href="${ANCHOR_URL}">${ANCHOR_URL}</a> in your CDP-debugged Chrome and pass any challenge, then reload.</p>`
      );
      return;
    }
    res.type('text/html; charset=utf-8').send(transformHtml(html));
    return;
  }
  if (isJson) {
    res.send(transformJson(buf.toString('utf8')));
    return;
  }
  if (isCss || isJs) {
    res.send(rewriteUrls(buf.toString('utf8')));
    return;
  }
  res.send(buf);
});

await init();
app.listen(PORT, () => {
  console.log(`BlessedBuy CDP proxy on http://localhost:${PORT}`);
});
