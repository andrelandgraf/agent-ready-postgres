'use client';

import { CheckCircle2, CircleDashed, ExternalLink, GitPullRequest, Loader2, XCircle } from 'lucide-react';
import type { WorkflowStep } from '@/lib/factory/github';
import type { FactoryState } from '@/lib/factory/state';

function duration(step: WorkflowStep): string | null {
  if (!step.startedAt || !step.completedAt) return null;
  const seconds = Math.round((Date.parse(step.completedAt) - Date.parse(step.startedAt)) / 1000);
  return `${seconds}s`;
}

function StepIcon({ step }: { step: WorkflowStep }) {
  if (step.status !== 'completed') {
    return step.status === 'in_progress' ? <Loader2 className="size-3.5 animate-spin text-sky-300" /> : <CircleDashed className="size-3.5 text-muted-foreground" />;
  }
  if (step.conclusion === 'success') return <CheckCircle2 className="size-3.5 text-primary" />;
  if (step.conclusion === 'skipped') return <CircleDashed className="size-3.5 text-muted-foreground/50" />;
  return <XCircle className="size-3.5 text-destructive" />;
}

// The steps that tell the story on stage. Setup and plumbing steps stay in the
// Actions run and show here only when they fail.
const KEY_STEPS = new Set([
  'Create Neon preview branch',
  'Run Drizzle migration on the preview branch',
  'Post schema diff',
  'Deploy web preview to Vercel',
]);

function shown(step: WorkflowStep): boolean {
  const failed = step.status === 'completed' && step.conclusion !== 'success' && step.conclusion !== 'skipped';
  return KEY_STEPS.has(step.name) || failed;
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-muted/50">
      {children} <ExternalLink className="size-3" />
    </a>
  );
}

export function PrPanel({ state }: { state: FactoryState | null }) {
  const pr = state?.pr ?? null;
  const workflow = pr?.workflow ?? null;
  const total =
    workflow && workflow.status === 'completed'
      ? `${Math.round((Date.parse(workflow.updatedAt) - Date.parse(workflow.startedAt)) / 1000)}s`
      : null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4" data-testid="pr-panel">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <GitPullRequest className="size-4 text-primary" /> Pull request
        {state?.run?.fallback && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">prepared fallback</span>}
      </h2>
      {!pr ? (
        <p className="text-xs text-muted-foreground">The Builder opens a PR once the change passes on its dev branch.</p>
      ) : (
        <div className="space-y-3">
          <a href={pr.url} target="_blank" rel="noreferrer" className="block text-sm font-medium hover:underline">
            <span className="text-muted-foreground">#{pr.number}</span> {pr.title}
          </a>
          {workflow ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Preview workflow</span>
                <span className="font-mono tabular-nums">{total ?? workflow.status.replace('_', ' ')}</span>
              </div>
              <ul className="space-y-1">
                {workflow.steps.filter(shown).map((step) => (
                  <li key={step.name} className="flex items-center gap-2 text-xs" data-testid="workflow-step">
                    <StepIcon step={step} />
                    <span className={step.conclusion === 'skipped' ? 'text-muted-foreground/50' : ''}>{step.name}</span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">{duration(step)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Waiting for GitHub Actions to pick it up
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {workflow && <Link href={workflow.url}>Actions run</Link>}
            {pr.schemaDiffUrl && <Link href={pr.schemaDiffUrl}>Schema diff</Link>}
            {pr.previewUrl && <Link href={pr.previewUrl}>Preview</Link>}
          </div>
        </div>
      )}
    </section>
  );
}
