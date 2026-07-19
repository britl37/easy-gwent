import type { Row } from '@gwent/data';
import type { GameState, PlayerId } from '@gwent/engine';
import { useEffect, useRef, useState } from 'react';
import {
  sfxCardPlay,
  sfxDefeat,
  sfxOpponentTurn,
  sfxRoundEnd,
  sfxRoundVictory,
  sfxVictory,
  sfxYourTurn,
} from './sfx';

const ROWS: Row[] = ['melee', 'ranged', 'siege'];

/** Delay between paced state applications (AI steps / MP snapshots). */
export const STEP_MS = 1000;
/** Hold after the human's play (1s) plus a beat before the NPC's response (1s). */
export const FIRST_STEP_MS = 2000;
/** How long a single play reveal stays on screen. */
export const REVEAL_MS = 900;
/** How long the turn banner stays on screen. */
export const TURN_TOAST_MS = 1400;

/** Whose turn is being announced. */
export type TurnBanner = 'you' | 'opponent' | 'opponent-passed';

/**
 * Passes need explicit feedback: a server snapshot can move directly from the
 * opponent's action to our turn without a card reveal to make the handoff clear.
 */
export function didOpponentPass(prev: GameState, state: GameState, me: PlayerId): boolean {
  const other = (1 - me) as PlayerId;
  return (
    prev.phase === 'play' &&
    state.phase === 'play' &&
    !prev.players[other].passed &&
    state.players[other].passed &&
    !state.players[me].passed &&
    state.turn === me &&
    state.roundHistory.length === prev.roundHistory.length
  );
}

export interface RevealEvent {
  key: number;
  cardId: string;
  /** Board owner the unit landed for (0/1 in engine terms). */
  player: PlayerId;
  row: Row;
}

function unitMap(s: GameState): Map<string, { cardId: string; player: PlayerId; row: Row }> {
  const m = new Map<string, { cardId: string; player: PlayerId; row: Row }>();
  for (const p of [0, 1] as PlayerId[]) {
    for (const row of ROWS) {
      for (const u of s.players[p].rows[row].units) {
        m.set(u.instanceId, { cardId: u.cardId, player: p, row });
      }
    }
  }
  return m;
}

/**
 * Watches successive GameStates and emits short-lived reveal events for newly
 * placed units, plus a "your turn" toast when control returns to `me`.
 * Purely presentational — never blocks input or mutates state.
 */
export function usePlayReveals(state: GameState | null, me: PlayerId) {
  const [reveal, setReveal] = useState<RevealEvent | null>(null);
  const [turnBanner, setTurnBanner] = useState<TurnBanner | null>(null);
  const prevRef = useRef<GameState | null>(null);
  const keyRef = useRef(0);
  const queueRef = useRef<RevealEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevWhoseRef = useRef<TurnBanner | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (!state) return;

    // Detect newly placed units (skip the very first snapshot: nothing to reveal).
    if (prev) {
      const before = unitMap(prev);
      for (const [id, u] of unitMap(state)) {
        if (!before.has(id)) {
          queueRef.current.push({ key: ++keyRef.current, ...u });
        }
      }
      // Collapse bursts: only surface the most recent play per state change.
      if (queueRef.current.length > 2) {
        queueRef.current = queueRef.current.slice(-2);
      }
      if (!timerRef.current) drainQueue();
    }

    // Turn banner on any change of whose move it is (yours or the opponent's).
    const other = (1 - me) as PlayerId;
    const whose: TurnBanner | null =
      state.phase !== 'play' || state.pendingChoice
        ? null
        : state.turn === me && !state.players[me].passed
          ? 'you'
          : state.turn === other && !state.players[other].passed
            ? 'opponent'
            : null;
    const opponentPassed = prev ? didOpponentPass(prev, state, me) : false;
    const nextBanner = opponentPassed ? 'opponent-passed' : whose !== prevWhoseRef.current ? whose : null;
    if (nextBanner && prev) {
      setTurnBanner(nextBanner);
      if (nextBanner === 'you' || nextBanner === 'opponent-passed') sfxYourTurn();
      else sfxOpponentTurn();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setTurnBanner(null), TURN_TOAST_MS);
    }
    prevWhoseRef.current = whose;

    // Round / match end sounds (only on transitions, never on the first snapshot).
    if (prev) {
      if (state.phase === 'finished' && prev.phase !== 'finished') {
        if (state.winner === me) sfxVictory();
        else sfxDefeat();
      } else if (state.roundHistory.length > prev.roundHistory.length) {
        const result = state.roundHistory.at(-1);
        if (result?.winner === me) sfxRoundVictory();
        else sfxRoundEnd();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, me]);

  const drainQueue = () => {
    const next = queueRef.current.shift();
    if (!next) {
      timerRef.current = null;
      setReveal(null);
      return;
    }
    setReveal(next);
    sfxCardPlay();
    timerRef.current = setTimeout(drainQueue, REVEAL_MS);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  return { reveal, turnBanner };
}
