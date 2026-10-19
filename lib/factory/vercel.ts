import { FACTORY } from './config';
import { requireEnv } from '@/lib/env';

type ApiDeployment = {
  uid: string;
  url: string;
  state: string;
  target: string | null;
  created: number;
  meta?: Record<string, string>;
};

function isDeploymentList(value: unknown): value is { deployments: ApiDeployment[] } {
  return typeof value === 'object' && value !== null && 'deployments' in value && Array.isArray(value.deployments);
}

async function vercel(method: string, path: string): Promise<Response> {
  const separator = path.includes('?') ? '&' : '?';
  return fetch(`https://api.vercel.com${path}${separator}teamId=${FACTORY.vercel.teamId}`, {
    method,
    headers: { authorization: `Bearer ${requireEnv('VERCEL_TOKEN')}` },
    cache: 'no-store',
  });
}

/** Preview deployments the vibecastly workflow tagged with this PR number, newest first. */
async function previewDeployments(prNumber: number): Promise<ApiDeployment[]> {
  const res = await vercel(
    'GET',
    `/v6/deployments?projectId=${FACTORY.vercel.projectId}&meta-factoryPr=${prNumber}&limit=20`,
  );
  if (!res.ok) throw new Error(`Vercel list deployments → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body: unknown = await res.json();
  if (!isDeploymentList(body)) throw new Error('Vercel list deployments returned an unexpected body');
  return body.deployments
    .filter((d) => d.target !== 'production' && d.meta?.factoryPr === String(prNumber))
    .sort((a, b) => b.created - a.created);
}

export async function previewUrl(prNumber: number): Promise<string | null> {
  const ready = (await previewDeployments(prNumber)).find((d) => d.state === 'READY');
  return ready ? `https://${ready.url}` : null;
}

export async function deletePreviewDeployments(prNumber: number): Promise<string[]> {
  const deleted: string[] = [];
  for (const deployment of await previewDeployments(prNumber)) {
    const res = await vercel('DELETE', `/v13/deployments/${deployment.uid}`);
    if (!res.ok && res.status !== 404) {
      throw new Error(`Vercel delete ${deployment.uid} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    deleted.push(`https://${deployment.url}`);
  }
  return deleted;
}
