'use client';

import { useState, type FormEvent } from 'react';
import { Factory as FactoryIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch, storePassword, Unauthorized } from './password';

export function PasswordGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/state', {}, password);
      storePassword(password);
      onUnlocked();
    } catch (e) {
      setError(e instanceof Unauthorized ? 'Wrong password.' : 'Could not reach the dashboard API.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <form onSubmit={submit} className="w-80 space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <FactoryIcon className="size-5 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Software Factory</h1>
        </div>
        <input
          type="password"
          autoFocus
          aria-label="Password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy || !password}>
          {busy && <Loader2 className="size-4 animate-spin" />} Open
        </Button>
      </form>
    </div>
  );
}
