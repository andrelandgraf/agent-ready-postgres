import { FACTORY } from './config';
import { requireEnv } from '@/lib/env';

export type BranchKind = 'production' | 'dev' | 'preview' | 'other';

export type Branch = {
  id: string;
  name: string;
  parentName: string | null;
  createdAt: string;
  kind: BranchKind;
  state: string;
};

type ApiBranch = { id: string; name: string; parent_id?: string; created_at: string; default: boolean; current_state: string };

const BASE = `https://console.neon.tech/api/v2/projects/${FACTORY.neon.projectId}`;

async function neonApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${requireEnv('NEON_API_KEY')}`,
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Neon ${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

function kindOf(branch: ApiBranch): BranchKind {
  if (branch.default) return 'production';
  if (branch.name.startsWith('dev/')) return 'dev';
  if (branch.name.startsWith('preview/')) return 'preview';
  return 'other';
}

export async function listBranches(): Promise<Branch[]> {
  const { branches } = await neonApi<{ branches: ApiBranch[] }>('GET', '/branches');
  const names = new Map(branches.map((b) => [b.id, b.name]));
  return branches
    .map((b) => ({
      id: b.id,
      name: b.name,
      parentName: b.parent_id ? (names.get(b.parent_id) ?? null) : null,
      createdAt: b.created_at,
      kind: kindOf(b),
      state: b.current_state,
    }))
    .sort((a, b) => (a.kind === 'production' ? -1 : b.kind === 'production' ? 1 : a.createdAt.localeCompare(b.createdAt)));
}

export async function createDevBranch(): Promise<string> {
  const { branch } = await neonApi<{ branch: { id: string } }>('POST', '/branches', {
    branch: { name: FACTORY.devBranchName },
    endpoints: [{ type: 'read_write' }],
  });
  return branch.id;
}

export async function deleteBranch(branchId: string): Promise<void> {
  const res = await fetch(`${BASE}/branches/${branchId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${requireEnv('NEON_API_KEY')}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Neon DELETE branch ${branchId} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
