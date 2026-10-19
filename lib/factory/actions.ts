import { FACTORY } from './config';
import {
  cancelWorkflows,
  closePullRequest,
  closedDemoPullRequests,
  openDemoPullRequests,
  openPullRequest,
  previewUrlFor,
} from './github';
import { createDevBranch, deleteBranch, listBranches } from './neon';
import { currentRun, endRun, recordEvent, setDevBranch, setFallback, setPr, startRun, type Run } from './runs';
import { deleteDeployment } from './vercel';

export class FactoryError extends Error {}

async function requireRun(): Promise<Run> {
  const run = await currentRun();
  if (!run) throw new FactoryError('No run in progress. Drag the card into To do to start one.');
  return run;
}

export async function start(): Promise<Run> {
  if (await currentRun()) throw new FactoryError('A run is already in progress. Reset first.');
  const open = await openDemoPullRequests();
  if (open.length > 0) throw new FactoryError(`PR #${open.join(', #')} from ${FACTORY.headBranch} is still open. Reset first.`);
  const branches = await listBranches();
  if (branches.some((b) => b.name === FACTORY.devBranchName)) {
    throw new FactoryError(`${FACTORY.devBranchName} still exists. Reset first.`);
  }
  return startRun();
}

export async function createDev(): Promise<string> {
  const run = await requireRun();
  if (run.devBranchId) return run.devBranchId;
  const id = await createDevBranch();
  await setDevBranch(run.id, id);
  await recordEvent(run.id, 'dev branch created');
  return id;
}

export async function openPr(): Promise<number> {
  const run = await requireRun();
  if (run.prNumber) return run.prNumber;
  const number = await openPullRequest();
  await setPr(run.id, number);
  await recordEvent(run.id, 'pr opened');
  return number;
}

export async function event(name: string): Promise<void> {
  const run = await requireRun();
  await recordEvent(run.id, name);
}

export async function switchToFallback(): Promise<void> {
  const run = await requireRun();
  await setFallback(run.id);
  await recordEvent(run.id, 'switched to fallback');
}

export type ResetReport = {
  closedPrs: number[];
  deletedBranches: string[];
  deletedDeployments: string[];
};

/**
 * Removes everything the demo flow creates: open PRs from the demo head branch (after their
 * workflows stop), the dev branch, and the preview branches and deployments of demo PRs.
 * The fallback PR comes from a different head branch and is never touched.
 */
export async function reset(): Promise<ResetReport> {
  const report: ResetReport = { closedPrs: [], deletedBranches: [], deletedDeployments: [] };
  const run = await currentRun();

  const open = await openDemoPullRequests();
  for (const number of open) {
    await cancelWorkflows(number);
    const url = await previewUrlFor(number);
    await closePullRequest(number);
    report.closedPrs.push(number);
    if (url) {
      await deleteDeployment(url);
      report.deletedDeployments.push(url);
    }
  }

  const recentlyClosed = (await closedDemoPullRequests()).slice(0, 5).filter((n) => !open.includes(n));
  for (const number of recentlyClosed) {
    const url = await previewUrlFor(number);
    if (url) {
      await deleteDeployment(url);
      report.deletedDeployments.push(url);
    }
  }

  const demoPrs = new Set([...open, ...recentlyClosed]);
  for (const branch of await listBranches()) {
    const prNumber = branch.name.startsWith(FACTORY.previewBranchPrefix)
      ? Number(branch.name.slice(FACTORY.previewBranchPrefix.length))
      : null;
    if (branch.name === FACTORY.devBranchName || (prNumber !== null && demoPrs.has(prNumber))) {
      await deleteBranch(branch.id);
      report.deletedBranches.push(branch.name);
    }
  }

  if (run) {
    await recordEvent(run.id, 'reset');
    await endRun(run.id);
  }
  return report;
}
