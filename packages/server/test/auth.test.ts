import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { authByToken, login, logout, register } from '../src/auth.ts';
import { openDb, type Db } from '../src/db.ts';

let dbPath: string;
let db: Db;

function freshDb(): Db {
  dbPath = path.join(os.tmpdir(), `gwent-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  db = openDb(dbPath);
  return db;
}

afterEach(() => {
  db?.close();
  try {
    fs.unlinkSync(dbPath);
    fs.unlinkSync(dbPath + '-wal');
    fs.unlinkSync(dbPath + '-shm');
  } catch {
    /* ignore */
  }
});

describe('auth', () => {
  it('registers and logs in', () => {
    const d = freshDb();
    const reg = register(d, 'Geralt', 'password123');
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    expect(reg.user.username).toBe('Geralt');
    expect(reg.user.wins).toBe(0);
    expect(reg.token.length).toBeGreaterThan(20);

    const byTok = authByToken(d, reg.token);
    expect(byTok?.username).toBe('Geralt');

    const log = login(d, 'geralt', 'password123');
    expect(log.ok).toBe(true);
  });

  it('rejects duplicate usernames case-insensitively', () => {
    const d = freshDb();
    expect(register(d, 'Triss', 'password123').ok).toBe(true);
    const dup = register(d, 'triss', 'password123');
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.code).toBe('username_taken');
  });

  it('rejects bad password and short username', () => {
    const d = freshDb();
    expect(register(d, 'ab', 'password123').ok).toBe(false);
    expect(register(d, 'ValidName', 'short').ok).toBe(false);
    register(d, 'Yennefer', 'password123');
    const bad = login(d, 'Yennefer', 'wrongpassword');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe('bad_credentials');
  });

  it('invalidates session on logout', () => {
    const d = freshDb();
    const reg = register(d, 'Ciri', 'password123');
    if (!reg.ok) throw new Error('reg failed');
    logout(d, reg.token);
    expect(authByToken(d, reg.token)).toBeNull();
  });
});
