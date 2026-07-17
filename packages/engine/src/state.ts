import type { Row, PlayableFaction } from '@gwent/data';

export type PlayerId = 0 | 1;

export type Phase = 'redraw' | 'play' | 'finished';

export type WeatherKind = 'frost' | 'fog' | 'rain';

/** A card on the board. instanceId distinguishes copies of the same CardDef. */
export interface PlacedCard {
  instanceId: string;
  cardId: string;
  /** Transient: marked by the Monsters passive to survive round cleanup. */
  kept?: boolean;
}

export interface RowState {
  units: PlacedCard[];
  hornActive: boolean; // commander's horn special placed on this row
}

export interface PendingChoice {
  player: PlayerId;
  kind: 'medic' | 'redraw';
  /** medic: graveyard card ids eligible for revival. redraw: remaining redraws allowed. */
  options: string[];
  remaining: number;
}

export interface PlayerState {
  faction: PlayableFaction;
  leaderId: string;
  leaderUsed: boolean;
  deck: string[]; // card ids, top = end
  hand: string[];
  graveyard: string[];
  rows: Record<Row, RowState>;
  passed: boolean;
  gems: number; // life tokens, start at 2
  redrawsLeft: number;
}

export interface LogEntry {
  turn: number;
  text: string;
}

export interface GameState {
  phase: Phase;
  round: number; // 1-based
  turn: PlayerId; // whose action is expected (also target of pendingChoice if set)
  players: [PlayerState, PlayerState];
  weather: Record<WeatherKind, boolean>;
  pendingChoice: PendingChoice | null;
  roundHistory: Array<{ scores: [number, number]; winner: PlayerId | null }>;
  winner: PlayerId | null; // null while playing; also null on draw when phase==='finished' && drawn
  drawn: boolean;
  rngState: number;
  nextInstance: number; // instanceId counter
  log: LogEntry[];
  turnCount: number;
}

export const otherPlayer = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);

export const emptyRows = (): Record<Row, RowState> => ({
  melee: { units: [], hornActive: false },
  ranged: { units: [], hornActive: false },
  siege: { units: [], hornActive: false },
});

export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalActionError';
  }
}

/** Deep-clone a GameState (plain JSON data by construction). */
export function cloneState(s: GameState): GameState {
  return structuredClone(s);
}
