import { ALL_CARDS, LEADER_CARDS, type PlayableFaction } from '@gwent/data';
import type { DeckList } from '@gwent/engine';

/** Build a legal deck for a faction: first leader + up to `n` unit copies (no specials by default). */
export function testDeck(faction: PlayableFaction, opts: { specials?: string[]; units?: number } = {}): DeckList {
  const leader = LEADER_CARDS.find((l) => l.faction === faction)!;
  const cards: string[] = [];
  for (const c of ALL_CARDS) {
    if (c.type !== 'unit') continue;
    if (c.faction !== faction && c.faction !== 'neutral') continue;
    for (let i = 0; i < c.count && cards.length < (opts.units ?? 25); i++) cards.push(c.id);
    if (cards.length >= (opts.units ?? 25)) break;
  }
  cards.push(...(opts.specials ?? []));
  return { faction, leaderId: leader.id, cards };
}
