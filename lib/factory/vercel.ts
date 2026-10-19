import { FACTORY } from './config';
import { requireEnv } from '@/lib/env';

/** Deletes the deployment behind a preview URL. A deployment that is already gone counts as deleted. */
export async function deleteDeployment(url: string): Promise<void> {
  const host = new URL(url).host;
  const headers = { authorization: `Bearer ${requireEnv('VERCEL_TOKEN')}` };
  const query = `teamId=${FACTORY.vercel.teamId}`;
  const lookup = await fetch(`https://api.vercel.com/v13/deployments/${host}?${query}`, { headers });
  if (lookup.status === 404) return;
  if (!lookup.ok) throw new Error(`Vercel lookup ${host} → ${lookup.status}: ${(await lookup.text()).slice(0, 300)}`);
  const { id } = (await lookup.json()) as { id: string };
  const res = await fetch(`https://api.vercel.com/v13/deployments/${id}?${query}`, { method: 'DELETE', headers });
  if (!res.ok && res.status !== 404) throw new Error(`Vercel delete ${id} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
