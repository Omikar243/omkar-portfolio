import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { forwardContact } from './contact-delivery.js';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
};

const readRequestBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 20000) reject(new Error('payload_too_large'));
  });
  req.on('end', () => resolve(body));
  req.on('error', reject);
});

const handler = async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'portfolio-api' });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/contact') {
    try {
      const body = JSON.parse(await readRequestBody(req));
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();
      const message = String(body.message || '').trim();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || name.length > 120 || !validEmail || email.length > 240 || !message || message.length > 5000) {
        sendJson(res, 400, { ok: false, message: 'Please send a name, a valid email, and a message under 5,000 characters.' });
        return;
      }
      if (String(body._honey || '').trim()) {
        sendJson(res, 400, { ok: false, message: 'Unable to accept this submission.' });
        return;
      }
      const result = await forwardContact({ name, email, message }, fetch, {
        Origin: 'https://omkar-v-shettigar.vercel.app',
        Referer: 'https://omkar-v-shettigar.vercel.app/',
      });
      sendJson(res, result.ok ? 200 : result.code === 'activation_required' ? 503 : 502, result);
    } catch (error) {
      const status = error.message === 'payload_too_large' ? 413 : error instanceof SyntaxError ? 400 : 502;
      sendJson(res, status, { ok: false, message: status === 413 ? 'That note is too large to send.' : 'Email delivery could not be confirmed. Your note has not been marked as sent. Please try again later. Your text has not been marked as delivered.' });
    }
    return;
  }

  if (pathname === '/data' || pathname.startsWith('/data/') || pathname.startsWith('/api/') || pathname.split('/').some(part => part.startsWith('.')) || ['/server.mjs', '/vercel.json'].includes(pathname)) {
    sendJson(res, 404, { ok: false, message: 'Not found' });
    return;
  }

  try {
    const requested = pathname === '/' ? '/index.html' : pathname;
    const filePath = normalize(join(root, requested));
    const publicFallback = normalize(join(root, 'public', requested.replace(/^\/+/, '')));
    if (!filePath.startsWith(root) || !publicFallback.startsWith(root)) throw new Error('Forbidden');
    let resolvedPath = filePath;
    let file;
    try {
      file = await readFile(resolvedPath);
    } catch {
      resolvedPath = publicFallback;
      file = await readFile(resolvedPath);
    }
    const headers = { 'Content-Type': types[extname(resolvedPath)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' };
    if (extname(resolvedPath) === '.pdf') headers['Content-Disposition'] = 'attachment; filename="Omkar_Shettigar_Resume.pdf"';
    res.writeHead(200, headers);
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
};

export default handler;

if (!process.env.VERCEL) {
  createServer(handler).listen(port, '0.0.0.0', () => console.log(`Omkar portfolio listening on ${port}`));
}
