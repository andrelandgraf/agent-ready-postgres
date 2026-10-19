import { FACTORY } from './config';
import { previewUrl } from './vercel';
import { requireEnv } from '@/lib/env';

const REPO = `${FACTORY.repo.owner}/${FACTORY.repo.name}`;
const SCHEMA_DIFF_MARKER = '<!--- [schema diff GitHub action comment identifier] -->';
const WORKFLOW_BOT = 'github-actions[bot]';

export class RateLimited extends Error {
  readonly retryAt: string;
  constructor(retryAt: string) {
    super(`GitHub rate limit reached; it resets at ${retryAt}`);
    this.retryAt = retryAt;
  }
}

export type WorkflowStep = { name: string; status: string; conclusion: string | null; startedAt: string | null; completedAt: string | null };

export type PullRequestState = {
  number: number;
  url: string;
  title: string;
  state: 'open' | 'closed';
  headSha: string;
  workflow: {
    url: string;
    status: string;
    conclusion: string | null;
    startedAt: string;
    updatedAt: string;
    steps: WorkflowStep[];
  } | null;
  previewUrl: string | null;
  schemaDiffUrl: string | null;
};

async function gh<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      authorization: `Bearer ${requireEnv('GITHUB_TOKEN')}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    throw new RateLimited(new Date(Number.isFinite(reset) ? reset * 1000 : Date.now() + 60_000).toISOString());
  }
  if (!res.ok) throw new Error(`GitHub ${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 || res.status === 202 ? (null as T) : ((await res.json()) as T);
}

type ApiPull = { number: number; html_url: string; title: string; state: 'open' | 'closed'; head: { sha: string; ref: string } };
type ApiComment = { body: string; html_url: string; user: { login: string } | null };
type ApiRun = {
  id: number;
  html_url: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  pull_requests: { number: number }[];
};
type ApiJob = { steps?: { name: string; status: string; conclusion: string | null; started_at: string | null; completed_at: string | null }[] };

export async function openPullRequest(): Promise<number> {
  const pr = await gh<ApiPull>('POST', `/repos/${REPO}/pulls`, {
    title: FACTORY.pr.title,
    body: FACTORY.pr.body,
    head: FACTORY.headBranch,
    base: FACTORY.baseBranch,
  });
  return pr.number;
}

export async function openDemoPullRequests(): Promise<number[]> {
  const pulls = await gh<ApiPull[]>(
    'GET',
    `/repos/${REPO}/pulls?state=open&head=${FACTORY.repo.owner}:${encodeURIComponent(FACTORY.headBranch)}&per_page=20`,
  );
  return pulls.map((p) => p.number);
}

export async function closedDemoPullRequests(): Promise<number[]> {
  const pulls = await gh<ApiPull[]>(
    'GET',
    `/repos/${REPO}/pulls?state=closed&head=${FACTORY.repo.owner}:${encodeURIComponent(FACTORY.headBranch)}&per_page=30&sort=updated&direction=desc`,
  );
  return pulls.map((p) => p.number);
}

export async function fallbackPullRequest(): Promise<number | null> {
  const issues = await gh<{ number: number; pull_request?: unknown }[]>(
    'GET',
    `/repos/${REPO}/issues?state=open&labels=${FACTORY.fallbackLabel}&per_page=5`,
  );
  return issues.find((i) => i.pull_request)?.number ?? null;
}

export async function closePullRequest(number: number): Promise<void> {
  await gh('PATCH', `/repos/${REPO}/pulls/${number}`, { state: 'closed' });
}

// The demo and fallback PRs share a commit, so runs are matched by PR number, not by SHA.
async function workflowRunsFor(pr: ApiPull): Promise<ApiRun[]> {
  const data = await gh<{ workflow_runs: ApiRun[] }>(
    'GET',
    `/repos/${REPO}/actions/runs?head_sha=${pr.head.sha}&branch=${encodeURIComponent(pr.head.ref)}&event=pull_request&per_page=20`,
  );
  return data.workflow_runs.filter((r) => r.pull_requests.some((p) => p.number === pr.number));
}

/** Cancels this PR's queued or running workflows and waits for them to stop. */
export async function cancelWorkflows(number: number): Promise<void> {
  const pr = await gh<ApiPull>('GET', `/repos/${REPO}/pulls/${number}`);
  const deadline = Date.now() + 60_000;
  for (;;) {
    const active = (await workflowRunsFor(pr)).filter((r) => r.status !== 'completed');
    if (active.length === 0) return;
    if (Date.now() > deadline) throw new Error(`Workflow runs still active for PR #${number}: ${active.map((r) => r.id).join(', ')}`);
    await Promise.all(
      active.map((r) =>
        gh('POST', `/repos/${REPO}/actions/runs/${r.id}/cancel`).catch((error: unknown) => {
          if (!(error instanceof Error && error.message.includes('→ 409'))) throw error;
        }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

export async function pullRequestState(number: number): Promise<PullRequestState> {
  const [pr, comments] = await Promise.all([
    gh<ApiPull>('GET', `/repos/${REPO}/pulls/${number}`),
    gh<ApiComment[]>('GET', `/repos/${REPO}/issues/${number}/comments?per_page=100`),
  ]);
  const [run] = await workflowRunsFor(pr);
  let workflow: PullRequestState['workflow'] = null;
  if (run) {
    const jobs = await gh<{ jobs: ApiJob[] }>('GET', `/repos/${REPO}/actions/runs/${run.id}/jobs`);
    workflow = {
      url: run.html_url,
      status: run.status,
      conclusion: run.conclusion,
      startedAt: run.run_started_at ?? run.created_at,
      updatedAt: run.updated_at,
      steps: (jobs.jobs[0]?.steps ?? [])
        .filter((s) => !s.name.startsWith('Set up') && !s.name.startsWith('Post ') && !s.name.startsWith('Run actions/') && s.name !== 'Complete job')
        .map((s) => ({ name: s.name, status: s.status, conclusion: s.conclusion, startedAt: s.started_at, completedAt: s.completed_at })),
    };
  }
  return {
    number: pr.number,
    url: pr.html_url,
    title: pr.title,
    state: pr.state,
    headSha: pr.head.sha,
    workflow,
    previewUrl: await previewUrl(pr.number),
    schemaDiffUrl:
      comments.find((c) => c.user?.login === WORKFLOW_BOT && c.body.includes(SCHEMA_DIFF_MARKER))?.html_url ?? null,
  };
}
