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
import { PasswordGate } from './password-gate';
import { apiFetch, forgetPassword, Unauthorized } from './password';

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
  const res = await apiFetch('/api/run', {
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
  const [locked, setLocked] = useState(false);
  const [connection, setConnection] = useState<string | null>(null);
  const pausedUntil = useRef(0);
  const inflight = useRef<Promise<unknown> | null>(null);
  const doneActions = useRef(new Set<number>());
  const screenshotLoaded = useRef(false);
  const stateRef = useRef<FactoryState | null>(null);
  const resumed = useRef(false);

  const refresh = useCallback(async () => {
    if (Date.now() < pausedUntil.current) return null;
    let res: Response;
    let body: unknown;
    try {
      res = await apiFetch('/api/state');
      body = await res.json();
    } catch (e) {
      if (e instanceof Unauthorized) {
        forgetPassword();
        setLocked(true);
        return null;
      }
      setConnection(`Lost the dashboard API (${e instanceof Error ? e.message : String(e)}). Retrying; nothing advances until it is back.`);
      return null;
    }
    if (res.status === 429 && typeof body === 'object' && body !== null && 'retryAt' in body && typeof body.retryAt === 'string') {
      pausedUntil.current = Date.parse(body.retryAt);
      setConnection(`GitHub rate limit reached. Polling pauses until ${new Date(pausedUntil.current).toLocaleTimeString()}.`);
      return null;
    }
    if (!res.ok || !isFactoryState(body)) {
      setConnection(typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : `State failed (${res.status})`);
      return null;
    }
    setConnection(null);
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

  useEffect(() => {
    if (!beat || error || busy || connection) return;
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
      if (doneActions.current.has(beatIndex)) {
        next();
        return;
      }
      const index = beatIndex;
      const request = post(beat.action);
      inflight.current = request;
      request
        .then(() => {
          doneActions.current.add(index);
          return refresh();
        })
        .then((fresh) => {
          if (fresh) next();
        })
        .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => {
          if (inflight.current === request) inflight.current = null;
        });
      return () => {
        cancelled = true;
      };
    }
    if (beat.kind === 'wait') {
      const id = setInterval(() => {
        const current = stateRef.current;
        if (!current) return;
        const satisfied = waitSatisfied(beat.until, current) && (beat.until !== 'screenshot' || screenshotLoaded.current);
        if (satisfied) {
          clearInterval(id);
          next();
        }
      }, 500);
      return () => {
        cancelled = true;
        clearInterval(id);
      };
    }
  }, [beat, beatIndex, error, busy, connection, refresh]);

  useEffect(() => {
    if (!state?.run || state.run.fallback || !state.fallbackPr || !beat || beat.kind !== 'wait' || beat.until !== 'preview-ready') return;
    const late = state.run.prOpenedAt !== null && Date.now() - Date.parse(state.run.prOpenedAt) > FACTORY.fallbackAfterMs;
    const failed = previewFailed(state);
    if (!late && !failed) return;
    const message = failed
      ? `The live preview failed. Switched to the prepared PR #${state.fallbackPr}.`
      : `The live preview is running late. Switched to the prepared PR #${state.fallbackPr}.`;
    post('fallback')
      .then(() => {
        setNotice(message);
        return refresh();
      })
      .catch((e: unknown) => setError(`Could not switch to the prepared PR: ${e instanceof Error ? e.message : String(e)}`));
  }, [state, beat, refresh]);

  async function startRun() {
    if (beatIndex >= 0 || busy) return;
    setError(null);
    setNotice(null);
    setBeatIndex(0);
  }

  async function resetRun() {
    setBusy(true);
    setBeatIndex(-1);
    try {
      await inflight.current?.catch(() => undefined);
      doneActions.current.clear();
      screenshotLoaded.current = false;
      await post('reset');
      setError(null);
      setNotice(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (locked) {
    return (
      <PasswordGate
        onUnlocked={() => {
          setLocked(false);
          void refresh();
        }}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header state={state} beat={beat} busy={busy} onReset={resetRun} />
      {connection && (
        <div role="alert" className="mx-6 mt-3 rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-sm text-sky-100">
          {connection}
        </div>
      )}
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
          <ScreenshotPanel
            run={state?.run ?? null}
            beat={beat}
            onLoaded={(loaded) => {
              screenshotLoaded.current = loaded;
            }}
          />
        </div>
      </main>
    </div>
  );
}
