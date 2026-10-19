import { connection } from 'next/server';
import { RateLimited } from '@/lib/factory/github';
import { factoryState } from '@/lib/factory/state';

export async function GET() {
  await connection();
  try {
    return Response.json(await factoryState(), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof RateLimited) {
      return Response.json({ error: error.message, retryAt: error.retryAt }, { status: 429 });
    }
    console.error('[state]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'State failed' }, { status: 502 });
  }
}
