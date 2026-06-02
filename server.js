// Zero-dependency static server for local preview of the built site.
//
// Usage:
//   node build.js && node server.js     (or: npm run dev)
// Serves dist/ exactly as Cloudflare Pages would. Production needs no server —
// Pages hosts the static dist/ directly. For a Pages-accurate preview you can
// also use `npx wrangler pages dev dist`.

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, dirname, normalize, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, 'dist');
const PORT = process.env.PORT || 3456;
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    // Resolve safely within ROOT to prevent path traversal.
    let rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(ROOT, rel);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

    let info;
    try {
      info = await stat(filePath);
      if (info.isDirectory()) { filePath = join(filePath, 'index.html'); }
    } catch {
      // Fall back to SPA-style index.html for unknown routes.
      filePath = join(ROOT, 'index.html');
    }

    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(500);
    res.end('Internal error: ' + err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`OpenBenchmark preview: http://${HOST}:${PORT}  (serving ${ROOT})`);
  console.log('If you see "Internal error", run `node build.js` first to generate dist/.');
});
