import { describe, it, expect } from 'vitest';
import {
  ALL_CARDS,
  byId,
  NEUTRAL_CARDS,
  NORTHERN_REALMS_CARDS,
  NILFGAARD_CARDS,
  SCOIATAEL_CARDS,
  MONSTERS_CARDS,
  SKELLIGE_CARDS,
  LEADER_CARDS,
} from '@gwent/data';

describe('card database', () => {
  it('has unique ids', () => {
    const ids = ALL_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('locks per-faction card counts (update deliberately when adding cards)', () => {
    const counts = {
      neutral: NEUTRAL_CARDS.length,
      northern_realms: NORTHERN_REALMS_CARDS.length,
      nilfgaard: NILFGAARD_CARDS.length,
      scoiatael: SCOIATAEL_CARDS.length,
      monsters: MONSTERS_CARDS.length,
      skellige: SKELLIGE_CARDS.length,
      leaders: LEADER_CARDS.length,
      totalDefs: ALL_CARDS.length,
      totalCopies: ALL_CARDS.reduce((n, c) => n + c.count, 0),
    };
    expect(counts).toMatchSnapshot();
  });

  it('every unit has rows and strength', () => {
    for (const c of ALL_CARDS.filter((c) => c.type === 'unit')) {
      expect(c.rows, c.id).toBeDefined();
      expect(c.rows!.length).toBeGreaterThanOrEqual(1);
      expect(c.rows!.length).toBeLessThanOrEqual(2);
      expect(c.strength, c.id).toBeTypeOf('number');
    }
  });

  it('every special has a kind, every leader an ability', () => {
    for (const c of ALL_CARDS.filter((c) => c.type === 'special')) expect(c.special, c.id).toBeDefined();
    for (const c of ALL_CARDS.filter((c) => c.type === 'leader')) expect(c.leaderAbility, c.id).toBeDefined();
  });

  it('transformsInto targets exist', () => {
    for (const c of ALL_CARDS.filter((c) => c.transformsInto)) {
      expect(() => byId(c.transformsInto!)).not.toThrow();
    }
  });

  it('every playable faction has at least 22 unit copies + a leader', () => {
    for (const f of ['northern_realms', 'nilfgaard', 'scoiatael', 'monsters', 'skellige'] as const) {
      const pool = ALL_CARDS.filter(
        (c) => (c.faction === f || c.faction === 'neutral') && c.type === 'unit',
      ).reduce((n, c) => n + c.count, 0);
      expect(pool, f).toBeGreaterThanOrEqual(22);
      expect(LEADER_CARDS.some((l) => l.faction === f), f).toBe(true);
    }
  });
});
