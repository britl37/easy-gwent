import type { Row, PlayableFaction } from '@gwent/data';
import type { GameState, PlayerId, Phase, RowState, PendingChoice, LogEntry, WeatherKind } from './state.ts';
import { otherPlayer } from './state.ts';
import { scores } from './scoring.ts';

/** What a player is allowed to see about themselves. */
export interface SelfView {
  faction: PlayableFaction;
  leaderId: string;
  leaderUsed: boolean;
  hand: string[];
  deckCount: number;
  graveyard: string[];
  rows: Record<Row, RowState>;
  passed: boolean;
  gems: number;
  redrawsLeft: number;
}

/** What a player is allowed to see about the opponent (no hand/deck contents). */
export interface OpponentView {
  faction: PlayableFaction;
  leaderId: string;
  leaderUsed: boolean;
  handCount: number;
  deckCount: number;
  graveyard: string[];
  rows: Record<Row, RowState>;
  passed: boolean;
  gems: number;
}

export interface PlayerView {
  seat: PlayerId;
  phase: Phase;
  round: number;
  yourTurn: boolean;
  you: SelfView;
  opponent: OpponentView;
  weather: Record<WeatherKind, boolean>;
  /** Present only when it's YOUR pending choice. */
  pendingChoice: PendingChoice | null;
  scores: [number, number]; // [you, opponent]
  roundHistory: Array<{ scores: [number, number]; winner: PlayerId | null }>;
  winner: 'you' | 'opponent' | 'draw' | null;
  log: LogEntry[];
}

/** Redact full state down to what `seat` may know. Hidden info never leaves the server. */
export function redact(s: GameState, seat: PlayerId): PlayerView {
  const me = s.players[seat];
  const oppId = otherPlayer(seat);
  const opp = s.players[oppId];
  const [s0, s1] = scores(s);

  return {
    seat,
    phase: s.phase,
    round: s.round,
    yourTurn: s.phase === 'play' && !s.pendingChoice && s.turn === seat && !me.passed,
    you: {
      faction: me.faction,
      leaderId: me.leaderId,
      leaderUsed: me.leaderUsed,
      hand: [...me.hand],
      deckCount: me.deck.length,
      graveyard: [...me.graveyard],
      rows: structuredClone(me.rows),
      passed: me.passed,
      gems: me.gems,
      redrawsLeft: me.redrawsLeft,
    },
    opponent: {
      faction: opp.faction,
      leaderId: opp.leaderId,
      leaderUsed: opp.leaderUsed,
      handCount: opp.hand.length,
      deckCount: opp.deck.length,
      graveyard: [...opp.graveyard],
      rows: structuredClone(opp.rows),
      passed: opp.passed,
      gems: opp.gems,
    },
    weather: { ...s.weather },
    pendingChoice: s.pendingChoice && s.pendingChoice.player === seat ? structuredClone(s.pendingChoice) : null,
    scores: seat === 0 ? [s0, s1] : [s1, s0],
    roundHistory: s.roundHistory.map((r) => ({
      scores: seat === 0 ? r.scores : ([r.scores[1], r.scores[0]] as [number, number]),
      winner: r.winner,
    })),
    winner:
      s.phase !== 'finished' ? null : s.drawn ? 'draw' : s.winner === seat ? 'you' : 'opponent',
    log: [...s.log],
  };
}
