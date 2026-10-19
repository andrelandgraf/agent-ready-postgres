'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GitBranch, ExternalLink } from 'lucide-react';
import { LINKS } from '@/lib/factory/config';
import type { Branch, BranchKind } from '@/lib/factory/neon';

const KIND: Record<BranchKind, { label: string; dot: string; text: string }> = {
  production: { label: 'production', dot: 'bg-primary', text: 'text-primary' },
  dev: { label: 'dev', dot: 'bg-emerald-300', text: 'text-emerald-300' },
  preview: { label: 'preview', dot: 'bg-sky-400', text: 'text-sky-300' },
  other: { label: 'branch', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
};

function age(createdAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(createdAt)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function BranchesPanel({ branches }: { branches: Branch[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4" data-testid="branches-panel">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <GitBranch className="size-4 text-primary" /> Neon branches
        </h2>
        <a href={LINKS.neonProject} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
          vibecastly project
        </a>
      </div>
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {branches.map((branch) => {
            const kind = KIND[branch.kind];
            return (
              <motion.li
                key={branch.id}
                layout
                initial={{ opacity: 0, x: 24, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -24, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-2.5 py-2"
                data-testid="branch-row"
              >
                <span className={`size-2 shrink-0 rounded-full ${kind.dot} ${branch.state !== 'ready' ? 'animate-pulse' : ''}`} />
                <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{branch.name}</span>
                <span className={`text-[11px] ${kind.text}`}>{kind.label}</span>
                {branch.parentName && <span className="text-[11px] text-muted-foreground">from {branch.parentName}</span>}
                <span className="w-7 text-right font-mono text-[11px] text-muted-foreground tabular-nums">{age(branch.createdAt, now)}</span>
                <a href={LINKS.neonBranch(branch.id)} target="_blank" rel="noreferrer" aria-label={`Open ${branch.name} in Neon`} className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="size-3.5" />
                </a>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
