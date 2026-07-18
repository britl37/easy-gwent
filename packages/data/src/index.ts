import type { CardDef } from './types.ts';
import { NEUTRAL_CARDS } from './cards/neutral.ts';
import { NORTHERN_REALMS_CARDS } from './cards/northern-realms.ts';
import { NILFGAARD_CARDS } from './cards/nilfgaard.ts';
import { SCOIATAEL_CARDS } from './cards/scoiatael.ts';
import { MONSTERS_CARDS } from './cards/monsters.ts';
import { SKELLIGE_CARDS } from './cards/skellige.ts';
import { LEADER_CARDS } from './cards/leaders.ts';

export * from './types.ts';
export * from './ability-text.ts';
export {
  NEUTRAL_CARDS,
  NORTHERN_REALMS_CARDS,
  NILFGAARD_CARDS,
  SCOIATAEL_CARDS,
  MONSTERS_CARDS,
  SKELLIGE_CARDS,
  LEADER_CARDS,
};

export const ALL_CARDS: CardDef[] = [
  ...NEUTRAL_CARDS,
  ...NORTHERN_REALMS_CARDS,
  ...NILFGAARD_CARDS,
  ...SCOIATAEL_CARDS,
  ...MONSTERS_CARDS,
  ...SKELLIGE_CARDS,
  ...LEADER_CARDS,
];

const map = new Map<string, CardDef>();
for (const c of ALL_CARDS) {
  if (map.has(c.id)) throw new Error(`Duplicate card id: ${c.id}`);
  map.set(c.id, c);
}

export const byId = (id: string): CardDef => {
  const c = map.get(id);
  if (!c) throw new Error(`Unknown card id: ${id}`);
  return c;
};

export const hasCard = (id: string): boolean => map.has(id);
