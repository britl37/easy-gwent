import type { Row } from '@gwent/data';
import type { PlayerId } from './state.ts';

/** Redraw phase: swap one card from hand back into deck, or finish redrawing. */
export interface RedrawAction {
  type: 'REDRAW';
  player: PlayerId;
  handIndex: number | null; // null = done redrawing
}

export interface PlayCardAction {
  type: 'PLAY_CARD';
  player: PlayerId;
  handIndex: number;
  /** Required for agile units (choose row) and specials horn (choose row). */
  row?: Row;
  /** Decoy: instanceId of own board unit to return to hand. */
  targetInstanceId?: string;
}

export interface PlayLeaderAction {
  type: 'PLAY_LEADER';
  player: PlayerId;
}

/** Answer a PendingChoice (e.g. medic revival target; null = decline when allowed). */
export interface ResolveChoiceAction {
  type: 'RESOLVE_CHOICE';
  player: PlayerId;
  cardId: string | null;
}

export interface PassAction {
  type: 'PASS';
  player: PlayerId;
}

export type Action =
  | RedrawAction
  | PlayCardAction
  | PlayLeaderAction
  | ResolveChoiceAction
  | PassAction;
