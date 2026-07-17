import type { CardDef } from '../types.ts';
import { unit } from './helpers.ts';

const F = 'northern_realms' as const;

export const NORTHERN_REALMS_CARDS: CardDef[] = [
  // ─ Heroes ─
  unit(F, 'nr_vernon_roche', 'Vernon Roche', 10, ['melee'], { hero: true }),
  unit(F, 'nr_john_natalis', 'John Natalis', 10, ['melee'], { hero: true }),
  unit(F, 'nr_esterad_thyssen', 'Esterad Thyssen', 10, ['melee'], { hero: true }),
  unit(F, 'nr_philippa_eilhart', 'Philippa Eilhart', 10, ['ranged'], { hero: true }),
  // ─ Spies ─
  unit(F, 'nr_thaler', 'Thaler', 1, ['siege'], { abilities: ['spy'] }),
  unit(F, 'nr_dijkstra', 'Sigismund Dijkstra', 4, ['melee'], { abilities: ['spy'] }),
  unit(F, 'nr_stennis', 'Prince Stennis', 5, ['melee'], { abilities: ['spy'] }),
  // ─ Units ─
  unit(F, 'nr_ves', 'Ves', 5, ['melee']),
  unit(F, 'nr_siegfried', 'Siegfried of Denesle', 5, ['melee']),
  unit(F, 'nr_yarpen', 'Yarpen Zigrin', 2, ['melee']),
  unit(F, 'nr_sile', 'Síle de Tansarville', 5, ['ranged']),
  unit(F, 'nr_keira', 'Keira Metz', 5, ['ranged']),
  unit(F, 'nr_sabrina', 'Sabrina Glevissig', 4, ['ranged']),
  unit(F, 'nr_sheldon', 'Sheldon Skaggs', 4, ['ranged']),
  unit(F, 'nr_dethmold', 'Dethmold', 6, ['ranged']),
  unit(F, 'nr_blue_stripes', 'Blue Stripes Commando', 4, ['melee'], { bondGroup: 'blue_stripes', abilities: ['tight_bond'], count: 3 }),
  unit(F, 'nr_crinfrid_reavers', 'Crinfrid Reavers Dragon Hunter', 5, ['ranged'], { bondGroup: 'crinfrid', abilities: ['tight_bond'], count: 3 }),
  unit(F, 'nr_poor_infantry', "Poor F'ing Infantry", 1, ['melee'], { bondGroup: 'poor_infantry', abilities: ['tight_bond'], count: 3 }),
  unit(F, 'nr_redanian_foot', 'Redanian Foot Soldier', 1, ['melee'], { count: 2 }),
  unit(F, 'nr_kaedweni_siege_expert', 'Kaedweni Siege Expert', 1, ['siege'], { abilities: ['morale_boost'], count: 3 }),
  unit(F, 'nr_dun_banner_medic', 'Dun Banner Medic', 5, ['siege'], { abilities: ['medic'] }),
  unit(F, 'nr_siege_tower', 'Siege Tower', 6, ['siege']),
  unit(F, 'nr_ballista', 'Ballista', 6, ['siege']),
  unit(F, 'nr_trebuchet', 'Trebuchet', 6, ['siege'], { count: 2 }),
  unit(F, 'nr_catapult', 'Catapult', 8, ['siege'], { bondGroup: 'catapult', abilities: ['tight_bond'], count: 2 }),
];
