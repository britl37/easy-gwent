import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { register } from '../src/auth.ts';
import { openDb, type Db } from '../src/db.ts';
import { leaderboard, recordMatch } from '../src/stats.ts';

let dbPath: string;
let db: Db;

function freshDb(): Db {
  dbPath = path.join(os.tmpdir(), `gwent-stats-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
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

describe('stats', () => {
  it('records win/loss once per room', () => {
    const d = freshDb();
    const a = register(d, 'PlayerA', 'password123');
    const b = register(d, 'PlayerB', 'password123');
    if (!a.ok || !b.ok) throw new Error('reg');
    const r1 = recordMatch(d, {
      roomId: 'room1',
      p0UserId: a.user.id,
      p1UserId: b.user.id,
      outcome: 'p0_win',
    });
    expect(r1.recorded).toBe(true);
    expect(r1.p0.wins).toBe(1);
    expect(r1.p1.losses).toBe(1);

    const r2 = recordMatch(d, {
      roomId: 'room1',
      p0UserId: a.user.id,
      p1UserId: b.user.id,
      outcome: 'p1_win',
    });
    expect(r2.recorded).toBe(false);
    expect(r2.p0.wins).toBe(1);
    expect(r2.p1.losses).toBe(1);
  });

  it('records draws and forfeits', () => {
    const d = freshDb();
    const a = register(d, 'DrawA', 'password123');
    const b = register(d, 'DrawB', 'password123');
    if (!a.ok || !b.ok) throw new Error('reg');
    const draw = recordMatch(d, {
      roomId: 'rdraw',
      p0UserId: a.user.id,
      p1UserId: b.user.id,
      outcome: 'draw',
    });
    expect(draw.p0.draws).toBe(1);
    expect(draw.p1.draws).toBe(1);

    const c = register(d, 'ForfeitC', 'password123');
    const e = register(d, 'ForfeitE', 'password123');
    if (!c.ok || !e.ok) throw new Error('reg');
    const ff = recordMatch(d, {
      roomId: 'rff',
      p0UserId: c.user.id,
      p1UserId: e.user.id,
      outcome: 'forfeit_p0',
    });
    expect(ff.p0.losses).toBe(1);
    expect(ff.p1.wins).toBe(1);
  });

  it('orders leaderboard by wins then win rate', () => {
    const d = freshDb();
    const mk = (name: string) => {
      const r = register(d, name, 'password123');
      if (!r.ok) throw new Error(name);
      return r.user.id;
    };
    const a = mk('Alpha');
    const b = mk('Beta');
    const c = mk('Charlie');
    // Alpha 2-0, Beta 1-1, Charlie 0-1
    recordMatch(d, { roomId: 'm1', p0UserId: a, p1UserId: b, outcome: 'p0_win' });
    recordMatch(d, { roomId: 'm2', p0UserId: a, p1UserId: c, outcome: 'p0_win' });
    recordMatch(d, { roomId: 'm3', p0UserId: b, p1UserId: c, outcome: 'p0_win' });

    const board = leaderboard(d, 10);
    expect(board[0]!.username).toBe('Alpha');
    expect(board[0]!.wins).toBe(2);
    expect(board[1]!.username).toBe('Beta');
    expect(board.map((e) => e.username)).toContain('Charlie');
  });
});
