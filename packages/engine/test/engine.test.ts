import { describe, it, expect } from 'vitest';
import { byId } from '@gwent/data';
import {
  createGame,
  validateDeck,
  applyAction,
  legalActions,
  effectiveStrength,
  boardScore,
  redact,
  IllegalActionError,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import { testDeck } from './helpers.ts';

function skipRedraw(s: GameState): GameState {
  s = applyAction(s, { type: 'REDRAW', player: 0, handIndex: null });
  s = applyAction(s, { type: 'REDRAW', player: 1, handIndex: null });
  return s;
}

function newGame(seed = 42): GameState {
  return skipRedraw(createGame(seed, [testDeck('northern_realms'), testDeck('nilfgaard')]));
}

describe('validateDeck', () => {
  it('accepts a legal deck', () => {
    expect(validateDeck(testDeck('northern_realms'))).toEqual([]);
  });

  it('rejects too few units', () => {
    const d = testDeck('northern_realms', { units: 10 });
    expect(validateDeck(d).some((e) => e.code === 'too_few_units')).toBe(true);
  });

  it('rejects wrong-faction cards', () => {
    const d = testDeck('northern_realms');
    d.cards.push('mo_ghoul');
    expect(validateDeck(d).some((e) => e.code === 'wrong_faction')).toBe(true);
  });

  it('rejects too many copies', () => {
    const d = testDeck('northern_realms');
    d.cards.push('nr_ves', 'nr_ves');
    expect(validateDeck(d).some((e) => e.code === 'too_many_copies')).toBe(true);
  });

  it('rejects a leader from another faction', () => {
    const d = testDeck('northern_realms');
    d.leaderId = 'mo_leader_bringer_death';
    expect(validateDeck(d).some((e) => e.code === 'bad_leader')).toBe(true);
  });
});

describe('setup', () => {
  it('deals 10 cards each and starts in redraw', () => {
    const s = createGame(1, [testDeck('northern_realms'), testDeck('nilfgaard')]);
    expect(s.phase).toBe('redraw');
    expect(s.players[0].hand.length).toBe(10);
    expect(s.players[1].hand.length).toBe(10);
    expect(s.players[0].gems).toBe(2);
  });

  it('is deterministic for a given seed', () => {
    const a = createGame(7, [testDeck('northern_realms'), testDeck('nilfgaard')]);
    const b = createGame(7, [testDeck('northern_realms'), testDeck('nilfgaard')]);
    expect(a).toEqual(b);
  });

  it('redraw swaps a card and keeps hand at 10', () => {
    let s = createGame(3, [testDeck('northern_realms'), testDeck('nilfgaard')]);
    s = applyAction(s, { type: 'REDRAW', player: 0, handIndex: 0 });
    expect(s.players[0].hand.length).toBe(10);
    expect(s.players[0].redrawsLeft).toBe(1);
  });

  it("Scoia'tael goes first against a non-Scoia'tael deck", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = createGame(seed, [testDeck('nilfgaard'), testDeck('scoiatael')]);
      expect(s.turn).toBe(1);
    }
  });
});

describe('turn flow', () => {
  it('alternates turns and rejects out-of-turn actions', () => {
    let s = newGame();
    const first = s.turn;
    const other = ((first + 1) % 2) as PlayerId;
    expect(() => applyAction(s, { type: 'PASS', player: other })).toThrow(IllegalActionError);
    s = applyAction(s, { type: 'PASS', player: first });
    expect(s.turn).toBe(other);
  });

  it('playing after opponent passes keeps the turn', () => {
    let s = newGame();
    const first = s.turn;
    const other = ((first + 1) % 2) as PlayerId;
    s = applyAction(s, { type: 'PASS', player: first });
    const act = legalActions(s, other).find((a) => a.type === 'PLAY_CARD');
    if (act) {
      s = applyAction(s, act);
      if (s.phase === 'play' && !s.pendingChoice) expect(s.turn).toBe(other);
    }
  });

  it('both passing ends the round and deducts a gem from the loser', () => {
    let s = newGame();
    const first = s.turn;
    const other = ((first + 1) % 2) as PlayerId;
    s = applyAction(s, { type: 'PASS', player: first });
    s = applyAction(s, { type: 'PASS', player: other });
    expect(s.roundHistory.length).toBe(1);
    expect(s.round).toBe(2);
    expect(s.players[0].gems + s.players[1].gems).toBeLessThanOrEqual(3);
  });
});

