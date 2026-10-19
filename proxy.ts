import { NextResponse, type NextRequest } from 'next/server';

// The dashboard holds Neon and GitHub credentials server-side, so every page and
// route sits behind one shared password. The screenshot upload checks its own token.
export function proxy(request: NextRequest) {
  if (request.method === 'POST' && request.nextUrl.pathname === '/api/screenshot') {
    return NextResponse.next();
  }
  const password = process.env.FACTORY_PASSWORD;
  if (!password) return new NextResponse('FACTORY_PASSWORD is not set', { status: 500 });
  const header = request.headers.get('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [, given] = atob(encoded).split(':');
    if (given === password) return NextResponse.next();
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'www-authenticate': 'Basic realm="Software Factory"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
