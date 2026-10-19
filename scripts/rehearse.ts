// Runs the real steps of the demo without the dashboard and times them:
// start, dev branch, PR, preview workflow, optionally the Copilot e2e agent, then reset.
//   bun run rehearse          real steps, no e2e agent
//   bun run rehearse --e2e    also runs ./scripts/e2e --headless (spends Copilot credits)
import { spawnSync } from 'node:child_process';
import { createDev, openPr, reset, start } from '@/lib/factory/actions';
import { listBranches } from '@/lib/factory/neon';
import { pullRequestState } from '@/lib/factory/github';
import { currentRun } from '@/lib/factory/runs';

const withE2e = process.argv.includes('--e2e');
const t0 = Date.now();
const marks: [string, number][] = [];
const mark = (name: string) => {
  marks.push([name, Date.now() - t0]);
  console.log(`+${((Date.now() - t0) / 1000).toFixed(1)}s  ${name}`);
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(name: string, check: () => Promise<boolean>, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for: ${name}`);
    await sleep(2000);
  }
  mark(name);
}

try {
  await start();
  mark('run started');
  const devId = await createDev();
  await until('dev branch ready', async () => (await listBranches()).some((b) => b.id === devId && b.state === 'ready'), 60_000);
  const pr = await openPr();
  mark(`PR #${pr} opened`);
  await until('preview branch created', async () => (await listBranches()).some((b) => b.name === `preview/pr-${pr}`), 180_000);
  let conclusion: string | null = null;
  await until('preview workflow completed', async () => {
    const state = await pullRequestState(pr);
    conclusion = state.workflow?.status === 'completed' ? state.workflow.conclusion : null;
    return conclusion !== null && state.previewUrl !== null;
  }, 600_000);
  if (conclusion !== 'success') throw new Error(`Preview workflow concluded ${conclusion}`);
  if (withE2e) {
    const result = spawnSync('./scripts/e2e', ['--headless'], { stdio: 'inherit', env: { ...process.env, COPILOT_ALLOW_ALL: 'true' } });
    if (result.status !== 0) throw new Error(`e2e exited ${result.status}`);
    const run = await currentRun();
    if (!run?.screenshotAt) throw new Error('e2e finished without uploading a screenshot');
    mark('e2e screenshot uploaded');
  }
} finally {
  const report = await reset();
  mark(`reset (closed ${report.closedPrs.map((n) => `#${n}`).join(', ') || 'nothing'}, deleted ${report.deletedBranches.join(', ') || 'no branches'})`);
}
