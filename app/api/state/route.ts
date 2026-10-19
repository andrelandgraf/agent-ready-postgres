import { connection } from 'next/server';
import { factoryState } from '@/lib/factory/state';

export async function GET() {
  await connection();
  try {
    return Response.json(await factoryState(), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[state]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'State failed' }, { status: 502 });
  }
}
