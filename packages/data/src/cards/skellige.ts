import type { CardDef } from '../types.ts';
import { unit, special } from './helpers.ts';

const F = 'skellige' as const;

export const SKELLIGE_CARDS: CardDef[] = [
  // ─ Heroes ─
  unit(F, 'sk_cerys', 'Cerys', 10, ['melee'], { hero: true, abilities: ['muster'], musterGroup: 'shield_maiden' }),
  unit(F, 'sk_hjalmar', 'Hjalmar', 10, ['ranged'], { hero: true }),
  unit(F, 'sk_ermion', 'Ermion', 8, ['ranged'], { hero: true, abilities: ['mardroeme'] }),
  unit(F, 'sk_hemdall', 'Hemdall', 11, ['melee'], { hero: true, count: 0 }),
  // ─ Units ─
  unit(F, 'sk_kambi', 'Kambi', 0, ['melee'], { transformsInto: 'sk_hemdall', abilities: ['summon_avenger'] }),
  unit(F, 'sk_olaf', 'Olaf', 12, ['melee', 'ranged'], { abilities: ['morale_boost'] }),
  unit(F, 'sk_madman_lugos', 'Madman Lugos', 6, ['melee']),
  unit(F, 'sk_blueboy_lugos', 'Blueboy Lugos', 6, ['siege']),
  unit(F, 'sk_svanrige', 'Svanrige', 6, ['melee']),
  unit(F, 'sk_donar', 'Donar an Hindar', 4, ['siege']),
  unit(F, 'sk_holger', 'Holger Blackhand', 8, ['siege']),
  unit(F, 'sk_udalryk', 'Udalryk', 4, ['melee']),
  unit(F, 'sk_birna_bran', 'Birna Bran', 2, ['melee'], { abilities: ['medic'] }),
  unit(F, 'sk_clan_dimun_pirate', 'Clan Dimun Pirate', 6, ['ranged'], { abilities: ['scorch'] }),
  unit(F, 'sk_shield_maiden', 'Clan Drummond Shield Maiden', 4, ['melee'], {
    bondGroup: 'shield_maiden', abilities: ['tight_bond'], musterGroup: 'shield_maiden', count: 3,
  }),
  unit(F, 'sk_an_craite_warrior', 'Clan an Craite Warrior', 6, ['melee'], { bondGroup: 'an_craite', abilities: ['tight_bond'], count: 3 }),
  unit(F, 'sk_brokvar_archer', 'Clan Brokvar Archer', 6, ['ranged'], { count: 3 }),
  unit(F, 'sk_tordarroch_armorsmith', 'Clan Tordarroch Armorsmith', 4, ['siege']),
  unit(F, 'sk_war_longship', 'War Longship', 6, ['siege'], { bondGroup: 'longship', abilities: ['tight_bond'], count: 3 }),
  unit(F, 'sk_light_longship', 'Light Longship', 4, ['ranged'], { abilities: ['muster'], musterGroup: 'light_longship', count: 3 }),
  unit(F, 'sk_draig_bon_dhu', 'Draig Bon-Dhu', 2, ['siege'], { abilities: ['horn'] }),
  unit(F, 'sk_young_berserker', 'Young Berserker', 2, ['ranged'], {
    abilities: ['berserker'], transformsInto: 'sk_young_vildkaarl', count: 3,
  }),
  unit(F, 'sk_young_vildkaarl', 'Young Vildkaarl', 8, ['ranged'], { bondGroup: 'young_vildkaarl', abilities: ['tight_bond'], count: 0 }),
  unit(F, 'sk_berserker', 'Berserker', 4, ['melee'], { abilities: ['berserker'], transformsInto: 'sk_vildkaarl' }),
  unit(F, 'sk_vildkaarl', 'Vildkaarl', 14, ['melee'], { abilities: ['morale_boost'], count: 0 }),
  // ─ Specials ─
  special(F, 'sk_mardroeme', 'Mardroeme', 'mardroeme', 3),
];
