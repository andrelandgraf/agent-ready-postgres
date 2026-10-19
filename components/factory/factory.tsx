'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FACTORY } from '@/lib/factory/config';
import { SCRIPT, previewFailed, resumeIndex, waitSatisfied, type Beat } from '@/lib/factory/sequence';
import type { FactoryState } from '@/lib/factory/state';
import { Header } from './header';
import { Board } from './board';
import { BranchesPanel } from './branches-panel';
import { PrPanel } from './pr-panel';
import { ScreenshotPanel } from './screenshot-panel';

const POLL_MS = 2500;

function isFactoryState(value: unknown): value is FactoryState {
  return (
    typeof value === 'object' &&
    value !== null &&
    'branches' in value &&
    Array.isArray(value.branches) &&
    'run' in value &&
    'pr' in value
  );
}

async function post(action: string, extra: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body;
}

export function Factory() {
  const [state, setState] = useState<FactoryState | null>(null);
  const [beatIndex, setBeatIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const stateRef = useRef<FactoryState | null>(null);
  const resumed = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/state', { cache: 'no-store' });
    const body: unknown = await res.json();
    if (!res.ok || !isFactoryState(body)) {
      setError(typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : 'State failed');
      return null;
    }
    stateRef.current = body;
    setState(body);
    if (!resumed.current) {
      resumed.current = true;
      setBeatIndex(resumeIndex(body));
    }
    return body;
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh]);

  const beat: Beat | null = beatIndex >= 0 ? SCRIPT[beatIndex] : null;

  // Advance the script. Timed beats wait; actions call the server; waits watch polled state.
  useEffect(() => {
    if (!beat || error) return;
    let cancelled = false;
    const next = () => !cancelled && setBeatIndex((i) => Math.min(i + 1, SCRIPT.length - 1));
    if (beat.kind === 'timed') {
      const id = setTimeout(next, beat.ms);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }
    if (beat.kind === 'action') {
      post(beat.action)
        .then(() => refresh())
        .then(next)
        .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
      return () => {
        cancelled = true;
      };
    }
    if (beat.kind === 'wait') {
      const id = setInterval(() => {
        const current = stateRef.current;
        if (!current) return;
        if (waitSatisfied(beat.until, current)) {
          clearInterval(id);
          next();
        }
      }, 500);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }
  }, [beat, beatIndex, error, refresh]);

  // Switch to the prepared PR when the live preview is late or failed.
  useEffect(() => {
    if (!state?.run || state.run.fallback || !state.fallbackPr || !beat || beat.kind !== 'wait' || beat.until !== 'preview-ready') return;
    const late = state.run.prOpenedAt !== null && Date.now() - Date.parse(state.run.prOpenedAt) > FACTORY.fallbackAfterMs;
    const failed = previewFailed(state);
    if (!late && !failed) return;
    const message = failed
      ? `The live preview failed. Switched to the prepared PR #${state.fallbackPr}.`
      : `The live preview is running late. Switched to the prepared PR #${state.fallbackPr}.`;
    void post('fallback').then(() => {
      setNotice(message);
      return refresh();
    });
  }, [state, beat, refresh]);

  async function startRun() {
    if (beatIndex >= 0 || busy) return;
    setError(null);
    setNotice(null);
    setBeatIndex(0);
  }

  async function resetRun() {
    setBusy(true);
    setError(null);
    try {
      await post('reset');
      setBeatIndex(-1);
      setNotice(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header state={state} beat={beat} busy={busy} onReset={resetRun} />
      {(error || notice) && (
        <div
          role="status"
          className={`mx-6 mt-3 rounded-lg border px-4 py-2 text-sm ${error ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-amber-400/40 bg-amber-400/10 text-amber-200'}`}
        >
          {error ?? notice}
        </div>
      )}
      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] gap-5 p-6">
        <Board beat={beat} state={state} onStart={startRun} />
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <BranchesPanel branches={state?.branches ?? []} />
          <PrPanel state={state} />
          <ScreenshotPanel run={state?.run ?? null} beat={beat} />
        </div>
      </main>
    </div>
  );
}
