import { fallbackPullRequest, pullRequestState, type PullRequestState } from './github';
import { listBranches, type Branch } from './neon';
import { currentRun, recentRuns, type Run } from './runs';

export type FactoryState = {
  run: Run | null;
  lastRun: Run | null;
  branches: Branch[];
  pr: PullRequestState | null;
  fallbackPr: number | null;
  fetchedAt: string;
};

type Entry<T> = { at: number; value: T };

// GitHub allows 5,000 requests an hour per token and one PR state costs four,
// so every dashboard poll shares these short-lived results.
let fallbackEntry: Entry<number | null> | null = null;
const prEntries = new Map<number, Entry<PullRequestState>>();

async function fallback(): Promise<number | null> {
  if (fallbackEntry && Date.now() - fallbackEntry.at < 60_000) return fallbackEntry.value;
  fallbackEntry = { at: Date.now(), value: await fallbackPullRequest() };
  return fallbackEntry.value;
}

async function pr(number: number): Promise<PullRequestState> {
  const hit = prEntries.get(number);
  if (hit && Date.now() - hit.at < 4_000) return hit.value;
  const value = await pullRequestState(number);
  prEntries.set(number, { at: Date.now(), value });
  return value;
}

export async function factoryState(): Promise<FactoryState> {
  const [run, branches, fallbackPr] = await Promise.all([currentRun(), listBranches(), fallback()]);
  const prNumber = run ? (run.fallback ? fallbackPr : run.prNumber) : null;
  const lastRun = run ? null : ((await recentRuns(1))[0] ?? null);
  return {
    run,
    lastRun,
    branches,
    pr: prNumber ? await pr(prNumber) : null,
    fallbackPr,
    fetchedAt: new Date().toISOString(),
  };
}
