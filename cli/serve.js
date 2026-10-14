// Tiny static file server for local development: node cli/serve.js [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.argv[2]) || 8765;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
// Only these top-level locations are served (never docs/reference material).
const allowed = ['index.html', 'js', 'css', 'data'];

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const abs = resolve(join(root, normalize(p)));
    const rel = abs.slice(root.length + 1);
    if (!abs.startsWith(root + sep) || !allowed.includes(rel.split(sep)[0])) { res.writeHead(404).end('not found'); return; }
    const body = await readFile(abs);
    res.writeHead(200, { 'content-type': types[extname(abs)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Safetytool on http://127.0.0.1:${port}/`));
