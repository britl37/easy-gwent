import type { CardDef } from '../types.ts';
import { unit } from './helpers.ts';

const F = 'scoiatael' as const;

export const SCOIATAEL_CARDS: CardDef[] = [
  // ─ Heroes ─
  unit(F, 'sc_iorveth', 'Iorveth', 10, ['ranged'], { hero: true }),
  unit(F, 'sc_eithne', 'Eithné', 10, ['ranged'], { hero: true }),
  unit(F, 'sc_saesenthessis', 'Saesenthessis', 10, ['ranged'], { hero: true }),
  unit(F, 'sc_isengrim', 'Isengrim Faoiltiarna', 10, ['melee'], { hero: true, abilities: ['morale_boost'] }),
  // ─ Units ─
  unit(F, 'sc_milva', 'Milva', 10, ['ranged'], { abilities: ['morale_boost'] }),
  unit(F, 'sc_filavandrel', 'Filavandrel aén Fidháil', 6, ['melee', 'ranged']),
  unit(F, 'sc_ida_emean', 'Ida Emean aep Sivney', 6, ['ranged']),
  unit(F, 'sc_toruviel', 'Toruviel', 2, ['ranged']),
  unit(F, 'sc_dennis_cranmer', 'Dennis Cranmer', 6, ['melee']),
  unit(F, 'sc_yaevinn', 'Yaevinn', 6, ['melee', 'ranged']),
  unit(F, 'sc_ciaran', 'Ciaran aep Easnillien', 3, ['melee', 'ranged']),
  unit(F, 'sc_barclay_els', 'Barclay Els', 6, ['melee', 'ranged']),
  unit(F, 'sc_riordain', 'Riordain', 1, ['ranged']),
  unit(F, 'sc_schirru', 'Schirrú', 8, ['siege'], { abilities: ['scorch'] }),
  unit(F, 'sc_dol_blathanna_scout', 'Dol Blathanna Scout', 6, ['melee', 'ranged'], { count: 3 }),
  unit(F, 'sc_dol_blathanna_archer', 'Dol Blathanna Archer', 6, ['ranged']),
  unit(F, 'sc_elven_skirmisher', 'Elven Skirmisher', 2, ['ranged'], { count: 3 }),
  unit(F, 'sc_havekar_healer', 'Havekar Healer', 0, ['ranged'], { abilities: ['medic'], count: 3 }),
  unit(F, 'sc_havekar_smuggler', 'Havekar Smuggler', 5, ['melee'], { abilities: ['muster'], musterGroup: 'havekar_smuggler', count: 3 }),
  unit(F, 'sc_mahakaman_defender', 'Mahakaman Defender', 5, ['melee'], { abilities: ['muster'], musterGroup: 'mahakaman_defender', count: 5 }),
  unit(F, 'sc_vrihedd_brigade_veteran', 'Vrihedd Brigade Veteran', 5, ['melee', 'ranged'], { count: 2 }),
  unit(F, 'sc_vrihedd_brigade_recruit', 'Vrihedd Brigade Recruit', 4, ['melee']),
];
