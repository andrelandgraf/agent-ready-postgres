import { NextResponse, type NextRequest } from 'next/server';

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The API holds Neon, GitHub, and Vercel credentials server-side, so every API route
// needs the dashboard password as a bearer token. Pages carry no data and stay public.
// The screenshot upload checks its own token.
export function proxy(request: NextRequest) {
  if (request.method === 'POST' && request.nextUrl.pathname === '/api/screenshot') {
    return NextResponse.next();
  }
  const password = process.env.FACTORY_PASSWORD;
  if (!password) return NextResponse.json({ error: 'FACTORY_PASSWORD is not set' }, { status: 500 });
  const header = request.headers.get('authorization') ?? '';
  if (header.startsWith('Bearer ') && constantTimeEqual(header.slice('Bearer '.length), password)) {
    return NextResponse.next();
  }
  return NextResponse.json({ error: 'Wrong or missing dashboard password' }, { status: 401 });
}

export const config = {
  matcher: ['/api/:path*'],
};
