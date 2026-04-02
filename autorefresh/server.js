const http = require('http');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 3847;

function decompress(buf, encoding) {
  return new Promise((resolve, reject) => {
    if (encoding === 'gzip') zlib.gunzip(buf, (e, r) => e ? reject(e) : resolve(r));
    else if (encoding === 'deflate') zlib.inflate(buf, (e, r) => e ? reject(e) : resolve(r));
    else if (encoding === 'br') zlib.brotliDecompress(buf, (e, r) => e ? reject(e) : resolve(r));
    else resolve(buf);
  });
}

function proxyFetch(targetUrl, headers, depth = 0) {
  if (depth > 5) return Promise.reject(new Error('Too many redirects'));

  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;

    console.log(`  -> ${depth > 0 ? 'redirect' : 'fetch'}: ${parsed.href}`);
    console.log(`  -> headers: ${Object.keys(headers).join(', ')}`);

    // Filter out headers that Node handles or that cause issues
    const filteredHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      const lower = k.toLowerCase();
      if (lower === 'host' || lower === 'connection' || lower === 'content-length') continue;
      filteredHeaders[k] = v;
    }

    const req = mod.request(parsed, {
      method: 'GET',
      headers: filteredHeaders,
    }, (res) => {
      console.log(`  <- ${res.statusCode} ${res.headers.location || ''}`);

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, targetUrl).href;
        res.resume();
        proxyFetch(redirectUrl, headers, depth + 1).then(resolve).catch(reject);
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', async () => {
        try {
          const raw = Buffer.concat(chunks);
          const decoded = await decompress(raw, res.headers['content-encoding']);
          resolve({
            status: res.statusCode,
            body: decoded.toString('utf-8'),
          });
        } catch (e) {
          reject(new Error(`Decompress failed: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // Serve the HTML page
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Proxy endpoint
  if (req.method === 'POST' && req.url === '/proxy') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { url, headers: fwdHeaders } = JSON.parse(body);
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url' }));
          return;
        }

        const result = await proxyFetch(url, fwdHeaders || {});

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ status: result.status, body: result.body }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  AutoRefresh server running at http://localhost:${PORT}\n`);
});
