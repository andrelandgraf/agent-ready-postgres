import { timingSafeEqual } from 'node:crypto';
import { currentRun, recordEvent, saveScreenshot } from '@/lib/factory/runs';
import { requireEnv } from '@/lib/env';

const MAX_BYTES = 5 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

function authorized(request: Request): boolean {
  const expected = Buffer.from(`Bearer ${requireEnv('FACTORY_TOKEN')}`);
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** The e2e agent uploads its one PNG here; it becomes the current run's screenshot. */
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const run = await currentRun();
  if (!run) return Response.json({ error: 'No run in progress' }, { status: 409 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return Response.json({ error: 'Body must be a PNG under 5 MB' }, { status: 400 });
  }
  if (!PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) {
    return Response.json({ error: 'Body is not a PNG' }, { status: 400 });
  }
  await saveScreenshot(run.id, bytes);
  await recordEvent(run.id, 'screenshot uploaded');
  return Response.json({ runId: run.id });
}
