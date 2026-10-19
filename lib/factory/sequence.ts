import type { FactoryState } from './state';

export type AgentId = 'builder' | 'security' | 'e2e';
export type ColumnId = 'draft' | 'todo' | 'progress' | 'review' | 'done';

export type Beat = {
  column: ColumnId;
  agents: AgentId[];
  active: AgentId;
  status: string;
} & (
  | { kind: 'timed'; ms: number }
  | { kind: 'action'; action: 'start' | 'dev-branch' | 'pr' }
  | { kind: 'wait'; until: 'dev-branch-ready' | 'preview-ready' | 'screenshot' }
  | { kind: 'final' }
);

export const AGENTS: Record<AgentId, { name: string; role: string }> = {
  builder: { name: 'Builder', role: 'Writes the code and the migration' },
  security: { name: 'Security reviewer', role: 'Reviews every diff' },
  e2e: { name: 'E2E tester', role: 'Tests the preview environment' },
};

// Timed beats are narration; every action and wait is a real event.
export const SCRIPT: Beat[] = [
  { column: 'todo', agents: ['builder'], active: 'builder', status: 'Picked up by Builder', kind: 'timed', ms: 2500 },
  { column: 'todo', agents: ['builder'], active: 'builder', status: 'Booting sandbox', kind: 'action', action: 'start' },
  { column: 'todo', agents: ['builder'], active: 'builder', status: 'Booting sandbox', kind: 'timed', ms: 3000 },
  { column: 'progress', agents: ['builder'], active: 'builder', status: 'Branching production into dev/addons', kind: 'action', action: 'dev-branch' },
  { column: 'progress', agents: ['builder'], active: 'builder', status: 'Branching production into dev/addons', kind: 'wait', until: 'dev-branch-ready' },
  { column: 'progress', agents: ['builder'], active: 'builder', status: 'Writing migration 0001_addons', kind: 'timed', ms: 6000 },
  { column: 'progress', agents: ['builder'], active: 'builder', status: 'Running the migration on dev/addons', kind: 'timed', ms: 6000 },
  { column: 'progress', agents: ['builder'], active: 'builder', status: 'Tests pass against production data', kind: 'timed', ms: 5000 },
  { column: 'review', agents: ['builder', 'security'], active: 'security', status: 'Reviewing the diff', kind: 'timed', ms: 5000 },
  { column: 'review', agents: ['builder', 'security'], active: 'security', status: 'No findings', kind: 'timed', ms: 2500 },
  { column: 'review', agents: ['builder', 'security'], active: 'builder', status: 'Opening the pull request', kind: 'action', action: 'pr' },
  { column: 'review', agents: ['builder', 'security'], active: 'builder', status: 'Preview environment building', kind: 'wait', until: 'preview-ready' },
  { column: 'review', agents: ['builder', 'security', 'e2e'], active: 'e2e', status: 'Testing the preview', kind: 'wait', until: 'screenshot' },
  { column: 'review', agents: ['builder', 'security', 'e2e'], active: 'e2e', status: 'Preview tested · ready to merge', kind: 'final' },
];

export function previewReady(state: FactoryState): boolean {
  const workflow = state.pr?.workflow;
  return Boolean(workflow && workflow.status === 'completed' && workflow.conclusion === 'success' && state.pr?.previewUrl);
}

export function previewFailed(state: FactoryState): boolean {
  const workflow = state.pr?.workflow;
  return Boolean(workflow && workflow.status === 'completed' && workflow.conclusion !== 'success');
}

export function waitSatisfied(until: 'dev-branch-ready' | 'preview-ready' | 'screenshot', state: FactoryState): boolean {
  switch (until) {
    case 'dev-branch-ready':
      return state.branches.some((b) => b.id === state.run?.devBranchId && b.state === 'ready');
    case 'preview-ready':
      return previewReady(state);
    case 'screenshot':
      return Boolean(state.run?.screenshotAt);
  }
}

/** Where a page load lands when a run is already in progress. */
export function resumeIndex(state: FactoryState): number {
  const run = state.run;
  const find = (predicate: (beat: Beat) => boolean) => SCRIPT.findIndex(predicate);
  if (!run) return -1;
  if (run.screenshotAt) return find((b) => b.kind === 'wait' && b.until === 'screenshot');
  if (run.prNumber || run.fallback) {
    return previewReady(state) ? find((b) => b.kind === 'wait' && b.until === 'screenshot') : find((b) => b.kind === 'wait' && b.until === 'preview-ready');
  }
  if (run.devBranchId) {
    return waitSatisfied('dev-branch-ready', state)
      ? find((b) => b.kind === 'timed' && b.status.startsWith('Writing migration'))
      : find((b) => b.kind === 'wait' && b.until === 'dev-branch-ready');
  }
  return find((b) => b.kind === 'action' && b.action === 'dev-branch');
}