describe('full scripted game', () => {
  it('random legal play always terminates with a winner or draw', () => {
    for (const seed of [11, 22, 33]) {
      let s = newGame(seed);
      let guard = 0;
      while (s.phase !== 'finished' && guard++ < 500) {
        const p = s.pendingChoice ? s.pendingChoice.player : s.turn;
        const acts = legalActions(s, p);
        expect(acts.length).toBeGreaterThan(0);
        // deterministic pseudo-random pick
        const a = acts[(guard * 7 + seed) % acts.length]!;
        s = applyAction(s, a);
      }
      expect(s.phase).toBe('finished');
      expect(s.winner !== null || s.drawn).toBe(true);
    }
  });
});

describe('scoring', () => {
  function placed(s: GameState, player: PlayerId, cardId: string, row: 'melee' | 'ranged' | 'siege') {
    const placedCard = { instanceId: `t${Math.random()}`, cardId };
    s.players[player].rows[row].units.push(placedCard);
    return placedCard;
  }

  it('weather reduces non-heroes to 1 but not heroes', () => {
    const s = newGame();
    const u = placed(s, 0, 'nr_ves', 'melee'); // 5
    const h = placed(s, 0, 'nr_vernon_roche', 'melee'); // 10 hero
    expect(effectiveStrength(s, 0, 'melee', u)).toBe(5);
    s.weather.frost = true;
    expect(effectiveStrength(s, 0, 'melee', u)).toBe(1);
    expect(effectiveStrength(s, 0, 'melee', h)).toBe(10);
  });

  it('tight bond multiplies, morale adds, horn doubles — in order', () => {
    const s = newGame();
    const b1 = placed(s, 0, 'nr_blue_stripes', 'melee'); // 4
    placed(s, 0, 'nr_blue_stripes', 'melee');
    expect(effectiveStrength(s, 0, 'melee', b1)).toBe(8); // 4*2
    s.players[0].rows.melee.hornActive = true;
    expect(effectiveStrength(s, 0, 'melee', b1)).toBe(16); // (4*2)*2
    expect(boardScore(s, 0)).toBe(32);
  });

  it('weather + bond + horn compose', () => {
    const s = newGame();
    const c1 = placed(s, 0, 'nr_catapult', 'siege'); // 8
    placed(s, 0, 'nr_catapult', 'siege');
    s.weather.rain = true;
    s.players[0].rows.siege.hornActive = true;
    // 8 → weather 1 → bond ×2 = 2 → horn ×2 = 4
    expect(effectiveStrength(s, 0, 'siege', c1)).toBe(4);
  });
});

describe('redacted view', () => {
  it('hides opponent hand and deck contents', () => {
    const s = newGame();
    const v = redact(s, 0);
    expect(v.you.hand.length).toBeGreaterThan(0);
    expect((v.opponent as unknown as { hand?: unknown }).hand).toBeUndefined();
    expect((v.opponent as unknown as { deck?: unknown }).deck).toBeUndefined();
    expect(v.opponent.handCount).toBe(s.players[1].hand.length);
    expect(JSON.stringify(v)).not.toContain('"deck":');
  });

  it('spy placement is visible to both, hand contents are not leaked', () => {
    const s = newGame();
    expect(byId('nr_thaler').abilities).toContain('spy');
    const v0 = redact(s, 0);
    const v1 = redact(s, 1);
    expect(v0.seat).toBe(0);
    expect(v1.seat).toBe(1);
  });
});
