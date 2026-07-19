import { ALL_CARDS, LEADER_CARDS, type CardDef, type PlayableFaction } from '@gwent/data';
import { validateDeck, type DeckList } from './setup.ts';

/**
 * Rule-driven starter decks.
 *
 * Built from the same rules the validator enforces (MIN_UNITS, MAX_SPECIALS,
 * per-card copy limits, faction/neutral pool) rather than a hand-maintained
 * list, so they can never drift out of legality when card data changes.
 * Summon-only trigger cards (count < 1) are excluded automatically.
 */

const UNIT_TARGET = 25; // unit copies; comfortably above MIN_UNITS (22)

/** Deterministic draft score: raw strength plus tempo/value bonuses. */
function unitScore(c: CardDef, faction: PlayableFaction): number {
  let s = c.strength ?? 0;
  if (c.abilities.includes('spy')) s += 8; // card advantage
  if (c.abilities.includes('medic')) s += 6; // graveyard recursion
  if (c.abilities.includes('muster')) s += 2; // thins the deck
  if (c.abilities.includes('tight_bond')) s += 2;
  if (c.abilities.includes('morale_boost')) s += 1;
  if (c.faction === faction) s += 0.5; // prefer faction identity on ties
  return s;
}

/** A couple of universally useful specials, well under MAX_SPECIALS. */
const STARTER_SPECIALS: Array<[id: string, copies: number]> = [
  ['ne_decoy', 2],
  ['ne_horn', 2],
  ['ne_clear', 1],
];

/** Build a legal, faction-flavored starter deck. Throws if the result would be invalid. */
export function starterDeck(faction: PlayableFaction): DeckList {
  const leader = LEADER_CARDS.find((l) => l.faction === faction);
  if (!leader) throw new Error(`No leader defined for faction ${faction}`);

  const pool = ALL_CARDS.filter(
    (c) =>
      c.type === 'unit' &&
      c.count > 0 && // count < 1 = summon-only trigger card
      (c.faction === faction || c.faction === 'neutral'),
  ).sort((a, b) => unitScore(b, faction) - unitScore(a, faction) || a.id.localeCompare(b.id));

  const cards: string[] = [];
  for (const c of pool) {
    for (let i = 0; i < c.count && cards.length < UNIT_TARGET; i++) cards.push(c.id);
    if (cards.length >= UNIT_TARGET) break;
  }

  for (const [id, copies] of STARTER_SPECIALS) {
    if (ALL_CARDS.some((c) => c.id === id && c.count >= copies)) {
      for (let i = 0; i < copies; i++) cards.push(id);
    }
  }

  const deck: DeckList = { faction, leaderId: leader.id, cards };
  const errors = validateDeck(deck);
  if (errors.length > 0) {
    throw new Error(`starterDeck(${faction}) is invalid: ${errors.map((e) => e.message).join('; ')}`);
  }
  return deck;
}
