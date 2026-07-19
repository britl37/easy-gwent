import { describe, expect, it } from 'vitest';
import type { GameState } from '@gwent/engine';
import { didOpponentPass } from '../src/game/reveal.ts';

function turnState(turn: 0 | 1, passed: [boolean, boolean], roundHistoryLength = 0): GameState {
  return {
    phase: 'play',
    turn,
    players: [{ passed: passed[0] }, { passed: passed[1] }],
    roundHistory: Array.from({ length: roundHistoryLength }),
  } as unknown as GameState;
}

describe('opponent pass feedback', () => {
  it('detects an opponent passing control to the local player', () => {
    const prev = turnState(1, [false, false]);
    const state = turnState(0, [false, true]);

    expect(didOpponentPass(prev, state, 0)).toBe(true);
  });

  it('does not mistake the local player passing for an opponent pass', () => {
    const prev = turnState(0, [false, false]);
    const state = turnState(1, [true, false]);

    expect(didOpponentPass(prev, state, 0)).toBe(false);
  });

  it('does not announce a pass after the round has advanced', () => {
    const prev = turnState(1, [false, false]);
    const state = turnState(0, [false, true], 1);

    expect(didOpponentPass(prev, state, 0)).toBe(false);
  });
});
