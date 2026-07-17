import type { PlayableFaction } from '@gwent/data';
import { validateDeck, type DeckList } from '@gwent/engine';
import { starterDeck } from './localGame.ts';

const KEY = 'gwent.decks.v1';

type Saved = Partial<Record<PlayableFaction, DeckList>>;

function readAll(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Saved;
  } catch {
    return {};
  }
}

/** Saved deck for a faction, or the starter deck if none/invalid. */
export function loadDeck(faction: PlayableFaction): DeckList {
  const d = readAll()[faction];
  if (d && d.faction === faction && validateDeck(d).length === 0) return d;
  return starterDeck(faction);
}

/** Raw saved deck (possibly invalid, for editing), or the starter deck. */
export function loadDeckDraft(faction: PlayableFaction): DeckList {
  const d = readAll()[faction];
  if (d && d.faction === faction && Array.isArray(d.cards) && typeof d.leaderId === 'string') return d;
  return starterDeck(faction);
}

export function saveDeck(deck: DeckList): void {
  const all = readAll();
  all[deck.faction] = deck;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full/unavailable — ignore */
  }
}
