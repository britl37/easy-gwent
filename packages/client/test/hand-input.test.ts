import { describe, expect, it } from 'vitest';
import type { Action } from '@gwent/engine';
import { immediateHandPlay } from '../src/game/handInput.ts';

describe('double-click hand play', () => {
  it('returns one unambiguous card play', () => {
    const action = { type: 'PLAY_CARD', player: 0, handIndex: 2, row: 'melee' } as const;
    expect(immediateHandPlay([action], 2)).toEqual(action);
  });

  it('requires normal selection when an agile card has multiple legal rows', () => {
    const actions: Action[] = [
      { type: 'PLAY_CARD', player: 0, handIndex: 2, row: 'melee' },
      { type: 'PLAY_CARD', player: 0, handIndex: 2, row: 'ranged' },
    ];
    expect(immediateHandPlay(actions, 2)).toBeNull();
  });

  it('requires a board click for Decoy even when only one target is legal', () => {
    const actions: Action[] = [
      { type: 'PLAY_CARD', player: 0, handIndex: 2, targetInstanceId: 'i7' },
    ];
    expect(immediateHandPlay(actions, 2)).toBeNull();
  });
});
