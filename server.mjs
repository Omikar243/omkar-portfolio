import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    const requested = pathname === '/' ? '/index.html' : pathname;
    const filePath = normalize(join(root, requested));
    if (!filePath.startsWith(root)) throw new Error('Forbidden');
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Omkar portfolio listening on ${port}`));
