'use client';

import { useEffect, useState } from 'react';
import { Factory as FactoryIcon, FolderGit2, Database, Triangle, Globe, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LINKS } from '@/lib/factory/config';
import type { Beat } from '@/lib/factory/sequence';
import type { FactoryState } from '@/lib/factory/state';

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function Elapsed({ since, until }: { since: string; until: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);
  const end = until ? Date.parse(until) : now;
  return <span className="font-mono tabular-nums">{formatElapsed(end - Date.parse(since))}</span>;
}

const QUICK_LINKS = [
  { label: 'GitHub', href: LINKS.repo, icon: FolderGit2 },
  { label: 'Neon', href: LINKS.neonProject, icon: Database },
  { label: 'Vercel', href: LINKS.vercelProject, icon: Triangle },
  { label: 'Production', href: LINKS.production, icon: Globe },
];

export function Header({
  state,
  beat,
  busy,
  onReset,
}: {
  state: FactoryState | null;
  beat: Beat | null;
  busy: boolean;
  onReset: () => void;
}) {
  const run = state?.run ?? null;
  return (
    <header className="flex items-center justify-between border-b border-border/60 px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <FactoryIcon className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Software Factory</h1>
          <p className="text-xs text-muted-foreground">vibecastly · agents ship, production is the check</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {run && (
          <div className="mr-2 flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Run <Elapsed since={run.startedAt} until={beat?.kind === 'final' ? run.screenshotAt : null} />
            {beat?.kind === 'final' && <span className="text-primary">· done</span>}
          </div>
        )}
        {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
          <Button key={label} variant="ghost" size="sm" nativeButton={false} render={<a href={href} target="_blank" rel="noreferrer" />}>
            <Icon className="size-4" /> {label}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={onReset} disabled={busy} aria-label="Reset the demo">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Reset
        </Button>
      </div>
    </header>
  );
}
