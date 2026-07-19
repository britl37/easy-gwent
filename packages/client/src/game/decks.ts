import { byId, type PlayableFaction } from '@gwent/data';
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

/**
 * Drop cards that no longer exist and clamp copies to the current per-card
 * max, so decks saved under older card data can't wedge the editor.
 */
export function sanitizeDeck(d: DeckList): DeckList {
  const counts = new Map<string, number>();
  const cards: string[] = [];
  for (const id of d.cards) {
    let def;
    try {
      def = byId(id);
    } catch {
      continue; // card removed from the game
    }
    if (def.type === 'leader' || def.count < 1) continue;
    const n = counts.get(id) ?? 0;
    if (n >= def.count) continue; // copies above the current max
    counts.set(id, n + 1);
    cards.push(id);
  }
  return { ...d, cards };
}

/** Raw saved deck (possibly invalid, for editing), or the starter deck. */
export function loadDeckDraft(faction: PlayableFaction): DeckList {
  const d = readAll()[faction];
  if (d && d.faction === faction && Array.isArray(d.cards) && typeof d.leaderId === 'string') {
    return sanitizeDeck(d);
  }
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
