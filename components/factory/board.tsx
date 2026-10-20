'use client';

import { useState, type DragEvent } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { CheckCircle2, GitPullRequest, Loader2, GripVertical, Sparkles } from 'lucide-react';
import { AGENTS, type Beat, type ColumnId } from '@/lib/factory/sequence';
import type { FactoryState } from '@/lib/factory/state';
import { AgentAvatar, agentTextClass } from './agents';

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'draft', title: 'Draft' },
  { id: 'todo', title: 'To do' },
  { id: 'progress', title: 'In progress' },
  { id: 'review', title: 'In review' },
  { id: 'done', title: 'Done' },
];

function FeatureCard({ beat, state, draggable }: { beat: Beat | null; state: FactoryState | null; draggable: boolean }) {
  const pr = state?.pr;
  const done = beat?.kind === 'final';
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', 'addons')}
      data-testid="feature-card"
    >
    <motion.div
      layoutId="feature-card"
      layout
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className={`relative rounded-xl border p-3.5 shadow-lg ${
        done ? 'border-primary/60 bg-primary/10' : 'border-primary/30 bg-card'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start gap-2">
        {draggable && <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[15px] font-semibold">
            <Sparkles className="size-4 text-primary" /> Addons
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Tag items and background images in prompts, next to people.
          </p>
        </div>
      </div>

      {beat && (
        <>
          <div className="mt-3 flex -space-x-2">
            <AnimatePresence>
              {beat.agents.map((id) => (
                <AgentAvatar key={id} id={id} active={id === beat.active && !done} size="sm" />
              ))}
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={beat.status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mt-2.5 flex items-center gap-1.5 text-xs"
              data-testid="feature-status"
            >
              {done ? (
                <CheckCircle2 className="size-3.5 text-primary" />
              ) : (
                <Loader2 className={`size-3.5 animate-spin ${agentTextClass(beat.active)}`} />
              )}
              <span className={agentTextClass(beat.active)}>{AGENTS[beat.active].name}</span>
              <span className="text-muted-foreground">{beat.status}</span>
            </motion.div>
          </AnimatePresence>
          {pr && (
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <GitPullRequest className="size-3" /> #{pr.number}
            </a>
          )}
        </>
      )}
    </motion.div>
    </div>
  );
}

export function Board({ beat, state, onStart }: { beat: Beat | null; state: FactoryState | null; onStart: () => void }) {
  const [over, setOver] = useState<ColumnId | null>(null);
  const idle = beat === null;
  const cardColumn: ColumnId = beat?.column ?? 'draft';

  function onDrop(column: ColumnId, e: DragEvent) {
    e.preventDefault();
    setOver(null);
    if (idle && column === 'todo' && e.dataTransfer.getData('text/plain') === 'addons') onStart();
  }

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Board</h2>
        {idle && (
          <button type="button" onClick={onStart} className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Drag Addons into To do, or click here
          </button>
        )}
      </div>
      <LayoutGroup>
        <div className="grid min-h-0 flex-1 grid-cols-5 gap-3">
          {COLUMNS.map((column) => (
            <div
              key={column.id}
              data-testid={`column-${column.id}`}
              onDragOver={(e) => {
                if (idle && column.id === 'todo') {
                  e.preventDefault();
                  setOver(column.id);
                }
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => onDrop(column.id, e)}
              className={`flex min-h-0 flex-col rounded-2xl border p-2.5 transition-colors ${
                over === column.id ? 'border-primary/60 bg-primary/5' : 'border-border/50 bg-muted/20'
              }`}
            >
              <div className="mb-2.5 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted-foreground">{column.title}</span>
              </div>
              <div className="flex flex-col gap-2.5 overflow-y-auto">
                {cardColumn === column.id && <FeatureCard beat={beat} state={state} draggable={idle} />}
              </div>
            </div>
          ))}
        </div>
      </LayoutGroup>
    </section>
  );
}
