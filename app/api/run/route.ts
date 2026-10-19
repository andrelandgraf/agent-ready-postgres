import { createDev, event, FactoryError, openPr, reset, start, switchToFallback } from '@/lib/factory/actions';

export const maxDuration = 120;

type Body = { action?: unknown; name?: unknown };

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  return URL.canParse(origin) && new URL(origin).host === host;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Cross-origin request rejected' }, { status: 403 });
  const body: Body = await request.json().catch(() => ({}));
  try {
    switch (body.action) {
      case 'start':
        return Response.json({ run: await start() });
      case 'dev-branch':
        return Response.json({ branchId: await createDev() });
      case 'pr':
        return Response.json({ prNumber: await openPr() });
      case 'fallback':
        await switchToFallback();
        return Response.json({ ok: true });
      case 'event':
        if (typeof body.name !== 'string' || body.name.length > 80) {
          return Response.json({ error: 'name must be a string under 80 characters' }, { status: 400 });
        }
        await event(body.name);
        return Response.json({ ok: true });
      case 'reset':
        return Response.json({ report: await reset() });
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof FactoryError) return Response.json({ error: error.message }, { status: 409 });
    console.error(`[run ${String(body.action)}]`, error);
    return Response.json({ error: error instanceof Error ? error.message : 'Action failed' }, { status: 502 });
  }
}
