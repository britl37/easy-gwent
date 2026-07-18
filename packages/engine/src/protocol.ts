import type { PlayableFaction } from '@gwent/data';
import type { Action } from './actions.ts';
import type { DeckList } from './setup.ts';
import type { GameState, PlayerId } from './state.ts';

/** Public user + multiplayer stats (never includes secrets). */
export interface UserPublic {
  id: string;
  username: string;
  wins: number;
  losses: number;
  draws: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0–1
}

/** Messages the client sends to the server. */
export type ClientMsg =
  | { t: 'auth'; token: string }
  | { t: 'create_room'; deck: DeckList }
  | { t: 'join_room'; roomId: string; deck: DeckList }
  | { t: 'action'; action: Action }
  | { t: 'leave' };

/** Messages the server sends to the client. */
export type ServerMsg =
  | { t: 'authed'; user: UserPublic }
  | { t: 'room_created'; roomId: string }
  | {
      t: 'joined';
      roomId: string;
      you: PlayerId;
      opponentFaction: PlayableFaction;
      opponentUsername: string;
    }
  /** `state` is always `redactState(full, seat)` — never the authoritative state. */
  | { t: 'state'; state: GameState }
  | {
      t: 'match_result';
      result: 'win' | 'loss' | 'draw';
      you: UserPublic;
      opponent: UserPublic;
    }
  | { t: 'error'; code: ProtocolErrorCode; message: string }
  | { t: 'opponent_left' };

export type ProtocolErrorCode =
  | 'room_not_found'
  | 'room_full'
  | 'invalid_deck'
  | 'illegal_action'
  | 'not_your_turn'
  | 'bad_message'
  | 'not_in_room'
  | 'auth_required'
  | 'auth_invalid'
  | 'username_taken'
  | 'bad_credentials'
  | 'already_in_room';
