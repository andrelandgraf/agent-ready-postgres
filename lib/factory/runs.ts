import { neon } from '@neondatabase/serverless';
import { requireEnv } from '@/lib/env';

export type RunEvent = { at: string; name: string };

export type Run = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: 'running' | 'reset';
  devBranchId: string | null;
  prNumber: number | null;
  prOpenedAt: string | null;
  fallback: boolean;
  events: RunEvent[];
  screenshotAt: string | null;
};

type RunRow = {
  id: string;
  started_at: Date;
  ended_at: Date | null;
  status: 'running' | 'reset';
  dev_branch_id: string | null;
  pr_number: number | null;
  pr_opened_at: Date | null;
  fallback: boolean;
  events: RunEvent[];
  screenshot_at: Date | null;
};

const sql = () => neon(requireEnv('DATABASE_URL'));

const COLUMNS = 'id, started_at, ended_at, status, dev_branch_id, pr_number, pr_opened_at, fallback, events, screenshot_at';

function toRun(row: RunRow): Run {
  return {
    id: row.id,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at?.toISOString() ?? null,
    status: row.status,
    devBranchId: row.dev_branch_id,
    prNumber: row.pr_number,
    prOpenedAt: row.pr_opened_at?.toISOString() ?? null,
    fallback: row.fallback,
    events: row.events,
    screenshotAt: row.screenshot_at?.toISOString() ?? null,
  };
}

function isRunRow(value: unknown): value is RunRow {
  return typeof value === 'object' && value !== null && 'id' in value && 'status' in value;
}

function one(rows: unknown[]): Run | null {
  const [row] = rows;
  return isRunRow(row) ? toRun(row) : null;
}

export async function currentRun(): Promise<Run | null> {
  return one(await sql().query(`select ${COLUMNS} from runs where status = 'running' limit 1`));
}

export async function recentRuns(limit: number): Promise<Run[]> {
  const rows = await sql().query(`select ${COLUMNS} from runs order by started_at desc limit $1`, [limit]);
  return rows.filter(isRunRow).map(toRun);
}

export async function startRun(): Promise<Run> {
  const id = crypto.randomUUID();
  const run = one(
    await sql().query(
      `insert into runs (id, events) values ($1, jsonb_build_array(jsonb_build_object('at', now(), 'name', 'started'))) returning ${COLUMNS}`,
      [id],
    ),
  );
  if (!run) throw new Error('Could not start a run');
  return run;
}

export async function recordEvent(runId: string, name: string): Promise<void> {
  await sql().query(
    `update runs set events = events || jsonb_build_array(jsonb_build_object('at', now(), 'name', $2::text)) where id = $1`,
    [runId, name],
  );
}

export async function setDevBranch(runId: string, branchId: string): Promise<void> {
  await sql().query(`update runs set dev_branch_id = $2 where id = $1`, [runId, branchId]);
}

export async function setPr(runId: string, prNumber: number): Promise<void> {
  await sql().query(`update runs set pr_number = $2, pr_opened_at = now() where id = $1`, [runId, prNumber]);
}

export async function setFallback(runId: string): Promise<void> {
  await sql().query(`update runs set fallback = true where id = $1`, [runId]);
}

export async function endRun(runId: string): Promise<void> {
  await sql().query(`update runs set status = 'reset', ended_at = now() where id = $1`, [runId]);
}

export async function saveScreenshot(runId: string, png: Uint8Array): Promise<void> {
  await sql().query(
    `update runs set screenshot_png_base64 = $2, screenshot_at = now() where id = $1`,
    [runId, Buffer.from(png).toString('base64')],
  );
}

export async function loadScreenshot(runId: string): Promise<Buffer | null> {
  const rows = await sql().query(`select screenshot_png_base64 from runs where id = $1`, [runId]);
  const [row] = rows;
  if (typeof row !== 'object' || row === null || !('screenshot_png_base64' in row)) return null;
  return typeof row.screenshot_png_base64 === 'string'
    ? Buffer.from(row.screenshot_png_base64, 'base64')
    : null;
}
