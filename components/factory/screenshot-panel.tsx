'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, ScanSearch, Terminal } from 'lucide-react';
import type { Beat } from '@/lib/factory/sequence';
import type { Run } from '@/lib/factory/runs';
import { apiFetch } from './password';

type Loaded = { key: string; url: string } | { key: string; failed: string };

function useScreenshot(run: Run | null, attempt: number): Loaded | null {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const runId = run?.id ?? null;
  const key = run?.screenshotAt ? `${run.id}:${run.screenshotAt}:${attempt}` : null;

  useEffect(() => {
    if (!key || !runId) return;
    let url: string | null = null;
    let cancelled = false;
    apiFetch(`/api/screenshot/${runId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setLoaded({ key, url });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoaded({ key, failed: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key, runId]);

  return loaded && loaded.key === key ? loaded : null;
}

export function ScreenshotPanel({
  run,
  beat,
  onLoaded,
}: {
  run: Run | null;
  beat: Beat | null;
  onLoaded: (loaded: boolean) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [decodeFailed, setDecodeFailed] = useState<string | null>(null);
  const waiting = beat?.kind === 'wait' && beat.until === 'screenshot';
  const loaded = useScreenshot(run, attempt);
  const url = loaded && 'url' in loaded && decodeFailed !== loaded.url ? loaded.url : null;
  const failure = loaded && 'failed' in loaded ? loaded.failed : loaded && decodeFailed === ('url' in loaded ? loaded.url : null) ? 'not a readable image' : null;

  function retry() {
    onLoaded(false);
    setDecodeFailed(null);
    setAttempt((a) => a + 1);
  }

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
          <img
            src={url}
            alt="E2E agent screenshot of the addons feature"
            className="w-full"
            onLoad={() => onLoaded(true)}
            onError={() => {
              onLoaded(false);
              setDecodeFailed(url);
            }}
          />
        </motion.a>
      ) : failure ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          The screenshot was uploaded but did not load ({failure}).
          <button type="button" onClick={retry} className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline">
            <RotateCcw className="size-3" /> Retry
          </button>
        </div>
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
