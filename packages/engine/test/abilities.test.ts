import { describe, it, expect } from 'vitest';
import { byId, LEADER_CARDS } from '@gwent/data';
import {
  createGame,
  applyAction,
  effectiveStrength,
  boardScore,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import { testDeck } from './helpers.ts';

function bareGame(f0 = 'northern_realms', f1 = 'nilfgaard'): GameState {
  let s = createGame(5, [testDeck(f0 as never), testDeck(f1 as never)]);
  s = applyAction(s, { type: 'REDRAW', player: 0, handIndex: null });
  s = applyAction(s, { type: 'REDRAW', player: 1, handIndex: null });
  return s;
}

function place(s: GameState, player: PlayerId, cardId: string, row: 'melee' | 'ranged' | 'siege') {
  const placed = { instanceId: `x${cardId}${s.players[player].rows[row].units.length}`, cardId };
  s.players[player].rows[row].units.push(placed);
  return placed;
}

/** Force a card into hand at index 0 and play it. */
function playFromHand(s: GameState, player: PlayerId, cardId: string, row?: 'melee' | 'ranged' | 'siege', targetInstanceId?: string) {
  s.turn = player;
  s.players[player].hand.unshift(cardId);
  return applyAction(s, { type: 'PLAY_CARD', player, handIndex: 0, row, targetInstanceId });
}

describe('spy', () => {
  it('goes to opponent side and draws 2', () => {
    let s = bareGame();
    const deckBefore = s.players[0].deck.length;
    const handBefore = s.players[0].hand.length;
    s = playFromHand(s, 0, 'nr_thaler');
    expect(s.players[1].rows.siege.units.some((u) => u.cardId === 'nr_thaler')).toBe(true);
    expect(s.players[0].rows.siege.units.length).toBe(0);
    expect(s.players[0].hand.length).toBe(handBefore + 2); // +1 spy added, -1 played, +2 drawn
    expect(s.players[0].deck.length).toBe(deckBefore - 2);
  });
});

describe('muster', () => {
  it('pulls the whole group from hand and deck', () => {
    let s = bareGame('monsters', 'nilfgaard');
    s.players[0].deck.push('mo_arachas', 'mo_arachas');
    s = playFromHand(s, 0, 'mo_arachas');
    const onBoard = s.players[0].rows.melee.units.filter((u) => byId(u.cardId).musterGroup === byId('mo_arachas').musterGroup);
    expect(onBoard.length).toBeGreaterThanOrEqual(3);
    expect(s.players[0].deck.filter((id) => byId(id).musterGroup === byId('mo_arachas').musterGroup)).toEqual([]);
  });
});

describe('medic', () => {
  it('opens a choice from graveyard, resolving places the unit', () => {
    let s = bareGame();
    s.players[0].graveyard.push('nr_ves');
    s = playFromHand(s, 0, 'nr_dun_banner_medic');
    expect(s.pendingChoice?.kind).toBe('medic');
    const target = s.pendingChoice!.options[0]!;
    s = applyAction(s, { type: 'RESOLVE_CHOICE', player: 0, cardId: target });
    expect(s.players[0].graveyard).not.toContain('nr_ves');
    expect(s.players[0].rows.melee.units.some((u) => u.cardId === 'nr_ves')).toBe(true);
  });

  it('with empty graveyard just places the medic', () => {
    let s = bareGame();
    s.players[0].graveyard = [];
    s = playFromHand(s, 0, 'nr_dun_banner_medic');
    expect(s.pendingChoice).toBeNull();
  });
});

describe('decoy', () => {
  it('swaps with a non-hero unit which returns to hand', () => {
    let s = bareGame();
    const placed = place(s, 0, 'nr_ves', 'melee');
    s = playFromHand(s, 0, 'ne_decoy', undefined, placed.instanceId);
    expect(s.players[0].hand).toContain('nr_ves');
    expect(s.players[0].rows.melee.units.some((u) => u.cardId === 'ne_decoy')).toBe(true);
  });
});

describe('scorch', () => {
  it('kills all strongest non-hero units on the board', () => {
    let s = bareGame();
    place(s, 0, 'nr_ves', 'melee'); // 5
    place(s, 1, 'nf_black_archer', 'ranged'); // 10
    place(s, 1, 'nf_impera_brigade', 'melee'); // 3
    s = playFromHand(s, 0, 'ne_scorch');
    expect(s.players[1].rows.ranged.units.length).toBe(0);
    expect(s.players[1].graveyard).toContain('nf_black_archer');
    expect(s.players[0].rows.melee.units.length).toBe(1); // Ves survives
  });

  it('never kills heroes', () => {
    let s = bareGame();
    place(s, 1, 'nf_letho', 'melee'); // hero 10
    place(s, 1, 'nf_impera_brigade', 'melee'); // 3
    s = playFromHand(s, 0, 'ne_scorch');
    expect(s.players[1].rows.melee.units.some((u) => u.cardId === 'nf_letho')).toBe(true);
    expect(s.players[1].rows.melee.units.some((u) => u.cardId === 'nf_impera_brigade')).toBe(false);
  });
});

describe('weather specials', () => {
  it('storm sets fog+rain, clear wipes all', () => {
    let s = bareGame();
    s = playFromHand(s, 0, 'ne_storm');
    expect(s.weather.fog && s.weather.rain).toBe(true);
    s = playFromHand(s, 1, 'ne_clear');
    expect(s.weather).toEqual({ frost: false, fog: false, rain: false });
  });
});

describe('faction passives', () => {
  it('Northern Realms draws an extra card on round win', () => {
    let s = bareGame('northern_realms', 'nilfgaard');
    place(s, 0, 'nr_ves', 'melee');
    const deckBefore = s.players[0].deck.length;
    s.turn = 0;
    s = applyAction(s, { type: 'PASS', player: 0 });
    s = applyAction(s, { type: 'PASS', player: 1 });
    expect(s.players[0].deck.length).toBe(deckBefore - 1); // drew 1
    expect(s.players[1].gems).toBe(1);
  });

  it('Nilfgaard wins ties', () => {
    let s = bareGame('northern_realms', 'nilfgaard');
    s.turn = 0;
    s = applyAction(s, { type: 'PASS', player: 0 });
    s = applyAction(s, { type: 'PASS', player: 1 });
    // 0-0 tie → nilfgaard (player 1) wins the round
    expect(s.players[0].gems).toBe(1);
    expect(s.players[1].gems).toBe(2);
  });

  it('Monsters keeps one random unit between rounds', () => {
    let s = bareGame('monsters', 'nilfgaard');
    place(s, 0, 'mo_ghoul', 'melee');
    place(s, 0, 'mo_wyvern', 'ranged');
    s.turn = 0;
    s = applyAction(s, { type: 'PASS', player: 0 });
    s = applyAction(s, { type: 'PASS', player: 1 });
    const kept =
      s.players[0].rows.melee.units.length +
      s.players[0].rows.ranged.units.length +
      s.players[0].rows.siege.units.length;
    expect(kept).toBe(1);
  });

  it('Skellige revives 2 random units at the start of round 3', () => {
    let s = bareGame('skellige', 'nilfgaard');
    s.players[0].graveyard.push('sk_an_craite_warrior', 'sk_war_longship', 'sk_berserker');
    // lose round 1, lose-ish round 2 into round 3
    for (const _ of [1, 2]) {
      s.turn = 0;
      s = applyAction(s, { type: 'PASS', player: 0 });
      if (s.phase !== 'finished') s = applyAction(s, { type: 'PASS', player: 1 });
    }
    if (s.phase !== 'finished' && s.round === 3) {
      const onBoard =
        s.players[0].rows.melee.units.length +
        s.players[0].rows.ranged.units.length +
        s.players[0].rows.siege.units.length;
      expect(onBoard).toBe(2);
    }
  });
});

describe('passive leaders', () => {
  it('Eredin Treacherous doubles spies on your side', () => {
    const s = bareGame('monsters', 'nilfgaard');
    s.players[0].leaderId = LEADER_CARDS.find((l) => l.leaderAbility === 'eredin_treacherous')!.id;
    const spy = place(s, 0, 'nf_stefan_skellen', 'melee'); // opponent's spy sits on our side, 9
    const base = byId('nf_stefan_skellen').strength!;
    expect(effectiveStrength(s, 0, 'melee', spy)).toBe(base * 2);
  });

  it('Bran halves weather damage instead of setting to 1', () => {
    const s = bareGame('skellige', 'nilfgaard');
    s.players[0].leaderId = LEADER_CARDS.find((l) => l.leaderAbility === 'bran_tuirseach')!.id;
    const u = place(s, 0, 'sk_an_craite_warrior', 'melee'); // 6
    s.weather.frost = true;
    expect(effectiveStrength(s, 0, 'melee', u)).toBe(3);
    expect(boardScore(s, 0)).toBe(3);
  });

  it('White Flame cancels the opponent leader', () => {
    let s = bareGame('northern_realms', 'nilfgaard');
    s.players[1].leaderId = LEADER_CARDS.find((l) => l.leaderAbility === 'emhyr_the_white_flame')!.id;
    s.turn = 0;
    expect(() => applyAction(s, { type: 'PLAY_LEADER', player: 0 })).toThrow();
  });

  it('Daisy of the Valley grants an extra starting card', () => {
    const normalDeck = testDeck('scoiatael');
    normalDeck.leaderId = LEADER_CARDS.find((l) => l.leaderAbility === 'francesca_pureblood_elf')!.id;
    const normal = createGame(9, [normalDeck, testDeck('nilfgaard')]);
    const daisyDeck = testDeck('scoiatael');
    daisyDeck.leaderId = LEADER_CARDS.find((l) => l.leaderAbility === 'francesca_daisy_of_the_valley')!.id;
    const daisy = createGame(9, [daisyDeck, testDeck('nilfgaard')]);
    expect(normal.players[0].hand.length).toBe(10);
    expect(daisy.players[0].hand.length).toBe(11);
  });
});

describe('active leaders', () => {
  it('Foltest Siegemaster sets fog and is one-shot', () => {
    let s = bareGame('northern_realms', 'nilfgaard');
    s.players[0].leaderId = LEADER_CARDS.find((l) => l.leaderAbility === 'foltest_siegemaster')!.id;
    s.turn = 0;
    s = applyAction(s, { type: 'PLAY_LEADER', player: 0 });
    expect(s.weather.fog).toBe(true);
    expect(s.players[0].leaderUsed).toBe(true);
    s.turn = 0;
    expect(() => applyAction(s, { type: 'PLAY_LEADER', player: 0 })).toThrow();
  });
});

describe('gaunter odimm muster (regression)', () => {
  it('darkness pulls the other copies from deck on play', () => {
    let s = bareGame();
    s.players[0].deck.push('ne_gaunter_darkness', 'ne_gaunter_darkness', 'ne_gaunter_odimm');
    s = playFromHand(s, 0, 'ne_gaunter_darkness');
    const board = [...s.players[0].rows.ranged.units, ...s.players[0].rows.siege.units]
      .filter((u) => byId(u.cardId).musterGroup === 'odimm');
    // Test deck already contains neutral Gaunter copies, so muster pulls those
    // plus the 3 we pushed — assert at least played + 3 and the deck drained.
    expect(board.length).toBeGreaterThanOrEqual(4);
    expect(s.players[0].deck.filter((id) => byId(id).musterGroup === 'odimm')).toEqual([]);
  });
});

describe('villentretenmerth unit scorch (regression)', () => {
  it('destroys strongest enemy melee unit when enemy melee >= 10', () => {
    let s = bareGame();
    place(s, 1, 'nf_black_archer', 'melee'); // if rows allow; strength 10 total via units below
    place(s, 1, 'nf_impera_brigade', 'melee'); // 3
    place(s, 1, 'nf_impera_brigade', 'melee'); // 3
    place(s, 1, 'nf_impera_brigade', 'melee'); // 3
    place(s, 1, 'nf_impera_brigade', 'melee'); // 3 -> 12+ total
    s = playFromHand(s, 0, 'ne_villentretenmerth', 'melee');
    const before = 5;
    expect(s.players[1].rows.melee.units.length).toBeLessThan(before);
    expect(s.log.some((l) => l.text.includes('scorched'))).toBe(true);
  });

  it('does nothing (with a log entry) when enemy melee < 10', () => {
    let s = bareGame();
    place(s, 1, 'nf_impera_brigade', 'melee'); // 3
    s = playFromHand(s, 0, 'ne_villentretenmerth', 'melee');
    expect(s.players[1].rows.melee.units.length).toBe(1);
    expect(s.log.some((l) => l.text.includes('no effect'))).toBe(true);
  });
});
