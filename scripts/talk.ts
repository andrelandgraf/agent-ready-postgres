// Serves docs/ for practicing the talk: http://127.0.0.1:4826 opens practice.html.
import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '../docs');
const port = Number(process.env.PORT ?? 4826);

Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const path = resolve(root, `.${decodeURIComponent(pathname === '/' ? '/practice.html' : pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) return new Response('Not found', { status: 404 });
    const file = Bun.file(path);
    if (!(await file.exists())) return new Response('Not found', { status: 404 });
    // Edits to talk.md and the deck must show up on the next poll.
    return new Response(file, { headers: { 'cache-control': 'no-store' } });
  },
});

console.log(`Practice view: http://127.0.0.1:${port}`);
