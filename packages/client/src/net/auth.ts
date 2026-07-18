import type { LeaderboardEntry, UserPublic } from '@gwent/engine';

const TOKEN_KEY = 'gwent.auth.v1';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string; message: string }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const token = opts.token === undefined ? getToken() : opts.token;
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let json: { error?: string; message?: string; token?: string; user?: UserPublic; entries?: LeaderboardEntry[] } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    /* empty */
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: json.error ?? 'error',
      message: json.message ?? res.statusText,
    };
  }
  return { ok: true, data: json as T };
}

export async function register(username: string, password: string) {
  const r = await api<{ token: string; user: UserPublic }>('/api/register', {
    body: { username, password },
    token: null,
  });
  if (r.ok) setToken(r.data.token);
  return r;
}

export async function login(username: string, password: string) {
  const r = await api<{ token: string; user: UserPublic }>('/api/login', {
    body: { username, password },
    token: null,
  });
  if (r.ok) setToken(r.data.token);
  return r;
}

export async function fetchMe() {
  return api<{ user: UserPublic }>('/api/me');
}

export async function doLogout() {
  const token = getToken();
  if (token) await api('/api/logout', { method: 'POST', token });
  setToken(null);
}

export async function fetchLeaderboard(limit = 50) {
  return api<{ entries: LeaderboardEntry[] }>(`/api/leaderboard?limit=${limit}`, { token: null });
}
