'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ScanSearch, Terminal } from 'lucide-react';
import type { Beat } from '@/lib/factory/sequence';
import type { Run } from '@/lib/factory/runs';
import { apiFetch } from './password';

function useScreenshot(run: Run | null): string | null {
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  const key = run?.screenshotAt ? `${run.id}:${run.screenshotAt}` : null;

  useEffect(() => {
    if (!key || !run) return;
    let url: string | null = null;
    let cancelled = false;
    apiFetch(`/api/screenshot/${run.id}`)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setLoaded({ key, url });
      })
      .catch((error: unknown) => console.error('[screenshot]', error));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key, run]);

  return loaded && loaded.key === key ? loaded.url : null;
}

export function ScreenshotPanel({ run, beat }: { run: Run | null; beat: Beat | null }) {
  const waiting = beat?.kind === 'wait' && beat.until === 'screenshot';
  const url = useScreenshot(run);
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4" data-testid="screenshot-panel">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ScanSearch className="size-4 text-sky-300" /> E2E test on the preview
      </h2>
      {url ? (
        <motion.a
          href={url}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="block overflow-hidden rounded-lg border border-border/60"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="E2E agent screenshot of the addons feature" className="w-full" />
        </motion.a>
      ) : waiting ? (
        <div className="rounded-lg border border-dashed border-sky-400/40 bg-sky-400/5 p-4 text-xs text-sky-100">
          <div className="mb-1.5 flex items-center gap-1.5 font-medium">
            <Terminal className="size-3.5" /> Hand off to Copilot CLI
          </div>
          <code className="font-mono text-[12px] text-sky-200">./scripts/e2e</code>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">The E2E tester&apos;s screenshot of the preview lands here.</p>
      )}
    </section>
  );
}
