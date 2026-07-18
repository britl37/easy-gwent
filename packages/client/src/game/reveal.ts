import type { Row } from '@gwent/data';
import type { GameState, PlayerId } from '@gwent/engine';
import { useEffect, useRef, useState } from 'react';

const ROWS: Row[] = ['melee', 'ranged', 'siege'];

/** Delay between paced state applications (AI steps / MP snapshots). */
export const STEP_MS = 700;
/** How long a single play reveal stays on screen. */
export const REVEAL_MS = 900;
/** How long the "Your turn" toast stays on screen. */
export const TURN_TOAST_MS = 1100;

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
  const [turnToast, setTurnToast] = useState(false);
  const prevRef = useRef<GameState | null>(null);
  const keyRef = useRef(0);
  const queueRef = useRef<RevealEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMyMoveRef = useRef(false);

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

    // "Your turn" toast on the rising edge of control returning to me.
    const myMove =
      state.phase === 'play' &&
      !state.pendingChoice &&
      state.turn === me &&
      !state.players[me].passed;
    if (myMove && !prevMyMoveRef.current && prev) {
      setTurnToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setTurnToast(false), TURN_TOAST_MS);
    }
    prevMyMoveRef.current = myMove;
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
    timerRef.current = setTimeout(drainQueue, REVEAL_MS);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  return { reveal, turnToast };
}
