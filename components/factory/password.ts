'use client';

const KEY = 'software-factory:password';

export function storedPassword(): string | null {
  return window.localStorage.getItem(KEY);
}

export function storePassword(password: string): void {
  window.localStorage.setItem(KEY, password);
}

export function forgetPassword(): void {
  window.localStorage.removeItem(KEY);
}

export class Unauthorized extends Error {}

/** fetch for the dashboard API: sends the stored password and throws Unauthorized on 401. */
export async function apiFetch(path: string, init: RequestInit = {}, password = storedPassword()): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: { ...init.headers, authorization: `Bearer ${password ?? ''}` },
  });
  if (res.status === 401) throw new Unauthorized('Wrong or missing dashboard password');
  return res;
}
