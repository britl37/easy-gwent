import type { CardDef } from '../types.ts';
import { unit } from './helpers.ts';

const F = 'monsters' as const;

export const MONSTERS_CARDS: CardDef[] = [
  // ─ Heroes ─
  unit(F, 'mo_leshen', 'Leshen', 10, ['ranged'], { hero: true }),
  unit(F, 'mo_kayran', 'Kayran', 8, ['melee', 'ranged'], { hero: true, abilities: ['morale_boost'] }),
  unit(F, 'mo_imlerith', 'Imlerith', 10, ['melee'], { hero: true }),
  unit(F, 'mo_draug', 'Draug', 10, ['melee'], { hero: true }),
  // ─ Muster packs ─
  unit(F, 'mo_arachas_behemoth', 'Arachas Behemoth', 6, ['siege'], { abilities: ['muster'], musterGroup: 'arachas' }),
  unit(F, 'mo_arachas', 'Arachas', 4, ['melee'], { abilities: ['muster'], musterGroup: 'arachas', count: 3 }),
  unit(F, 'mo_crone_brewess', 'Crone: Brewess', 6, ['melee'], { abilities: ['muster'], musterGroup: 'crone' }),
  unit(F, 'mo_crone_weavess', 'Crone: Weavess', 6, ['melee'], { abilities: ['muster'], musterGroup: 'crone' }),
  unit(F, 'mo_crone_whispess', 'Crone: Whispess', 6, ['melee'], { abilities: ['muster'], musterGroup: 'crone' }),
  unit(F, 'mo_vampire_katakan', 'Vampire: Katakan', 5, ['melee'], { abilities: ['muster'], musterGroup: 'vampire' }),
  unit(F, 'mo_vampire_ekimmara', 'Vampire: Ekimmara', 4, ['melee'], { abilities: ['muster'], musterGroup: 'vampire' }),
  unit(F, 'mo_vampire_fleder', 'Vampire: Fleder', 4, ['melee'], { abilities: ['muster'], musterGroup: 'vampire' }),
  unit(F, 'mo_vampire_garkain', 'Vampire: Garkain', 4, ['melee'], { abilities: ['muster'], musterGroup: 'vampire' }),
  unit(F, 'mo_vampire_bruxa', 'Vampire: Bruxa', 4, ['melee'], { abilities: ['muster'], musterGroup: 'vampire' }),
  unit(F, 'mo_ghoul', 'Ghoul', 1, ['melee'], { abilities: ['muster'], musterGroup: 'ghoul', count: 3 }),
  unit(F, 'mo_nekker', 'Nekker', 2, ['melee'], { abilities: ['muster'], musterGroup: 'nekker', count: 3 }),
  // ─ Units ─
  unit(F, 'mo_toad', 'Toad', 7, ['melee', 'ranged']),
  unit(F, 'mo_frightener', 'Frightener', 5, ['melee']),
  unit(F, 'mo_werewolf', 'Werewolf', 5, ['melee']),
  unit(F, 'mo_fiend', 'Fiend', 6, ['melee']),
  unit(F, 'mo_plague_maiden', 'Plague Maiden', 5, ['melee']),
  unit(F, 'mo_griffin', 'Griffin', 5, ['melee']),
  unit(F, 'mo_forktail', 'Forktail', 5, ['melee']),
  unit(F, 'mo_botchling', 'Botchling', 4, ['melee']),
  unit(F, 'mo_rotfiend', 'Rotfiend', 3, ['melee']),
  unit(F, 'mo_foglet', 'Foglet', 2, ['melee']),
  unit(F, 'mo_wyvern', 'Wyvern', 2, ['ranged']),
  unit(F, 'mo_harpy', 'Harpy', 2, ['ranged']),
  unit(F, 'mo_celaeno_harpy', 'Celaeno Harpy', 2, ['melee', 'ranged']),
  unit(F, 'mo_cockatrice', 'Cockatrice', 2, ['ranged']),
  unit(F, 'mo_basilisk', 'Basilisk', 2, ['ranged']),
  unit(F, 'mo_endrega', 'Endrega', 2, ['ranged']),
  unit(F, 'mo_grave_hag', 'Grave Hag', 5, ['ranged']),
  unit(F, 'mo_gargoyle', 'Gargoyle', 2, ['ranged']),
  unit(F, 'mo_earth_elemental', 'Earth Elemental', 6, ['siege']),
  unit(F, 'mo_fire_elemental', 'Fire Elemental', 6, ['siege']),
  unit(F, 'mo_ice_giant', 'Ice Giant', 5, ['siege']),
];
