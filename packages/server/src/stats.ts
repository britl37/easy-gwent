import { randomBytes } from 'node:crypto';
import type { LeaderboardEntry, UserPublic } from '@gwent/engine';
import { getUserPublic } from './auth.ts';
import type { Db } from './db.ts';

export type MatchOutcome = 'p0_win' | 'p1_win' | 'draw' | 'forfeit_p0' | 'forfeit_p1';

export interface RecordMatchInput {
  roomId: string;
  p0UserId: string;
  p1UserId: string;
  outcome: MatchOutcome;
}

export interface RecordMatchResult {
  recorded: boolean;
  p0: UserPublic;
  p1: UserPublic;
}

/**
 * Record a multiplayer match once per roomId. Idempotent: second call is a no-op
 * but still returns current stats.
 */
export function recordMatch(db: Db, input: RecordMatchInput): RecordMatchResult {
  const existing = db.prepare(`SELECT id FROM matches WHERE room_id = ?`).get(input.roomId);
  if (existing) {
    return {
      recorded: false,
      p0: getUserPublic(db, input.p0UserId)!,
      p1: getUserPublic(db, input.p1UserId)!,
    };
  }

  let winner: string | null = null;
  let p0Delta: { wins: number; losses: number; draws: number } = { wins: 0, losses: 0, draws: 0 };
  let p1Delta = { wins: 0, losses: 0, draws: 0 };

  switch (input.outcome) {
    case 'p0_win':
    case 'forfeit_p1':
      winner = input.p0UserId;
      p0Delta = { wins: 1, losses: 0, draws: 0 };
      p1Delta = { wins: 0, losses: 1, draws: 0 };
      break;
    case 'p1_win':
    case 'forfeit_p0':
      winner = input.p1UserId;
      p0Delta = { wins: 0, losses: 1, draws: 0 };
      p1Delta = { wins: 1, losses: 0, draws: 0 };
      break;
    case 'draw':
      p0Delta = { wins: 0, losses: 0, draws: 1 };
      p1Delta = { wins: 0, losses: 0, draws: 1 };
      break;
  }

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO matches (id, room_id, p0_user_id, p1_user_id, winner, outcome, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomBytes(16).toString('hex'),
      input.roomId,
      input.p0UserId,
      input.p1UserId,
      winner,
      input.outcome,
      Date.now(),
    );
    db.prepare(
      `UPDATE user_stats SET wins = wins + ?, losses = losses + ?, draws = draws + ? WHERE user_id = ?`,
    ).run(p0Delta.wins, p0Delta.losses, p0Delta.draws, input.p0UserId);
    db.prepare(
      `UPDATE user_stats SET wins = wins + ?, losses = losses + ?, draws = draws + ? WHERE user_id = ?`,
    ).run(p1Delta.wins, p1Delta.losses, p1Delta.draws, input.p1UserId);
  });

  try {
    tx();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE')) {
      return {
        recorded: false,
        p0: getUserPublic(db, input.p0UserId)!,
        p1: getUserPublic(db, input.p1UserId)!,
      };
    }
    throw e;
  }

  return {
    recorded: true,
    p0: getUserPublic(db, input.p0UserId)!,
    p1: getUserPublic(db, input.p1UserId)!,
  };
}

export function leaderboard(db: Db, limit = 50): LeaderboardEntry[] {
  const lim = Math.min(Math.max(1, limit), 100);
  const rows = db
    .prepare(
      `SELECT u.username, s.wins, s.losses, s.draws
       FROM user_stats s
       JOIN users u ON u.id = s.user_id
       WHERE s.wins + s.losses + s.draws >= 1
       ORDER BY s.wins DESC,
         CASE WHEN (s.wins + s.losses + s.draws) = 0 THEN 0
              ELSE CAST(s.wins AS REAL) / (s.wins + s.losses + s.draws) END DESC,
         u.username ASC
       LIMIT ?`,
    )
    .all(lim) as Array<{ username: string; wins: number; losses: number; draws: number }>;

  return rows.map((r, i) => {
    const total = r.wins + r.losses + r.draws;
    return {
      rank: i + 1,
      username: r.username,
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
      winRate: total === 0 ? 0 : r.wins / total,
    };
  });
}
