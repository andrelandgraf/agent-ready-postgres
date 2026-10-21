// Serves docs/ for practicing the talk: http://127.0.0.1:4826 opens practice.html.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../docs', import.meta.url)));
const port = Number(process.env.PORT ?? 4826);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const path = resolve(root, `.${decodeURIComponent(pathname === '/' ? '/practice.html' : pathname)}`);
  if (path !== root && !path.startsWith(root + sep)) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(path);
    // Edits to talk.md and the deck must show up on the next poll.
    response.writeHead(200, {
      'content-type': types[extname(path)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Practice view: http://127.0.0.1:${port}`);
});
