import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { UserPublic } from '@gwent/engine';
import type { Db } from './db.ts';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export type AuthErrorCode = 'username_taken' | 'bad_credentials' | 'auth_invalid';

export type AuthResult =
  | { ok: true; token: string; user: UserPublic }
  | { ok: false; code: AuthErrorCode; message: string };

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Format: scrypt$N$r$p$saltB64$hashB64 */
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, 'base64');
  const expected = Buffer.from(parts[5]!, 'base64');
  const actual = scryptSync(password, salt, expected.length, { N, r, p });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function getUserPublic(db: Db, userId: string): UserPublic | null {
  const row = db
    .prepare(
      `SELECT u.id, u.username, s.wins, s.losses, s.draws
       FROM users u JOIN user_stats s ON s.user_id = u.id
       WHERE u.id = ?`,
    )
    .get(userId) as { id: string; username: string; wins: number; losses: number; draws: number } | undefined;
  if (!row) return null;
  return { id: row.id, username: row.username, wins: row.wins, losses: row.losses, draws: row.draws };
}

function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 20) return 'Username must be 3–20 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username may only contain letters, numbers, underscore';
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 200) return 'Password too long';
  return null;
}

function issueSession(db: Db, userId: string): string {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
  ).run(hashToken(token), userId, now + SESSION_TTL_MS, now);
  return token;
}

export function register(db: Db, username: string, password: string): AuthResult {
  const uErr = validateUsername(username);
  if (uErr) return { ok: false, code: 'bad_credentials', message: uErr };
  const pErr = validatePassword(password);
  if (pErr) return { ok: false, code: 'bad_credentials', message: pErr };

  const id = randomBytes(16).toString('hex');
  const now = Date.now();
  try {
    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)`).run(
        id,
        username,
        hashPassword(password),
        now,
      );
      db.prepare(`INSERT INTO user_stats (user_id, wins, losses, draws) VALUES (?, 0, 0, 0)`).run(id);
    });
    tx();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE')) {
      return { ok: false, code: 'username_taken', message: 'Username already taken' };
    }
    throw e;
  }

  const user = getUserPublic(db, id)!;
  const token = issueSession(db, id);
  return { ok: true, token, user };
}

export function login(db: Db, username: string, password: string): AuthResult {
  const row = db
    .prepare(`SELECT id, password_hash FROM users WHERE username = ? COLLATE NOCASE`)
    .get(username) as { id: string; password_hash: string } | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { ok: false, code: 'bad_credentials', message: 'Invalid username or password' };
  }
  const user = getUserPublic(db, row.id)!;
  const token = issueSession(db, row.id);
  return { ok: true, token, user };
}

/** Validate token; slide expiry on success. */
export function authByToken(db: Db, token: string): UserPublic | null {
  if (!token || token.length < 32) return null;
  const th = hashToken(token);
  const now = Date.now();
  const row = db
    .prepare(`SELECT user_id, expires_at FROM sessions WHERE token_hash = ?`)
    .get(th) as { user_id: string; expires_at: number } | undefined;
  if (!row || row.expires_at < now) {
    if (row) db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(th);
    return null;
  }
  db.prepare(`UPDATE sessions SET expires_at = ? WHERE token_hash = ?`).run(now + SESSION_TTL_MS, th);
  return getUserPublic(db, row.user_id);
}

export function logout(db: Db, token: string): void {
  if (!token) return;
  db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashToken(token));
}
