'use client';

import { motion } from 'motion/react';
import { Bot, ShieldCheck, ScanSearch } from 'lucide-react';
import { AGENTS, type AgentId } from '@/lib/factory/sequence';

const STYLE: Record<AgentId, { icon: typeof Bot; ring: string; bg: string; text: string }> = {
  builder: { icon: Bot, ring: 'ring-emerald-400/60', bg: 'bg-emerald-400/15', text: 'text-emerald-300' },
  security: { icon: ShieldCheck, ring: 'ring-violet-400/60', bg: 'bg-violet-400/15', text: 'text-violet-300' },
  e2e: { icon: ScanSearch, ring: 'ring-sky-400/60', bg: 'bg-sky-400/15', text: 'text-sky-300' },
};

export function AgentAvatar({ id, active, size = 'md' }: { id: AgentId; active: boolean; size?: 'sm' | 'md' }) {
  const style = STYLE[id];
  const Icon = style.icon;
  const dimension = size === 'sm' ? 'size-7' : 'size-9';
  return (
    <motion.div
      layoutId={`agent-${id}`}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      title={`${AGENTS[id].name}: ${AGENTS[id].role}`}
      className={`relative flex ${dimension} items-center justify-center rounded-full ring-2 ${style.ring} ${style.bg}`}
    >
      <Icon className={`size-4 ${style.text}`} />
      {active && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-3">
          <span className={`absolute inline-flex size-full animate-ping rounded-full ${style.bg} opacity-80`} />
          <span className="relative inline-flex size-3 rounded-full bg-primary ring-2 ring-card" />
        </span>
      )}
    </motion.div>
  );
}

export function agentTextClass(id: AgentId): string {
  return STYLE[id].text;
}
