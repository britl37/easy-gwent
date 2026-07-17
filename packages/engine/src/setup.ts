import { byId, type PlayableFaction } from '@gwent/data';
import type { GameState, PlayerState } from './state.ts';
import { emptyRows } from './state.ts';
import { createRng, shuffle, next } from './rng.ts';

export interface DeckList {
  faction: PlayableFaction;
  leaderId: string;
  /** Card ids incl. duplicates, e.g. ['nr_catapult','nr_catapult',...] */
  cards: string[];
}

export interface DeckError {
  code:
    | 'unknown_card'
    | 'wrong_faction'
    | 'too_few_units'
    | 'too_many_specials'
    | 'too_many_copies'
    | 'too_many_heroes'
    | 'bad_leader';
  message: string;
}

export const MIN_UNITS = 22;
export const MAX_SPECIALS = 10;
export const MAX_HEROES = 10;

export function validateDeck(deck: DeckList): DeckError[] {
  const errors: DeckError[] = [];

  // Leader
  let leaderOk = false;
  try {
    const l = byId(deck.leaderId);
    leaderOk = l.type === 'leader' && l.faction === deck.faction;
  } catch {
    /* unknown */
  }
  if (!leaderOk) errors.push({ code: 'bad_leader', message: `Invalid leader for ${deck.faction}` });

  const counts = new Map<string, number>();
  let units = 0;
  let specials = 0;
  let heroes = 0;

  for (const id of deck.cards) {
    let def;
    try {
      def = byId(id);
    } catch {
      errors.push({ code: 'unknown_card', message: `Unknown card: ${id}` });
      continue;
    }
    if (def.faction !== 'neutral' && def.faction !== deck.faction) {
      errors.push({ code: 'wrong_faction', message: `${def.name} is not playable in a ${deck.faction} deck` });
    }
    if (def.type === 'leader') {
      errors.push({ code: 'bad_leader', message: `${def.name} is a leader, not a deck card` });
      continue;
    }
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (counts.get(id)! > def.count) {
      errors.push({ code: 'too_many_copies', message: `Too many copies of ${def.name} (max ${def.count})` });
      counts.set(id, def.count); // report once per overflow step is fine; keep simple
    }
    if (def.type === 'unit') {
      units++;
      if (def.hero) heroes++;
    } else {
      specials++;
    }
  }

  if (units < MIN_UNITS) {
    errors.push({ code: 'too_few_units', message: `Deck needs at least ${MIN_UNITS} unit cards (has ${units})` });
  }
  if (specials > MAX_SPECIALS) {
    errors.push({ code: 'too_many_specials', message: `At most ${MAX_SPECIALS} special cards allowed (has ${specials})` });
  }
  if (heroes > MAX_HEROES) {
    errors.push({ code: 'too_many_heroes', message: `At most ${MAX_HEROES} hero cards allowed (has ${heroes})` });
  }
  return errors;
}

const HAND_SIZE = 10;
const REDRAWS = 2;

function initPlayer(deck: DeckList): PlayerState {
  return {
    faction: deck.faction,
    leaderId: deck.leaderId,
    leaderUsed: false,
    deck: [...deck.cards],
    hand: [],
    graveyard: [],
    rows: emptyRows(),
    passed: false,
    gems: 2,
    redrawsLeft: REDRAWS,
  };
}

/**
 * Create a new game. Throws if either deck is invalid.
 * Coin flip decides who goes first; a Scoia'tael player chooses/wins the flip
 * (simplified: Scoia'tael always goes first vs a non-Scoia'tael opponent).
 */
export function createGame(seed: number, decks: [DeckList, DeckList]): GameState {
  for (const d of decks) {
    const errs = validateDeck(d);
    if (errs.length) throw new Error(`Invalid deck: ${errs.map((e) => e.message).join('; ')}`);
  }

  const rng = createRng(seed);
  const players = decks.map((d) => initPlayer(d)) as [PlayerState, PlayerState];

  for (const p of players) {
    shuffle(rng, p.deck);
    p.hand = p.deck.splice(p.deck.length - HAND_SIZE, HAND_SIZE);
  }

  // Francesca "Daisy of the Valley" passive: draw an extra card
  players.forEach((p) => {
    if (byId(p.leaderId).leaderAbility === 'francesca_daisy_of_the_valley' && p.deck.length) {
      p.hand.push(p.deck.pop()!);
    }
  });

  // First player: Scoia'tael perk, else coin flip
  const st0 = players[0].faction === 'scoiatael';
  const st1 = players[1].faction === 'scoiatael';
  let first: 0 | 1;
  if (st0 && !st1) first = 0;
  else if (st1 && !st0) first = 1;
  else first = next(rng) < 0.5 ? 0 : 1;

  return {
    phase: 'redraw',
    round: 1,
    turn: first,
    players,
    weather: { frost: false, fog: false, rain: false },
    pendingChoice: null,
    roundHistory: [],
    winner: null,
    drawn: false,
    rngState: rng.state,
    nextInstance: 1,
    log: [{ turn: 0, text: `Coin flip: player ${first + 1} goes first` }],
    turnCount: 0,
  };
}
